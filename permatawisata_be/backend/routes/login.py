from datetime import datetime, timedelta, timezone
from typing import Any, Dict
import jwt
from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash
from db import get_db_connection
from security import JWT_ALGORITHM, JWT_SECRET


# ==========================================================
# BLUEPRINT
# ==========================================================
login_bp = Blueprint("login_bp", __name__)


# ==========================================================
# JWT CONFIGURATION (KADALUARSA 10 MENIT)
# ==========================================================
JWT_EXPIRES_MINUTES = 10


# ==========================================================
# HELPER
# ==========================================================
def _close(cursor=None, conn=None):
    try:
        if cursor:
            cursor.close()
    except Exception:
        pass

    try:
        if conn:
            conn.close()
    except Exception:
        pass


# ==========================================================
# CREATE JWT TOKEN
# ==========================================================
def create_access_token(user_id: Any, username: str, role: str) -> str:
    now = datetime.now(timezone.utc)

    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRES_MINUTES)
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


# ==========================================================
# LOGIN (SUPPORT DUA ENDPOINT)
# ==========================================================
@login_bp.route("/api/login", methods=["POST"])
@login_bp.route("/api/auth/login", methods=["POST"])
def login():
    conn = None
    cursor = None

    try:
        # ======================================================
        # AMBIL DATA REQUEST
        # ======================================================
        data = request.get_json(silent=True) or {}

        username = str(data.get("username", "")).strip()
        password = str(data.get("password", ""))
        role = str(data.get("role", "")).strip().lower()

        # ======================================================
        # NORMALISASI ROLE
        # ======================================================
        if role in ["owner", "villa owner", "villa_owner"]:
            role = "owner"
        elif role in ["admin", "administrator"]:
            role = "admin"

        # ======================================================
        # VALIDASI INPUT
        # ======================================================
        if not username or not password or not role:
            return jsonify({
                "status": "error",
                "message": "Username, password, dan role wajib diisi."
            }), 400

        if role not in ["admin", "owner"]:
            return jsonify({
                "status": "error",
                "message": "Role tidak valid."
            }), 400

        # ======================================================
        # DATABASE CONNECTION & SEARCH USER
        # ======================================================
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                username,
                password,
                role
            FROM users
            WHERE username = %s
              AND LOWER(role) = %s
            LIMIT 1
            """,
            (username, role)
        )

        user = cursor.fetchone()

        # ======================================================
        # USER TIDAK DITEMUKAN / PENGECEKAN TIPE DATA SAFE
        # ======================================================
        if not user or not isinstance(user, dict):
            return jsonify({
                "status": "error",
                "message": "Username, Password, atau Role salah!"
            }), 401

        user_id = user.get("id")
        user_name = str(user.get("username") or "")
        user_role = str(user.get("role") or "").lower().strip()
        stored_password = str(user.get("password") or "")

        # ======================================================
        # CEK PASSWORD HASH
        # ======================================================
        try:
            if stored_password.startswith("pbkdf2:") or stored_password.startswith("scrypt:"):
                password_valid = check_password_hash(stored_password, password)
            else:
                password_valid = (stored_password == password)
        except Exception as hash_error:
            print("ERROR PASSWORD HASH:", hash_error)
            return jsonify({
                "status": "error",
                "message": "Format password pada database tidak valid."
            }), 500

        if not password_valid:
            return jsonify({
                "status": "error",
                "message": "Username, Password, atau Role salah!"
            }), 401

        # ======================================================
        # BUAT JWT & RESPONSE
        # ======================================================
        token = create_access_token(user_id, user_name, user_role)

        return jsonify({
            "status": "success",
            "message": f"Login sebagai {user_role} berhasil!",
            "token": token,
            "user": {
                "id": user_id,
                "username": user_name,
                "role": user_role
            }
        }), 200

    except Exception as e:
        print("ERROR LOGIN:", e)
        return jsonify({
            "status": "error",
            "message": "Terjadi kesalahan pada server.",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)