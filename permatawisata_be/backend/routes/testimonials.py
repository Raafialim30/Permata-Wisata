from flask import Blueprint, request, jsonify
from db import get_db_connection

testimonials_bp = Blueprint('testimonials_bp', __name__)


def _close(cursor=None, conn=None):
    try:
        if cursor: cursor.close()
    except Exception:
        pass
    try:
        if conn: conn.close()
    except Exception:
        pass


@testimonials_bp.route('/api/testimonials', methods=['GET'])
def get_testimonials():
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM testimonials ORDER BY id DESC")
        return jsonify(cursor.fetchall())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)


@testimonials_bp.route('/api/testimonials', methods=['POST'])
def add_testimonial():
    conn = cursor = None
    try:
        data    = request.json
        name    = data.get('name')
        comment = data.get('comment')
        rating  = data.get('rating', 5)

        conn   = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO testimonials (name, comment, rating) VALUES (%s, %s, %s)",
            (name, comment, rating)
        )
        conn.commit()
        return jsonify({"message": "Testimonial berhasil ditambahkan!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)