from flask import Blueprint, request, jsonify
from db import get_db_connection

payment_bp = Blueprint('payment_bp', __name__)


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
# 1. Memproses Pembayaran (POST)
# ========================================================
@payment_bp.route('/api/payments', methods=['POST'])
def process_payment():
    conn = cursor = None
    try:
        data           = request.json
        booking_id     = data.get('booking_id')
        payment_method = data.get('payment_method')
        payment_type   = data.get('payment_type')
        total_price    = data.get('total_price')

        conn   = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE bookings
            SET payment_method = %s, payment_type = %s, total_price = %s, status = 'Pending'
            WHERE id = %s
            """,
            (payment_method, payment_type, total_price, booking_id)
        )
        conn.commit()
        return jsonify({"message": "Pembayaran berhasil dikonfirmasi!", "status": "success"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)


# ========================================================
# 2. Admin: Ambil Semua Data Pembayaran (GET)
# ========================================================
@payment_bp.route('/api/admin/payments', methods=['GET'])
def get_payments_for_admin():
    conn = cursor = None
    try:
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, full_name, villa_name, total_price, status FROM bookings ORDER BY created_at DESC"
        )
        return jsonify({"status": "success", "data": cursor.fetchall()}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)


# ========================================================
# 3. Admin: Update Status Validasi (PUT)
# ========================================================
@payment_bp.route('/api/admin/payments/<int:booking_id>/status', methods=['PUT'])
def update_payment_status_by_admin(booking_id):
    conn = cursor = None
    try:
        new_status = request.json.get('status')
        conn   = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE bookings SET status = %s WHERE id = %s",
            (new_status, booking_id)
        )
        conn.commit()
        return jsonify({"status": "success", "message": f"Status booking berhasil diubah menjadi {new_status}!"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)