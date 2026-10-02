from flask import Blueprint, request, jsonify
from db import get_db_connection


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
# 1. CUSTOMER
# MEMPROSES / MENYIMPAN PEMBAYARAN
# =========================================================
@payment_bp.route(
    '/api/payments',
    methods=['POST']
)
def process_payment():

    conn = cursor = None

    try:
        data = request.get_json(
            silent=True
        ) or {}

        # -------------------------------------------------
        # Data dari frontend
        # -------------------------------------------------
        booking_id = data.get(
            'booking_id'
        )

        payment_method = data.get(
            'payment_method'
        )

        payment_type = data.get(
            'payment_type'
        )

        total_price = data.get(
            'total_price'
        )

        # -------------------------------------------------
        # Validasi booking_id
        # -------------------------------------------------
        if booking_id is None:
            return jsonify({
                "status": "error",
                "error": "booking_id wajib diisi"
            }), 400

        try:
            booking_id = int(
                booking_id
            )
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

        # -------------------------------------------------
        # Sistem pembayaran saat ini:
        #
        # BCA + Manual
        #
        # Kita tetap menerima data dari frontend,
        # tetapi jika kosong, gunakan konfigurasi sistem.
        # -------------------------------------------------
        if not payment_method:
            payment_method = "BCA"

        if not payment_type:
            payment_type = "Manual"

        payment_method = str(
            payment_method
        ).strip()

        payment_type = str(
            payment_type
        ).strip()

        # -------------------------------------------------
        # Validasi metode pembayaran
        # -------------------------------------------------
        if payment_method.upper() != "BCA":
            return jsonify({
                "status": "error",
                "error": (
                    "Metode pembayaran saat ini "
                    "hanya mendukung BCA"
                )
            }), 400

        if payment_type.lower() != "manual":
            return jsonify({
                "status": "error",
                "error": (
                    "Tipe pembayaran saat ini "
                    "hanya mendukung Manual"
                )
            }), 400

        # -------------------------------------------------
        # Koneksi database
        # -------------------------------------------------
        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )

        # =================================================
        # CARI BOOKING
        #
        # owner_user_id TIDAK diambil dari bookings.
        # Jika diperlukan, relasinya melalui:
        #
        # bookings.villa_id
        #       ↓
        # villas.id
        #       ↓
        # villas.owner_user_id
        # =================================================
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

            LEFT JOIN villas v
                ON b.villa_id = v.id

            WHERE b.id = %s

            LIMIT 1
            """,
            (booking_id,)
        )

        booking = cursor.fetchone()

        if not booking:
            return jsonify({
                "status": "error",
                "error": "Booking tidak ditemukan"
            }), 404

        # -------------------------------------------------
        # Validasi status booking
        # -------------------------------------------------
        current_status = booking.get(
            "status"
        )

        if current_status in (
            STATUS_LUNAS,
            STATUS_BATAL
        ):
            return jsonify({
                "status": "error",
                "error": (
                    f"Booking sudah berstatus "
                    f"'{current_status}' dan "
                    "tidak dapat diproses kembali."
                )
            }), 400

        # -------------------------------------------------
        # Total harga
        #
        # Jika frontend tidak mengirim total_price,
        # gunakan harga yang sudah tersimpan pada booking.
        # -------------------------------------------------
        if total_price is None or str(
            total_price
        ).strip() == "":

            total_price = booking.get(
                "total_price"
            )

        try:
            total_price = float(
                total_price
            )
        except (TypeError, ValueError):

            return jsonify({
                "status": "error",
                "error": "total_price tidak valid"
            }), 400

        if total_price < 0:
            return jsonify({
                "status": "error",
                "error": (
                    "total_price tidak boleh negatif"
                )
            }), 400

        # =================================================
        # UPDATE PEMBAYARAN
        #
        # Status dibuat:
        # Menunggu Pembayaran
        #
        # Setelah customer melakukan konfirmasi
        # pembayaran melalui endpoint booking/confirm,
        # status akan menjadi:
        # Menunggu Verifikasi
        #
        # Setelah Admin memverifikasi:
        # Lunas
        # =================================================
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
                total_price,
                STATUS_MENUNGGU_PEMBAYARAN,
                booking_id
            )
        )

        conn.commit()

        return jsonify({
            "status": "success",
            "message": (
                "Pembayaran berhasil dicatat "
                "dan menunggu pembayaran."
            ),

            "booking_id": booking_id,

            "villa_id": booking.get(
                "villa_id"
            ),

            "villa_name": booking.get(
                "villa_name"
            ),

            "payment_method": payment_method,

            "payment_type": payment_type,

            "total_price": total_price,

            "booking_status": (
                STATUS_MENUNGGU_PEMBAYARAN
            )
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
# 2. ADMIN
# AMBIL SEMUA DATA PEMBAYARAN
# =========================================================
@payment_bp.route(
    '/api/admin/payments',
    methods=['GET']
)
def get_payments_for_admin():

    conn = cursor = None

    try:
        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )

        # -------------------------------------------------
        # Admin melihat seluruh pembayaran.
        #
        # owner_user_id didapat dari tabel villas,
        # BUKAN dari bookings.
        #
        # Relasi:
        #
        # bookings.villa_id
        #      ↓
        # villas.id
        #      ↓
        # villas.owner_user_id
        # -------------------------------------------------
        cursor.execute(
            """
            SELECT
                b.id,
                b.full_name,

                COALESCE(
                    v.name,
                    b.villa_name
                ) AS villa_name,

                b.villa_id,

                b.total_price,

                b.payment_method,

                b.payment_type,

                b.status,

                v.owner_user_id

            FROM bookings b

            LEFT JOIN villas v
                ON b.villa_id = v.id

            ORDER BY b.created_at DESC
            """
        )

        payments = cursor.fetchall()

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
# 3. ADMIN
# UPDATE STATUS PEMBAYARAN / BOOKING
# =========================================================
@payment_bp.route(
    '/api/admin/payments/<int:booking_id>/status',
    methods=['PUT']
)
def update_payment_status_by_admin(
    booking_id
):

    conn = cursor = None

    try:
        data = request.get_json(
            silent=True
        ) or {}

        new_status = data.get(
            'status'
        )

        # -------------------------------------------------
        # Validasi status
        # -------------------------------------------------
        if not new_status:
            return jsonify({
                "status": "error",
                "error": "Status wajib diisi"
            }), 400

        new_status = str(
            new_status
        ).strip()

        if new_status not in ALLOWED_ADMIN_STATUSES:
            return jsonify({
                "status": "error",
                "error": (
                    "Status tidak valid"
                ),
                "allowed_statuses": list(
                    ALLOWED_ADMIN_STATUSES
                )
            }), 400

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )

        # =================================================
        # CEK BOOKING
        # =================================================
        cursor.execute(
            """
            SELECT
                b.id,
                b.villa_id,
                b.status,
                v.name AS villa_name,
                v.owner_user_id

            FROM bookings b

            LEFT JOIN villas v
                ON b.villa_id = v.id

            WHERE b.id = %s

            LIMIT 1
            """,
            (booking_id,)
        )

        booking = cursor.fetchone()

        if not booking:
            return jsonify({
                "status": "error",
                "error": "Booking tidak ditemukan"
            }), 404

        # =================================================
        # UPDATE STATUS
        # =================================================
        cursor.execute(
            """
            UPDATE bookings
            SET status = %s
            WHERE id = %s
            """,
            (
                new_status,
                booking_id
            )
        )

        conn.commit()

        return jsonify({
            "status": "success",

            "message": (
                "Status booking berhasil "
                f"diubah menjadi {new_status}!"
            ),

            "booking_id": booking_id,

            "villa_id": booking.get(
                "villa_id"
            ),

            "villa_name": booking.get(
                "villa_name"
            ),

            "owner_user_id": booking.get(
                "owner_user_id"
            ),

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