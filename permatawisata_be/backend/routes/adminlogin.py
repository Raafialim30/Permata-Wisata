from typing import Any, Dict, Optional
from flask import Blueprint, request, jsonify
from db import get_db_connection

adminlogin_bp = Blueprint('adminlogin_bp', __name__)


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


@adminlogin_bp.route('/api/login', methods=['POST'])
def login():
    conn = cursor = None
    try:
        # get_json(silent=True) or {} memastikan data selalu berupa dict
        data = request.get_json(silent=True) or {}

        username = data.get('username')
        password = data.get('password')
        role = data.get('role')

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, username, role FROM users WHERE username = %s AND password = %s AND role = %s",
            (username, password, role)
        )
        user = cursor.fetchone()

        # Pengecekan tipe data aman untuk dictionary
        if user and isinstance(user, dict):
            user_id = user.get('id')
            user_name = str(user.get('username') or '')
            user_role = str(user.get('role') or '')

            return jsonify({
                "status": "success",
                "message": f"Login sebagai {role} berhasil!",
                "token": f"dummy_token_user_{user_id}",
                "user": {
                    "id": user_id,
                    "username": user_name,
                    "role": user_role
                }
            }), 200

        return jsonify({
            "status": "error",
            "message": "Username, Password, atau Role salah!"
        }), 401

    except Exception as e:
        return jsonify({"error": f"{e}"}), 500
    finally:
        _close(cursor, conn)