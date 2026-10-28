from flask import Blueprint, request, jsonify
from db import get_db_connection

reviews_bp = Blueprint('reviews_bp', __name__)


def _close(cursor=None, conn=None):
    if cursor:
        try:
            cursor.close()
        except Exception:
            pass

    if conn:
        try:
            conn.close()
        except Exception:
            pass


@reviews_bp.route('/api/reviews', methods=['POST'])
def add_review():
    conn = cursor = None
    try:
        # get_json(silent=True) or {} memastikan data selalu berupa dict (bukan None)
        data = request.get_json(silent=True) or {}

        reviewer_name = data.get('reviewer_name')
        villa_id = data.get('villa_id')
        room_id = data.get('room_id')
        rating = data.get('rating', 5)
        comment = data.get('comment', '')

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO villa_reviews (villa_id, room_id, reviewer_name, rating, comment, is_approved)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (villa_id, room_id, reviewer_name, rating, comment, 1)
        )
        conn.commit()
        return jsonify({"message": "Ulasan berhasil dikirim!", "status": "success"}), 201

    except Exception as e:
        return jsonify({"error": f"{e}"}), 500
    finally:
        _close(cursor, conn)


@reviews_bp.route('/api/reviews', methods=['GET'])
def get_reviews():
    conn = cursor = None
    try:
        villa_id = request.args.get('villa_id')
        room_id = request.args.get('room_id')

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = "SELECT * FROM villa_reviews WHERE is_approved = 1"
        params = []

        if villa_id:
            query += " AND villa_id = %s"
            params.append(villa_id)
        if room_id:
            query += " AND room_id = %s"
            params.append(room_id)

        query += " ORDER BY created_at DESC"

        cursor.execute(query, tuple(params))
        return jsonify({"status": "success", "data": cursor.fetchall()}), 200

    except Exception as e:
        return jsonify({"error": f"{e}"}), 500
    finally:
        _close(cursor, conn)