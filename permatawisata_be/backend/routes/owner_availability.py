from flask import Blueprint, jsonify, request
from db import get_db_connection
from datetime import timedelta

owner_availability_bp = Blueprint('owner_availability_bp', __name__)


def _close(cursor=None, conn=None):
    try:
        if cursor: cursor.close()
    except Exception:
        pass
    try:
        if conn: conn.close()
    except Exception:
        pass


# ------------------------------------------------------------------
# 1. Ambil daftar villa milik owner (untuk dropdown)
# ------------------------------------------------------------------
@owner_availability_bp.route('/api/owner/villas-list', methods=['GET'])
def get_owner_villas():
    conn = cursor = None
    try:
        owner_id = 1  # Simulasi
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, name FROM villas WHERE owner_id = %s", (owner_id,))
        return jsonify({"status": "success", "data": cursor.fetchall()}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)


# ------------------------------------------------------------------
# 2. Ambil tanggal yang sudah dibooking berdasarkan bulan & tahun
# ------------------------------------------------------------------
@owner_availability_bp.route('/api/owner/booked-dates', methods=['GET'])
def get_booked_dates():
    conn = cursor = None
    try:
        villa_name = request.args.get('villa_name')
        month      = int(request.args.get('month')) + 1  # JS 0-11 → Python 1-12
        year       = int(request.args.get('year'))

        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT check_in, check_out
            FROM bookings
            WHERE villa_name = %s AND status = 'Success'
              AND (MONTH(check_in) = %s OR MONTH(check_out) = %s)
              AND (YEAR(check_in)  = %s OR YEAR(check_out)  = %s)
            """,
            (villa_name, month, month, year, year)
        )
        bookings = cursor.fetchall()

        booked_days = set()
        for b in bookings:
            curr = b['check_in']
            end  = b['check_out']
            while curr <= end:
                if curr.month == month and curr.year == year:
                    booked_days.add(curr.day)
                curr += timedelta(days=1)

        return jsonify({"status": "success", "booked_dates": list(booked_days)}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)