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
        data = request.get_json(silent=True) or {}

        reviewer_name = data.get('reviewer_name', '').strip()
        villa_id = data.get('villa_id')
        room_id = data.get('room_id') if data.get('room_id') else None
        rating = data.get('rating', 5)
        comment = data.get('comment', '').strip()

        # Validasi data wajib
        if not reviewer_name or not villa_id or not comment:
            return jsonify({
                "status": "error",
                "message": "Nama, villa, dan komentar wajib diisi."
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO villa_reviews (villa_id, room_id, reviewer_name, rating, comment, is_approved)
            VALUES (%s, %s, %s, %s, %s, 1)
            """,
            (villa_id, room_id, reviewer_name, rating, comment)
        )
        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Ulasan berhasil dikirim!"
        }), 201

    except Exception as e:
        return jsonify({"status": "error", "error": f"{e}"}), 500
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

        # Mengubah created_at langsung via SQL menjadi string format standar
        query = """
            SELECT id, villa_id, room_id, reviewer_name, rating, comment,
                   DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at, is_approved
            FROM villa_reviews
            WHERE (is_approved = 1 OR is_approved IS NULL)
        """
        params = []

        if villa_id:
            query += " AND villa_id = %s"
            params.append(villa_id)
        if room_id:
            query += " AND room_id = %s"
            params.append(room_id)

        query += " ORDER BY created_at DESC"

        cursor.execute(query, tuple(params))
        reviews_list = cursor.fetchall() or []

        return jsonify({"status": "success", "data": reviews_list}), 200

    except Exception as e:
        return jsonify({"status": "error", "error": f"{e}"}), 500
    finally:
        _close(cursor, conn)