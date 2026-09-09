from flask import Blueprint, jsonify
from db import get_db_connection

owner_dashboard_bp = Blueprint('owner_dashboard_bp', __name__)


def _close(cursor=None, conn=None):
    try:
        if cursor: cursor.close()
    except Exception:
        pass
    try:
        if conn: conn.close()
    except Exception:
        pass


@owner_dashboard_bp.route('/api/owner/dashboard-stats', methods=['GET'])
def get_owner_dashboard_data():
    conn = cursor = None
    try:
        owner_id = 1  # Simulasi owner yang login
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Summary stats
        cursor.execute(
            """
            SELECT
                COUNT(b.id) as total_bookings,
                IFNULL(SUM(CASE WHEN b.status = 'Success' THEN b.total_price ELSE 0 END), 0) as total_revenue,
                IFNULL(SUM(b.guests), 0) as total_guests,
                COUNT(CASE WHEN b.check_in >= CURDATE() AND b.status = 'Success' THEN 1 END) as upcoming_bookings
            FROM bookings b
            JOIN villas v ON b.villa_id = v.id
            WHERE v.owner_id = %s
            """,
            (owner_id,)
        )
        stats = cursor.fetchone()

        # 2. Upcoming bookings
        cursor.execute(
            """
            SELECT b.full_name as name, b.villa_name as villa, b.check_in, b.check_out, b.guests, b.status
            FROM bookings b
            JOIN villas v ON b.villa_id = v.id
            WHERE v.owner_id = %s AND b.check_in >= CURDATE()
            ORDER BY b.check_in ASC
            LIMIT 5
            """,
            (owner_id,)
        )
        bookings_list = []
        for rb in cursor.fetchall():
            ci = rb['check_in'].strftime('%Y-%m-%d')  if rb.get('check_in')  else ""
            co = rb['check_out'].strftime('%Y-%m-%d') if rb.get('check_out') else ""
            bookings_list.append({
                "name":   rb['name'],
                "villa":  rb['villa'],
                "date":   f"{ci} - {co}",
                "guests": f"{rb['guests']} tamu",
                "status": rb['status'].lower()
            })

        # 3. Recent activities
        cursor.execute(
            "SELECT id, full_name, status, created_at FROM bookings ORDER BY created_at DESC LIMIT 4"
        )
        activities_list = []
        for ra in cursor.fetchall():
            title = f"Pemesanan baru oleh {ra['full_name']}"
            if ra['status'] == 'Success':
                title = f"Pembayaran berhasil dikonfirmasi ({ra['full_name']})"
            elif ra['status'] == 'Reject':
                title = f"Pemesanan ditolak oleh Admin ({ra['full_name']})"
            activities_list.append({
                "title": title,
                "id":    f"BK-2026-{ra['id']:03d}",
                "time":  ra['created_at'].strftime('%d %b %Y %H:%M') if ra.get('created_at') else "Baru saja"
            })

        return jsonify({
            "status":     "success",
            "stats":      stats,
            "bookings":   bookings_list,
            "activities": activities_list
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)