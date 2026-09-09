from flask import Blueprint, request, jsonify
from db import get_db_connection

adminlogin_bp = Blueprint('adminlogin_bp', __name__)


def _close(cursor=None, conn=None):
    try:
        if cursor: cursor.close()
    except Exception:
        pass
    try:
        if conn: conn.close()
    except Exception:
        pass


@adminlogin_bp.route('/api/login', methods=['POST'])
def login():
    conn = cursor = None
    try:
        data     = request.json
        username = data.get('username')
        password = data.get('password')
        role     = data.get('role')

        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, username, role FROM users WHERE username = %s AND password = %s AND role = %s",
            (username, password, role)
        )
        user = cursor.fetchone()

        if user:
            return jsonify({
                "status":  "success",
                "message": f"Login sebagai {role} berhasil!",
                "token":   f"dummy_token_user_{user['id']}",
                "user": {
                    "id":       user['id'],
                    "username": user['username'],
                    "role":     user['role']
                }
            }), 200
        else:
            return jsonify({"status": "error", "message": "Username, Password, atau Role salah!"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)