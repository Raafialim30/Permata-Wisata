from flask import Blueprint, request, jsonify
from db import get_db_connection

booking_bp = Blueprint('booking_bp', __name__)


def _close(cursor=None, conn=None):
    try:
        if cursor: cursor.close()
    except Exception:
        pass
    try:
        if conn: conn.close()
    except Exception:
        pass


# ========================================================
# 1. CUSTOMER: Membuat Pesanan Baru (POST)
# ========================================================
@booking_bp.route('/api/bookings', methods=['POST'])
def create_booking():
    conn = cursor = None
    try:
        data = request.get_json(silent=True) or {}

        villa_id        = data.get('villa_id')
        villa_name      = data.get('villa_name')
        check_in        = data.get('check_in')
        check_out       = data.get('check_out')
        guests          = data.get('guests')
        full_name       = data.get('full_name')
        email           = data.get('email')
        whatsapp        = data.get('whatsapp')
        total_price     = data.get('total_price')
        addons_info     = data.get('addons_info', '')

        # Pembayaran project saat ini adalah BCA manual.
        # Dipaksa di backend agar booking baru tidak dapat
        # tersimpan sebagai Midtrans.
        payment_method  = 'BCA'
        payment_type    = 'Manual'
        status          = 'Menunggu Pembayaran'

        # Validasi data wajib sebelum masuk database.
        required_fields = {
            'villa_id': villa_id,
            'villa_name': villa_name,
            'check_in': check_in,
            'check_out': check_out,
            'guests': guests,
            'full_name': full_name,
            'email': email,
            'whatsapp': whatsapp,
            'total_price': total_price
        }

        missing_fields = [
            key for key, value in required_fields.items()
            if value is None or str(value).strip() == ''
        ]

        if missing_fields:
            return jsonify({
                "error": "Data booking belum lengkap",
                "missing_fields": missing_fields
            }), 400

        try:
            guests = int(guests)
            total_price = float(total_price)
        except (TypeError, ValueError):
            return jsonify({
                "error": "Jumlah tamu atau total harga tidak valid"
            }), 400

        if guests < 1:
            return jsonify({"error": "Jumlah tamu minimal 1 orang"}), 400

        # Harga Rp 0 diperbolehkan sementara karena beberapa villa
        # belum menetapkan harga final dengan pemilik villa.
        # Nilai negatif tetap ditolak.
        if total_price < 0:
            return jsonify({"error": "Total harga tidak boleh negatif"}), 400

        conn   = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO bookings
            (villa_id, villa_name, check_in, check_out, guests, full_name,
             email, whatsapp, total_price, payment_method, payment_type, status, addons_info)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (villa_id, villa_name, check_in, check_out, guests,
             full_name, email, whatsapp, total_price,
             payment_method, payment_type, status, addons_info)
        )
        booking_id = cursor.lastrowid
        conn.commit()

        order_id = f"PW-{booking_id}"

        return jsonify({
            "message": "Booking berhasil disimpan!", 
            "status": "success",
            "booking_id": booking_id,
            "order_id": order_id
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)



# ========================================================
# 2. ADMIN: Ambil Semua Riwayat Booking (GET)
# ========================================================
@booking_bp.route('/api/admin/bookings', methods=['GET'])
def get_all_bookings_for_admin():
    conn = cursor = None
    try:
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, full_name, villa_name, check_in, check_out, total_price, status, addons_info
            FROM bookings
            ORDER BY created_at DESC
            """
        )
        bookings = cursor.fetchall()

        # Konversi tanggal agar JSON-safe
        for b in bookings:
            if b.get('check_in'):
                b['check_in'] = b['check_in'].strftime('%Y-%m-%d')
            if b.get('check_out'):
                b['check_out'] = b['check_out'].strftime('%Y-%m-%d')

        return jsonify({"status": "success", "data": bookings}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)

# ========================================================
# 3. CUSTOMER: Konfirmasi Pembayaran Manual (PUT)
# ========================================================
@booking_bp.route('/api/bookings/<int:booking_id>/confirm', methods=['PUT'])
def confirm_manual_payment(booking_id):
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Cek booking, metode pembayaran, dan tipe pembayaran.
        cursor.execute(
            "SELECT status, payment_method, payment_type FROM bookings WHERE id = %s",
            (booking_id,)
        )
        booking = cursor.fetchone()

        if not booking:
            return jsonify({"error": "Booking tidak ditemukan"}), 404

        # Konfirmasi ini khusus untuk pembayaran BCA manual.
        if (
            str(booking[1]).upper() != "BCA"
            or str(booking[2]).lower() != "manual"
        ):
            return jsonify({
                "error": "Booking ini bukan pembayaran BCA manual"
            }), 400

        # Booking yang sudah selesai/batal tidak boleh dikonfirmasi ulang.
        if booking[0] in ("Lunas", "Batal"):
            return jsonify({
                "error": f"Booking sudah berstatus {booking[0]} dan tidak dapat dikonfirmasi ulang"
            }), 400

        # Customer menyatakan sudah transfer.
        # Admin tetap melakukan verifikasi transfer secara manual.
        cursor.execute(
            "UPDATE bookings SET status = %s WHERE id = %s",
            ("Menunggu Verifikasi", booking_id)
        )
        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Pembayaran BCA berhasil dikonfirmasi dan menunggu verifikasi admin",
            "booking_id": booking_id,
            "payment_method": "BCA",
            "payment_type": "Manual",
            "booking_status": "Menunggu Verifikasi"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)
