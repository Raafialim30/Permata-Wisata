from flask import Blueprint, request, jsonify
from db import get_db_connection
from werkzeug.security import check_password_hash

import jwt
import os
from datetime import datetime, timedelta


# ==========================================================
# BLUEPRINT
# ==========================================================

login_bp = Blueprint(
    "login_bp",
    __name__
)


# ==========================================================
# JWT CONFIGURATION
# ==========================================================

JWT_SECRET = os.getenv(
    "JWT_SECRET",
    "jogjavilla_admin_secret_key_2026_x89!"
)

JWT_ALGORITHM = "HS256"

JWT_EXPIRES_HOURS = 12


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

def create_access_token(user):

    now = datetime.utcnow()

    payload = {
        "user_id": user["id"],
        "username": user["username"],
        "role": user["role"],

        "iat": now,

        "exp": now + timedelta(
            hours=JWT_EXPIRES_HOURS
        )
    }

    token = jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )

    return token


# ==========================================================
# LOGIN
# ==========================================================

@login_bp.route(
    "/api/login",
    methods=["POST"]
)
def login():

    conn = None
    cursor = None

    try:

        # ======================================================
        # AMBIL DATA REQUEST
        # ======================================================

        data = request.get_json(
            silent=True
        ) or {}

        username = str(
            data.get(
                "username",
                ""
            )
        ).strip()

        password = str(
            data.get(
                "password",
                ""
            )
        )

        role = str(
            data.get(
                "role",
                ""
            )
        ).strip().lower()


        # ======================================================
        # NORMALISASI ROLE
        # ======================================================

        if role in [
            "owner",
            "villa owner",
            "villa_owner"
        ]:

            role = "owner"

        elif role in [
            "admin",
            "administrator"
        ]:

            role = "admin"


        # ======================================================
        # VALIDASI INPUT
        # ======================================================

        if (
            not username
            or not password
            or not role
        ):

            return jsonify({
                "status": "error",
                "message": (
                    "Username, password, "
                    "dan role wajib diisi."
                )
            }), 400


        # ======================================================
        # VALIDASI ROLE
        # ======================================================

        if role not in [
            "admin",
            "owner"
        ]:

            return jsonify({
                "status": "error",
                "message": "Role tidak valid."
            }), 400


        # ======================================================
        # DATABASE CONNECTION
        # ======================================================

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )


        # ======================================================
        # CARI USER
        # ======================================================

        cursor.execute(
            """
            SELECT
                id,
                username,
                password,
                role
            FROM users
            WHERE username = %s
              AND role = %s
            LIMIT 1
            """,
            (
                username,
                role
            )
        )

        user = cursor.fetchone()


        # ======================================================
        # USER TIDAK DITEMUKAN
        # ======================================================

        if not user:

            return jsonify({
                "status": "error",
                "message": (
                    "Username, Password, "
                    "atau Role salah!"
                )
            }), 401


        # ======================================================
        # CEK PASSWORD HASH
        # ======================================================

        try:

            password_valid = check_password_hash(
                user["password"],
                password
            )

        except Exception as hash_error:

            print(
                "ERROR PASSWORD HASH:",
                hash_error
            )

            return jsonify({
                "status": "error",
                "message": (
                    "Format password "
                    "pada database tidak valid."
                )
            }), 500


        # ======================================================
        # PASSWORD SALAH
        # ======================================================

        if not password_valid:

            return jsonify({
                "status": "error",
                "message": (
                    "Username, Password, "
                    "atau Role salah!"
                )
            }), 401


        # ======================================================
        # BUAT JWT
        # ======================================================

        token = create_access_token(
            user
        )


        # ======================================================
        # RESPONSE LOGIN BERHASIL
        # ======================================================

        return jsonify({

            "status": "success",

            "message": (
                f"Login sebagai "
                f"{user['role']} berhasil!"
            ),

            "token": token,

            "user": {

                "id": user["id"],

                "username": user["username"],

                "role": user["role"]

            }

        }), 200


    # ======================================================
    # ERROR SERVER
    # ======================================================

    except Exception as e:

        print(
            "ERROR LOGIN:",
            e
        )

        return jsonify({

            "status": "error",

            "message": (
                "Terjadi kesalahan "
                "pada server."
            ),

            "error": str(e)

        }), 500


    # ======================================================
    # CLOSE DATABASE
    # ======================================================

    finally:

        _close(
            cursor,
            conn
        )