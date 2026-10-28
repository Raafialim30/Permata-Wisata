import os
from functools import wraps

import jwt
from flask import g, jsonify, request


APP_ENV = os.getenv("APP_ENV", "production").strip().lower()
IS_PRODUCTION = APP_ENV in {"prod", "production"}
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.getenv("JWT_SECRET", "").strip()

if IS_PRODUCTION:
    if len(JWT_SECRET) < 32:
        raise RuntimeError(
            "Production requires JWT_SECRET with at least 32 characters."
        )
elif not JWT_SECRET:
    # Local-only fallback keeps development sessions valid across backend restarts.
    JWT_SECRET = "permata-wisata-local-development-only-secret"


def get_user_id_from_request(expected_role):
    authorization = request.headers.get("Authorization", "").strip()
    if not authorization.lower().startswith("bearer "):
        return None

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        return None

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
        )
        role = str(payload.get("role", "")).strip().lower()
        if role != expected_role:
            return None
        user_id = int(payload.get("user_id", payload.get("id", 0)))
        return user_id if user_id > 0 else None
    except (jwt.PyJWTError, TypeError, ValueError):
        return None


def require_admin(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        admin_id = get_user_id_from_request("admin")
        if not admin_id:
            return jsonify({
                "status": "error",
                "error": "Admin tidak terautentikasi.",
            }), 401

        connection = cursor = None
        try:
            from db import get_db_connection

            connection = get_db_connection()
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                "SELECT id FROM users WHERE id=%s AND role='admin' LIMIT 1",
                (admin_id,),
            )
            if not cursor.fetchone():
                return jsonify({
                    "status": "error",
                    "error": "User bukan Admin.",
                }), 403
            g.admin_user_id = admin_id
        except Exception as error:
            print("[ADMIN AUTH]", error)
            return jsonify({
                "status": "error",
                "error": "Autentikasi Admin belum dapat diverifikasi.",
            }), 503
        finally:
            try:
                if cursor:
                    cursor.close()
            except Exception:
                pass
            try:
                if connection:
                    connection.close()
            except Exception:
                pass

        return view(*args, **kwargs)

    return wrapped
