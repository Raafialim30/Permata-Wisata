from typing import Any, Dict, List, Optional
from flask import Blueprint, request, jsonify
from db import get_db_connection
from security import get_user_id_from_request


payment_bp = Blueprint('payment_bp', __name__)


# =========================================================
# HELPER: Tutup cursor dan koneksi database
# =========================================================
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


def _admin_id_from_token():
    return get_user_id_from_request("admin")


def _validate_admin(cursor, admin_id: Any) -> bool:
    cursor.execute(
        "SELECT id FROM users WHERE id=%s AND role='admin' LIMIT 1",
        (admin_id,),
    )
    return cursor.fetchone() is not None


# =========================================================
# STATUS BOOKING YANG DIGUNAKAN SISTEM
# =========================================================
STATUS_MENUNGGU_PEMBAYARAN = "Menunggu Pembayaran"
STATUS_MENUNGGU_VERIFIKASI = "Menunggu Verifikasi"
STATUS_LUNAS = "Lunas"
STATUS_BATAL = "Batal"


ALLOWED_ADMIN_STATUSES = {
    STATUS_MENUNGGU_PEMBAYARAN,
    STATUS_MENUNGGU_VERIFIKASI,
    STATUS_LUNAS,
    STATUS_BATAL
}


# =========================================================
# 1. CUSTOMER: MEMPROSES / MENYIMPAN PEMBAYARAN
# =========================================================
@payment_bp.route('/api/payments', methods=['POST'])
def process_payment():
    conn = cursor = None

    try:
        data = request.get_json(silent=True) or {}

        raw_booking_id = data.get('booking_id')
        raw_payment_method = data.get('payment_method')
        raw_payment_type = data.get('payment_type')
        raw_total_price = data.get('total_price')

        if raw_booking_id is None:
            return jsonify({
                "status": "error",
                "error": "booking_id wajib diisi"
            }), 400

        try:
            booking_id = int(f"{raw_booking_id}")
        except (TypeError, ValueError):
            return jsonify({
                "status": "error",
                "error": "booking_id tidak valid"
            }), 400

        if booking_id <= 0:
            return jsonify({
                "status": "error",
                "error": "booking_id tidak valid"
            }), 400

        payment_method = str(raw_payment_method or "BCA").strip()
        payment_type = str(raw_payment_type or "Manual").strip()

        if payment_method.upper() != "BCA":
            return jsonify({
                "status": "error",
                "error": "Metode pembayaran saat ini hanya mendukung BCA"
            }), 400

        if payment_type.lower() != "manual":
            return jsonify({
                "status": "error",
                "error": "Tipe pembayaran saat ini hanya mendukung Manual"
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                b.id,
                b.villa_id,
                b.total_price,
                b.status,
                v.name AS villa_name,
                v.owner_user_id
            FROM bookings b
            LEFT JOIN villas v ON b.villa_id = v.id
            WHERE b.id = %s
            LIMIT 1
            """,
            (booking_id,)
        )

        booking = cursor.fetchone()

        if not booking or not isinstance(booking, dict):
            return jsonify({
                "status": "error",
                "error": "Booking tidak ditemukan"
            }), 404

        current_status = str(booking.get("status") or "")

        if current_status in (STATUS_LUNAS, STATUS_BATAL):
            return jsonify({
                "status": "error",
                "error": (
                    f"Booking sudah berstatus '{current_status}' "
                    "dan tidak dapat diproses kembali."
                )
            }), 400

        if raw_total_price is None or str(raw_total_price).strip() == "":
            calc_price = booking.get("total_price")
        else:
            calc_price = raw_total_price

        try:
            total_price_num = float(f"{calc_price}")
        except (TypeError, ValueError):
            return jsonify({
                "status": "error",
                "error": "total_price tidak valid"
            }), 400

        if total_price_num < 0:
            return jsonify({
                "status": "error",
                "error": "total_price tidak boleh negatif"
            }), 400

        cursor.execute(
            """
            UPDATE bookings
            SET
                payment_method = %s,
                payment_type = %s,
                total_price = %s,
                status = %s
            WHERE id = %s
            """,
            (
                payment_method,
                payment_type,
                total_price_num,
                STATUS_MENUNGGU_PEMBAYARAN,
                booking_id
            )
        )

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Pembayaran berhasil dicatat dan menunggu pembayaran.",
            "booking_id": booking_id,
            "villa_id": booking.get("villa_id"),
            "villa_name": booking.get("villa_name"),
            "payment_method": payment_method,
            "payment_type": payment_type,
            "total_price": total_price_num,
            "booking_status": STATUS_MENUNGGU_PEMBAYARAN
        }), 200

    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)


# =========================================================
# 2. ADMIN: AMBIL SEMUA DATA PEMBAYARAN
# =========================================================
@payment_bp.route('/api/admin/payments', methods=['GET'])
def get_payments_for_admin():
    conn = cursor = None
    admin_id = _admin_id_from_token()
    if not admin_id:
        return jsonify({
            "status": "error",
            "error": "Admin tidak terautentikasi.",
        }), 401

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        if not _validate_admin(cursor, admin_id):
            return jsonify({
                "status": "error",
                "error": "User bukan Admin.",
            }), 403

        cursor.execute(
            """
            SELECT
                b.id,
                b.full_name,
                COALESCE(v.name, b.villa_name) AS villa_name,
                b.villa_id,
                b.total_price,
                b.payment_method,
                b.payment_type,
                b.status,
                v.owner_user_id
            FROM bookings b
            LEFT JOIN villas v ON b.villa_id = v.id
            ORDER BY b.created_at DESC
            """
        )

        payments = cursor.fetchall() or []

        return jsonify({
            "status": "success",
            "data": payments
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)


# =========================================================
# 3. ADMIN: UPDATE STATUS PEMBAYARAN / BOOKING
# =========================================================
@payment_bp.route('/api/admin/payments/<int:booking_id>/status', methods=['PUT'])
def update_payment_status_by_admin(booking_id: int):
    conn = cursor = None
    admin_id = _admin_id_from_token()
    if not admin_id:
        return jsonify({
            "status": "error",
            "error": "Admin tidak terautentikasi.",
        }), 401

    try:
        data = request.get_json(silent=True) or {}
        raw_status = data.get('status')

        if not raw_status:
            return jsonify({
                "status": "error",
                "error": "Status wajib diisi"
            }), 400

        new_status = str(raw_status).strip()

        if new_status not in ALLOWED_ADMIN_STATUSES:
            return jsonify({
                "status": "error",
                "error": "Status tidak valid",
                "allowed_statuses": list(ALLOWED_ADMIN_STATUSES)
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        if not _validate_admin(cursor, admin_id):
            return jsonify({
                "status": "error",
                "error": "User bukan Admin.",
            }), 403

        cursor.execute(
            """
            SELECT
                b.id,
                b.villa_id,
                b.status,
                v.name AS villa_name,
                v.owner_user_id
            FROM bookings b
            LEFT JOIN villas v ON b.villa_id = v.id
            WHERE b.id = %s
            LIMIT 1
            """,
            (booking_id,)
        )

        booking = cursor.fetchone()

        if not booking or not isinstance(booking, dict):
            return jsonify({
                "status": "error",
                "error": "Booking tidak ditemukan"
            }), 404

        cursor.execute(
            """
            UPDATE bookings
            SET status = %s
            WHERE id = %s
            """,
            (new_status, booking_id)
        )

        conn.commit()

        return jsonify({
            "status": "success",
            "message": f"Status booking berhasil diubah menjadi {new_status}!",
            "booking_id": booking_id,
            "villa_id": booking.get("villa_id"),
            "villa_name": booking.get("villa_name"),
            "owner_user_id": booking.get("owner_user_id"),
            "booking_status": new_status
        }), 200

    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)