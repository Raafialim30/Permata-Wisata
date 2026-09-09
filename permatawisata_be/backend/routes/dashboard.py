from flask import Blueprint, jsonify
from db import get_db_connection

dashboard_bp = Blueprint('dashboard_bp', __name__)


def _close(cursor=None, conn=None):
    try:
        if cursor: cursor.close()
    except Exception:
        pass
    try:
        if conn: conn.close()
    except Exception:
        pass


@dashboard_bp.route('/api/admin/dashboard-data', methods=['GET'])
def get_dashboard_data():
    conn = cursor = None
    try:
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT COUNT(*) as total_bookings FROM bookings")
        total_bookings = cursor.fetchone()['total_bookings']

        cursor.execute("SELECT SUM(total_price) as total_revenue FROM bookings")
        total_revenue = cursor.fetchone()['total_revenue'] or 0

        cursor.execute("SELECT COUNT(*) as total_villas FROM villas")
        total_villas = cursor.fetchone()['total_villas']

        cursor.execute("SELECT COUNT(*) as pending_payments FROM bookings WHERE status = 'Pending'")
        pending_payments = cursor.fetchone()['pending_payments']

        cursor.execute(
            """
            SELECT id, full_name, villa_name, check_in, check_out, total_price, status
            FROM bookings
            ORDER BY created_at DESC
            LIMIT 5
            """
        )
        latest_bookings = cursor.fetchall()

        for b in latest_bookings:
            if b.get('check_in'):
                b['check_in'] = b['check_in'].strftime('%Y-%m-%d')
            if b.get('check_out'):
                b['check_out'] = b['check_out'].strftime('%Y-%m-%d')

        return jsonify({
            "status": "success",
            "stats": {
                "total_bookings":  total_bookings,
                "total_revenue":   f"Rp {total_revenue:,}".replace(",", "."),
                "total_villas":    total_villas,
                "pending_payments": pending_payments
            },
            "bookings": latest_bookings
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)