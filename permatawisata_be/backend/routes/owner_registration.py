import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash

from db import get_db_connection
from security import get_user_id_from_request


owner_registration_bp = Blueprint("owner_registration_bp", __name__)


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


def _admin_id_from_token():
    return get_user_id_from_request("admin")


def _positive_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        result = int(f"{value}")
        return result if result > 0 else None
    except (TypeError, ValueError):
        return None


def _validate_admin(cursor, admin_id: Any) -> bool:
    cursor.execute(
        "SELECT id FROM users WHERE id=%s AND role='admin' LIMIT 1",
        (admin_id,),
    )
    return cursor.fetchone() is not None


def _format_dates(row: Any) -> Dict[str, Any]:
    if not isinstance(row, dict):
        return {}
    formatted = dict(row)
    for field in ("created_at", "processed_at"):
        val = formatted.get(field)
        if isinstance(val, datetime):
            formatted[field] = val.strftime("%Y-%m-%d %H:%M:%S")
    return formatted


@owner_registration_bp.route("/api/owner/registration-villas", methods=["GET"])
def get_available_registration_villas():
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT v.id, v.name, v.location
            FROM villas v
            WHERE v.owner_user_id IS NULL
              AND NOT EXISTS (
                  SELECT 1
                  FROM owner_registration_requests r
                  WHERE r.villa_id=v.id AND r.status='Menunggu'
              )
            ORDER BY v.name ASC
            """
        )
        villas = cursor.fetchall() or []
        return jsonify({"status": "success", "villas": villas}), 200
    except Exception as error:
        print("[OWNER REGISTRATION VILLAS]", error)
        return jsonify({
            "status": "error",
            "error": "Daftar villa belum dapat dimuat. Silakan coba lagi.",
        }), 500
    finally:
        _close(cursor, conn)


@owner_registration_bp.route("/api/owner/register", methods=["POST"])
def register_owner():
    conn = cursor = None
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({"status": "error", "error": "Data pendaftaran tidak valid."}), 400

        villa_id = _positive_int(data.get("villa_id"))
        contact_name = str(data.get("contact_name", "") or "").strip()
        phone = str(data.get("phone", "") or "").strip()
        username = str(data.get("username", "") or "").strip()
        password = str(data.get("password", "") or "")

        if not villa_id:
            return jsonify({"status": "error", "error": "Villa wajib dipilih."}), 400
        if not contact_name or not phone:
            return jsonify({"status": "error", "error": "Nama pemilik dan nomor WhatsApp wajib diisi."}), 400
        if not re.fullmatch(r"[A-Za-z0-9_.-]{3,50}", username):
            return jsonify({
                "status": "error",
                "error": "Username harus 3–50 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.",
            }), 400
        if len(password) < 8 or len(password) > 128:
            return jsonify({"status": "error", "error": "Password harus terdiri dari 8–128 karakter."}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id FROM villas WHERE id=%s AND owner_user_id IS NULL FOR UPDATE", (villa_id,))
        villa = cursor.fetchone()
        if not villa or not isinstance(villa, dict):
            return jsonify({
                "status": "error",
                "error": "Villa tidak ditemukan, sudah terhubung ke Owner lain, atau pendaftarannya sedang diproses.",
            }), 409

        cursor.execute("SELECT id FROM users WHERE username=%s LIMIT 1", (username,))
        if cursor.fetchone():
            return jsonify({"status": "error", "error": "Username sudah digunakan."}), 409

        cursor.execute(
            """
            SELECT id FROM owner_registration_requests
            WHERE username=%s AND status='Menunggu'
            LIMIT 1
            """,
            (username,),
        )
        if cursor.fetchone():
            return jsonify({"status": "error", "error": "Username sudah memiliki pendaftaran yang menunggu persetujuan."}), 409

        cursor.execute(
            """
            INSERT INTO owner_registration_requests
                (villa_id, contact_name, phone, username, password_hash, status)
            VALUES (%s, %s, %s, %s, %s, 'Menunggu')
            """,
            (
                villa_id,
                contact_name,
                phone,
                username,
                generate_password_hash(password),
            ),
        )
        registration_id = cursor.lastrowid
        conn.commit()
        return jsonify({
            "status": "success",
            "message": "Pendaftaran diterima dan menunggu persetujuan Admin.",
            "registration_id": registration_id,
        }), 201
    except Exception as error:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        print("[OWNER REGISTRATION CREATE]", error)
        return jsonify({
            "status": "error",
            "error": "Pendaftaran belum dapat disimpan. Silakan coba lagi.",
        }), 500
    finally:
        _close(cursor, conn)


@owner_registration_bp.route("/api/admin/owner-registrations", methods=["GET"])
def get_owner_registrations():
    conn = cursor = None
    admin_id = _admin_id_from_token()
    if not admin_id:
        return jsonify({"status": "error", "error": "Admin tidak terautentikasi."}), 401
    try:
        raw_status = request.args.get("status")
        status = str(raw_status).strip() if raw_status else "Menunggu"

        if status not in {"Menunggu", "Disetujui", "Ditolak", "Semua"}:
            return jsonify({"status": "error", "error": "Status pendaftaran tidak valid."}), 400
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if not _validate_admin(cursor, admin_id):
            return jsonify({"status": "error", "error": "User bukan Admin."}), 403

        sql = """
            SELECT r.id, r.villa_id, v.name AS villa_name, v.location,
                   r.contact_name, r.phone, r.username, r.status,
                   r.admin_note, r.created_at, r.processed_at,
                   u.username AS processed_by_username
            FROM owner_registration_requests r
            INNER JOIN villas v ON v.id=r.villa_id
            LEFT JOIN users u ON u.id=r.processed_by
        """
        params: List[Any] = []
        if status != "Semua":
            sql += " WHERE r.status=%s"
            params.append(status)
        sql += " ORDER BY CASE WHEN r.status='Menunggu' THEN 0 ELSE 1 END, r.created_at DESC LIMIT 200"
        cursor.execute(sql, tuple(params))
        raw_rows = cursor.fetchall() or []
        registrations = [_format_dates(row) for row in raw_rows if isinstance(row, dict)]
        return jsonify({
            "status": "success",
            "registrations": registrations,
        }), 200
    except Exception as error:
        print("[OWNER REGISTRATION LIST]", error)
        return jsonify({"status": "error", "error": "Daftar pendaftaran belum dapat dimuat."}), 500
    finally:
        _close(cursor, conn)


@owner_registration_bp.route(
    "/api/admin/owner-registrations/<int:registration_id>/approve",
    methods=["PUT"],
)
def approve_owner_registration(registration_id: int):
    conn = cursor = None
    admin_id = _admin_id_from_token()
    if not admin_id:
        return jsonify({"status": "error", "error": "Admin tidak terautentikasi."}), 401
    try:
        data = request.get_json(silent=True) or {}
        admin_note = str(data.get("admin_note", "") or "").strip()
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if not _validate_admin(cursor, admin_id):
            return jsonify({"status": "error", "error": "User bukan Admin."}), 403

        cursor.execute(
            """
            SELECT id, villa_id, username, password_hash, status
            FROM owner_registration_requests
            WHERE id=%s
            LIMIT 1 FOR UPDATE
            """,
            (registration_id,),
        )
        registration = cursor.fetchone()
        if not registration or not isinstance(registration, dict):
            return jsonify({"status": "error", "error": "Pendaftaran tidak ditemukan."}), 404
        
        reg_status = str(registration.get("status") or "")
        if reg_status != "Menunggu":
            return jsonify({"status": "error", "error": "Pendaftaran sudah diproses."}), 409

        raw_villa_id = registration.get("villa_id")
        if not raw_villa_id:
            return jsonify({"status": "error", "error": "Data villa tidak valid."}), 400

        villa_id = int(f"{raw_villa_id}")
        reg_username = str(registration.get("username") or "")
        reg_password_hash = str(registration.get("password_hash") or "")

        cursor.execute(
            "SELECT id, owner_user_id FROM villas WHERE id=%s LIMIT 1 FOR UPDATE",
            (villa_id,),
        )
        villa = cursor.fetchone()
        if not villa or not isinstance(villa, dict) or villa.get("owner_user_id") is not None:
            return jsonify({"status": "error", "error": "Villa sudah tidak tersedia untuk ditautkan ke Owner."}), 409

        cursor.execute("SELECT id FROM users WHERE username=%s LIMIT 1", (reg_username,))
        if cursor.fetchone():
            return jsonify({"status": "error", "error": "Username sudah digunakan oleh akun lain."}), 409

        cursor.execute(
            "INSERT INTO users (username, password, role) VALUES (%s, %s, 'owner')",
            (reg_username, reg_password_hash),
        )
        last_id = cursor.lastrowid
        if not last_id:
            raise RuntimeError("Gagal membuat akun Owner.")

        owner_user_id = int(f"{last_id}")

        cursor.execute(
            "UPDATE villas SET owner_user_id=%s WHERE id=%s AND owner_user_id IS NULL",
            (owner_user_id, villa_id),
        )
        if cursor.rowcount != 1:
            raise RuntimeError("Villa gagal ditautkan ke akun Owner.")

        note_param = admin_note if admin_note else None
        cursor.execute(
            """
            UPDATE owner_registration_requests
            SET status='Disetujui', password_hash='', admin_note=%s, processed_by=%s,
                processed_at=CURRENT_TIMESTAMP
            WHERE id=%s AND status='Menunggu'
            """,
            (note_param, admin_id, registration_id),
        )
        if cursor.rowcount != 1:
            raise RuntimeError("Status pendaftaran gagal diperbarui.")

        conn.commit()
        return jsonify({
            "status": "success",
            "message": "Akun Owner dibuat dan berhasil ditautkan ke villa.",
            "registration_id": registration_id,
            "owner_user_id": owner_user_id,
        }), 200
    except Exception as error:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        print("[OWNER REGISTRATION APPROVE]", error)
        return jsonify({
            "status": "error",
            "error": "Pendaftaran belum dapat disetujui. Silakan coba lagi.",
        }), 500
    finally:
        _close(cursor, conn)


@owner_registration_bp.route(
    "/api/admin/owner-registrations/<int:registration_id>/reject",
    methods=["PUT"],
)
def reject_owner_registration(registration_id: int):
    conn = cursor = None
    admin_id = _admin_id_from_token()
    if not admin_id:
        return jsonify({"status": "error", "error": "Admin tidak terautentikasi."}), 401
    try:
        data = request.get_json(silent=True) or {}
        admin_note = str(data.get("admin_note", "") or "").strip()
        if not admin_note:
            return jsonify({"status": "error", "error": "Alasan penolakan wajib diisi."}), 400
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if not _validate_admin(cursor, admin_id):
            return jsonify({"status": "error", "error": "User bukan Admin."}), 403
        cursor.execute(
            """
            UPDATE owner_registration_requests
            SET status='Ditolak', password_hash='', admin_note=%s, processed_by=%s,
                processed_at=CURRENT_TIMESTAMP
            WHERE id=%s AND status='Menunggu'
            """,
            (admin_note, admin_id, registration_id),
        )
        if cursor.rowcount != 1:
            conn.rollback()
            return jsonify({"status": "error", "error": "Pendaftaran tidak ditemukan atau sudah diproses."}), 409
        conn.commit()
        return jsonify({"status": "success", "message": "Pendaftaran ditolak."}), 200
    except Exception as error:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        print("[OWNER REGISTRATION REJECT]", error)
        return jsonify({"status": "error", "error": "Pendaftaran belum dapat ditolak. Silakan coba lagi."}), 500
    finally:
        _close(cursor, conn)