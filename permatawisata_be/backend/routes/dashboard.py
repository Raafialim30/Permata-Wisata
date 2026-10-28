from typing import Any
from flask import Blueprint, jsonify, request
from db import get_db_connection
from security import require_admin


dashboard_bp = Blueprint('dashboard_bp', __name__)


# ========================================================
# HELPER KONVERSI DATA DAN PENUTUPAN KONEKSI
# ========================================================
def _close(cursor=None, conn=None):
    try:
        if cursor:
            cursor.close()
    except Exception:
        pass

    try:
        if conn:
            conn.close()
    except Exception:
        pass


def _to_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _to_int(val: Any, default: int = 0) -> int:
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


# ========================================================
# ADMIN DASHBOARD
# ========================================================
@dashboard_bp.route('/api/admin/dashboard-data', methods=['GET'])
@require_admin
def get_dashboard_data():
    conn = cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. TOTAL BOOKING
        cursor.execute(
            """
            SELECT COUNT(*) AS total_bookings
            FROM bookings
            """
        )
        res1 = cursor.fetchone()
        raw_b = res1.get('total_bookings') if isinstance(res1, dict) else 0
        total_bookings = _to_int(raw_b)

        # 2. TOTAL REVENUE
        cursor.execute(
            """
            SELECT
                COALESCE(SUM(total_price), 0) AS total_revenue
            FROM bookings
            WHERE status = 'Lunas'
            """
        )
        res2 = cursor.fetchone()
        raw_r = res2.get('total_revenue') if isinstance(res2, dict) else 0
        revenue_float = _to_float(raw_r)

        # 3. TOTAL VILLA
        cursor.execute(
            """
            SELECT COUNT(*) AS total_villas
            FROM villas
            """
        )
        res3 = cursor.fetchone()
        raw_v = res3.get('total_villas') if isinstance(res3, dict) else 0
        total_villas = _to_int(raw_v)

        # 4. PENDING PAYMENTS
        cursor.execute(
            """
            SELECT COUNT(*) AS pending_payments
            FROM bookings
            WHERE status IN (
                'Menunggu Pembayaran',
                'Menunggu Verifikasi'
            )
            """
        )
        res4 = cursor.fetchone()
        raw_p = res4.get('pending_payments') if isinstance(res4, dict) else 0
        pending_payments = _to_int(raw_p)

        # 5. BOOKING TERBARU
        cursor.execute(
            """
            SELECT
                b.id,
                b.full_name,
                COALESCE(v.name, b.villa_name) AS villa_name,
                b.villa_id,
                b.check_in,
                b.check_out,
                b.total_price,
                b.status
            FROM bookings b
            LEFT JOIN villas v
                ON b.villa_id = v.id
            ORDER BY b.created_at DESC
            LIMIT 5
            """
        )
        latest_bookings = cursor.fetchall() or []

        # 6. KONVERSI TANGGAL
        for booking in latest_bookings:
            if isinstance(booking, dict):
                c_in = booking.get('check_in')
                c_out = booking.get('check_out')

                if c_in and hasattr(c_in, 'strftime'):
                    booking['check_in'] = c_in.strftime('%Y-%m-%d')
                elif c_in:
                    booking['check_in'] = str(c_in)[:10]

                if c_out and hasattr(c_out, 'strftime'):
                    booking['check_out'] = c_out.strftime('%Y-%m-%d')
                elif c_out:
                    booking['check_out'] = str(c_out)[:10]

        # 7. FORMAT TOTAL REVENUE
        total_revenue_formatted = f"Rp {revenue_float:,.0f}".replace(",", ".")

        # 8. RESPONSE
        return jsonify({
            "status": "success",
            "stats": {
                "total_bookings": total_bookings,
                "total_revenue": total_revenue_formatted,
                "total_villas": total_villas,
                "pending_payments": pending_payments
            },
            "bookings": latest_bookings
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)


# ========================================================
# SETTINGS COMMISSION ENDPOINTS
# ========================================================
@dashboard_bp.route('/api/settings/commission', methods=['GET'])
def get_commission():
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT setting_value FROM settings WHERE setting_key = 'commission_rate' LIMIT 1")
        row = cursor.fetchone()

        rate = 10.0
        if isinstance(row, dict) and row.get('setting_value') is not None:
            rate = _to_float(row.get('setting_value'), 10.0)

        return jsonify({"status": "success", "commission_rate": rate}), 200
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500
    finally:
        _close(cursor, conn)


@dashboard_bp.route('/api/admin/settings/commission', methods=['PUT'])
@require_admin
def update_commission():
    conn = cursor = None
    try:
        data = request.get_json(silent=True) or {}
        new_rate = str(data.get('commission_rate', '10'))
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE settings SET setting_value = %s WHERE setting_key = 'commission_rate'",
            (new_rate,)
        )
        conn.commit()
        return jsonify({"status": "success", "message": "Komisi berhasil diperbarui"}), 200
    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return jsonify({"status": "error", "error": str(e)}), 500
    finally:
        _close(cursor, conn)