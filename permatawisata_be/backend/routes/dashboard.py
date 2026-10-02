from flask import Blueprint, jsonify
from db import get_db_connection


dashboard_bp = Blueprint('dashboard_bp', __name__)


# ========================================================
# HELPER: Menutup cursor dan koneksi database
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


# ========================================================
# ADMIN DASHBOARD
# ========================================================
@dashboard_bp.route('/api/admin/dashboard-data', methods=['GET'])
def get_dashboard_data():
    conn = cursor = None

    try:
        # =================================================
        # KONEKSI DATABASE
        # =================================================
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # =================================================
        # 1. TOTAL BOOKING
        # =================================================
        cursor.execute(
            """
            SELECT COUNT(*) AS total_bookings
            FROM bookings
            """
        )

        result = cursor.fetchone()
        total_bookings = result['total_bookings'] or 0

        # =================================================
        # 2. TOTAL REVENUE
        #
        # Hanya booking yang sudah Lunas yang dihitung
        # sebagai pendapatan.
        # =================================================
        cursor.execute(
            """
            SELECT
                COALESCE(SUM(total_price), 0) AS total_revenue
            FROM bookings
            WHERE status = 'Lunas'
            """
        )

        result = cursor.fetchone()
        total_revenue = result['total_revenue'] or 0

        # =================================================
        # 3. TOTAL VILLA
        # =================================================
        cursor.execute(
            """
            SELECT COUNT(*) AS total_villas
            FROM villas
            """
        )

        result = cursor.fetchone()
        total_villas = result['total_villas'] or 0

        # =================================================
        # 4. PENDING PAYMENTS
        #
        # Sistem booking saat ini menggunakan status:
        #
        # - Menunggu Pembayaran
        # - Menunggu Verifikasi
        #
        # Keduanya masih membutuhkan tindakan dalam
        # proses pembayaran.
        # =================================================
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

        result = cursor.fetchone()
        pending_payments = result['pending_payments'] or 0

        # =================================================
        # 5. BOOKING TERBARU
        #
        # Admin dapat melihat semua booking.
        #
        # Nama villa diambil dari tabel villas berdasarkan
        # villa_id agar mengikuti data villa terbaru.
        #
        # Jika villa sudah tidak ditemukan, digunakan
        # b.villa_name sebagai fallback.
        # =================================================
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

        latest_bookings = cursor.fetchall()

        # =================================================
        # 6. KONVERSI TANGGAL
        #
        # Agar tanggal dapat dikirim melalui JSON.
        # =================================================
        for booking in latest_bookings:

            if booking.get('check_in'):
                booking['check_in'] = booking[
                    'check_in'
                ].strftime('%Y-%m-%d')

            if booking.get('check_out'):
                booking['check_out'] = booking[
                    'check_out'
                ].strftime('%Y-%m-%d')

        # =================================================
        # 7. FORMAT TOTAL REVENUE
        # =================================================
        try:
            total_revenue_formatted = (
                f"Rp {float(total_revenue):,.0f}"
                .replace(",", ".")
            )
        except (TypeError, ValueError):
            total_revenue_formatted = "Rp 0"

        # =================================================
        # 8. RESPONSE
        # =================================================
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