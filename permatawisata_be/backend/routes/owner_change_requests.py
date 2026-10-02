from flask import Blueprint, jsonify, request
from db import get_db_connection
from datetime import datetime
import json
import os

try:
    import jwt
except ImportError:
    jwt = None

owner_change_requests_bp = Blueprint("owner_change_requests_bp", __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "jogjavilla_admin_secret_key_2026_x89!")
JWT_ALGORITHM = "HS256"
PENDING = "Menunggu"
REQUEST_TYPES = {
    "price", "capacity", "facility", "villa_info", "photo",
    "add_unit", "edit_unit", "remove_unit", "addon"
}
REQUEST_STATUSES = {"Menunggu", "Disetujui", "Ditolak", "Dibatalkan"}
VILLA_FIELDS = {
    "name", "location", "type", "guests", "beds", "baths", "bed_type",
    "check_in_time", "check_out_time", "room_count", "bathroom_type",
    "hours", "description", "amenities", "equipment", "facilities"
}
UNIT_FIELDS = {
    "max_guests", "max_age_rule", "bed_info", "facilities", "other_facilities",
    "img", "room_type", "price", "description", "snk", "room_count",
    "bathroom_count", "bathroom_type", "amenities", "equipment", "hours",
    "location", "status"
}


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


def _json_dump(value):
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False)


def _json_load(value):
    if value is None or isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (TypeError, ValueError):
            return value
    return value


def _user_id_from_jwt(expected_role):
    if jwt is None:
        return None
    auth = request.headers.get("Authorization", "").strip()
    if not auth.lower().startswith("bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        role = str(payload.get("role", "")).strip().lower()
        if role != expected_role:
            return None
        value = payload.get("user_id", payload.get("id"))
        value = int(value)
        return value if value > 0 else None
    except Exception:
        return None


def _get_owner_user_id():
    value = _user_id_from_jwt("owner")
    if value:
        return value
    # Kompatibilitas development dengan Owner Dashboard/Availability saat ini.
    raw = request.headers.get("X-Owner-User-Id")
    try:
        value = int(raw)
        return value if value > 0 else None
    except (TypeError, ValueError):
        return None


def _get_admin_user_id():
    value = _user_id_from_jwt("admin")
    if value:
        return value
    raw = request.headers.get("X-Admin-User-Id")
    try:
        value = int(raw)
        return value if value > 0 else None
    except (TypeError, ValueError):
        return None


def _validate_role(cursor, user_id, role):
    cursor.execute(
        "SELECT id, username, role FROM users WHERE id=%s LIMIT 1",
        (user_id,)
    )
    user = cursor.fetchone()
    if not user or str(user.get("role", "")).strip().lower() != role:
        return None
    return user


def _get_owner_villa(cursor, owner_user_id, villa_id):
    cursor.execute(
        """
        SELECT id, name, owner_user_id
        FROM villas
        WHERE id=%s AND owner_user_id=%s
        LIMIT 1
        """,
        (villa_id, owner_user_id),
    )
    return cursor.fetchone()


def _get_owner_unit(cursor, owner_user_id, villa_detail_id, villa_id=None):
    sql = """
        SELECT vd.*
        FROM villa_details vd
        INNER JOIN villas v ON vd.villa_id=v.id
        WHERE vd.id=%s AND v.owner_user_id=%s
    """
    params = [villa_detail_id, owner_user_id]
    if villa_id is not None:
        sql += " AND vd.villa_id=%s"
        params.append(villa_id)
    sql += " LIMIT 1"
    cursor.execute(sql, tuple(params))
    return cursor.fetchone()


def _positive_int(value):
    try:
        value = int(value)
        return value if value > 0 else None
    except (TypeError, ValueError):
        return None


def _format_dates(row):
    for key in ("created_at", "processed_at"):
        if isinstance(row.get(key), datetime):
            row[key] = row[key].strftime("%Y-%m-%d %H:%M:%S")
    row["old_data"] = _json_load(row.get("old_data"))
    row["new_data"] = _json_load(row.get("new_data"))
    return row


def _update_villa_field(cursor, villa_id, field, value):
    if field not in VILLA_FIELDS:
        raise ValueError(f"Field villa '{field}' tidak diizinkan.")
    cursor.execute(f"UPDATE villas SET {field}=%s WHERE id=%s LIMIT 1", (value, villa_id))


def _update_unit_field(cursor, villa_detail_id, field, value):
    if field not in UNIT_FIELDS:
        raise ValueError(f"Field unit '{field}' tidak diizinkan.")
    cursor.execute(f"UPDATE villa_details SET {field}=%s WHERE id=%s LIMIT 1", (value, villa_detail_id))


def _apply_request(cursor, row):
    request_type = str(row["request_type"]).strip().lower()
    villa_id = row["villa_id"]
    detail_id = row.get("villa_detail_id")
    data = _json_load(row.get("new_data")) or {}
    if not isinstance(data, dict):
        raise ValueError("new_data harus berupa object JSON.")

    if request_type == "price":
        price = float(data.get("price"))
        if price < 0:
            raise ValueError("Harga tidak boleh negatif.")
        cursor.execute("UPDATE villas SET price=%s WHERE id=%s LIMIT 1", (price, villa_id))
        return {"target": "villas", "field": "price", "value": price}

    if request_type == "capacity":
        value = data.get("capacity", data.get("guests"))
        if value is None or str(value).strip() == "":
            raise ValueError("Kapasitas baru wajib diisi.")
        if str(data.get("target", "villa")).lower() == "unit":
            if not detail_id:
                raise ValueError("villa_detail_id diperlukan untuk kapasitas unit.")
            _update_unit_field(cursor, detail_id, "max_guests", str(value).strip())
            return {"target": "villa_details", "field": "max_guests", "value": value}
        _update_villa_field(cursor, villa_id, "guests", str(value).strip())
        return {"target": "villas", "field": "guests", "value": value}

    if request_type == "facility":
        field = str(data.get("field", "facilities")).strip()
        value = data.get("value")
        if value is None:
            raise ValueError("Nilai fasilitas wajib diisi.")
        if str(data.get("target", "villa")).lower() == "unit":
            if not detail_id:
                raise ValueError("villa_detail_id diperlukan untuk fasilitas unit.")
            _update_unit_field(cursor, detail_id, field, value)
            return {"target": "villa_details", "field": field, "value": value}
        _update_villa_field(cursor, villa_id, field, value)
        return {"target": "villas", "field": field, "value": value}

    if request_type == "villa_info":
        updates = data.get("updates")
        if not isinstance(updates, dict) or not updates:
            raise ValueError("villa_info membutuhkan object 'updates'.")
        for field, value in updates.items():
            _update_villa_field(cursor, villa_id, field, value)
        return {"target": "villas", "updates": updates}

    if request_type == "photo":
        image = data.get("image", data.get("img"))
        if image is None:
            raise ValueError("Data foto wajib diisi.")
        if str(data.get("target", "villa")).lower() == "unit":
            if not detail_id:
                raise ValueError("villa_detail_id diperlukan untuk foto unit.")
            _update_unit_field(cursor, detail_id, "img", image)
            return {"target": "villa_details", "field": "img"}
        cursor.execute("UPDATE villas SET img=%s WHERE id=%s LIMIT 1", (image, villa_id))
        return {"target": "villas", "field": "img"}

    if request_type == "add_unit":
        allowed = [
            "max_guests", "max_age_rule", "bed_info", "facilities", "other_facilities",
            "img", "room_type", "price", "description", "snk", "room_count",
            "bathroom_count", "bathroom_type", "amenities", "equipment", "hours",
            "location", "status"
        ]
        columns = ["villa_id"]
        values = [villa_id]
        for field in allowed:
            if field in data:
                columns.append(field)
                values.append(data[field])
        if "status" not in data:
            columns.append("status")
            values.append("active")
        placeholders = ",".join(["%s"] * len(values))
        cursor.execute(
            f"INSERT INTO villa_details ({','.join(columns)}) VALUES ({placeholders})",
            tuple(values),
        )
        return {"target": "villa_details", "created_unit_id": cursor.lastrowid}

    if request_type == "edit_unit":
        if not detail_id:
            raise ValueError("villa_detail_id diperlukan untuk edit_unit.")
        updates = data.get("updates")
        if not isinstance(updates, dict) or not updates:
            raise ValueError("edit_unit membutuhkan object 'updates'.")
        for field, value in updates.items():
            _update_unit_field(cursor, detail_id, field, value)
        return {"target": "villa_details", "updates": updates}

    if request_type == "remove_unit":
        if not detail_id:
            raise ValueError("villa_detail_id diperlukan untuk remove_unit.")
        cursor.execute("UPDATE villa_details SET status='inactive' WHERE id=%s LIMIT 1", (detail_id,))
        return {"target": "villa_details", "field": "status", "value": "inactive"}

    if request_type == "addon":
        if not detail_id:
            raise ValueError("villa_detail_id diperlukan untuk addon.")
        name = str(data.get("name", "")).strip()
        if not name:
            raise ValueError("Nama layanan tambahan wajib diisi.")
        try:
            price = int(float(data.get("price", 0)))
        except (TypeError, ValueError):
            raise ValueError("Harga layanan tambahan harus berupa angka.")
        if price < 0:
            raise ValueError("Harga layanan tambahan tidak boleh negatif.")
        cursor.execute(
            """
            INSERT INTO room_addons (room_id, addon_type, name, price, description, image)
            VALUES (%s,%s,%s,%s,%s,%s)
            """,
            (
                detail_id,
                str(data.get("addon_type", "Layanan")).strip(),
                name,
                price,
                data.get("description"),
                data.get("image"),
            ),
        )
        return {"target": "room_addons", "created_addon_id": cursor.lastrowid}

    raise ValueError(f"request_type '{request_type}' belum didukung.")


@owner_change_requests_bp.route("/api/owner/change-requests", methods=["POST"])
def create_change_request():
    conn = cursor = None
    try:
        owner_id = _get_owner_user_id()
        if not owner_id:
            return jsonify({"status": "error", "error": "Owner tidak terautentikasi."}), 401
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({"status": "error", "error": "Body JSON tidak valid."}), 400

        request_type = str(data.get("request_type", "")).strip().lower()
        villa_id = _positive_int(data.get("villa_id"))
        detail_raw = data.get("villa_detail_id")
        detail_id = None if detail_raw in (None, "", "null") else _positive_int(detail_raw)
        new_data = data.get("new_data") or {}
        old_data = data.get("old_data")

        if request_type not in REQUEST_TYPES:
            return jsonify({"status": "error", "error": "request_type tidak valid."}), 400
        if not villa_id:
            return jsonify({"status": "error", "error": "villa_id wajib diisi."}), 400
        if not isinstance(new_data, dict):
            return jsonify({"status": "error", "error": "new_data harus berupa object JSON."}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if not _validate_role(cursor, owner_id, "owner"):
            return jsonify({"status": "error", "error": "User bukan Owner."}), 403
        if not _get_owner_villa(cursor, owner_id, villa_id):
            return jsonify({"status": "error", "error": "Villa bukan milik Owner ini."}), 403
        if detail_id is not None and not _get_owner_unit(cursor, owner_id, detail_id, villa_id):
            return jsonify({"status": "error", "error": "Unit bukan milik villa Owner ini."}), 403

        cursor.execute(
            """
            SELECT id FROM owner_change_requests
            WHERE owner_user_id=%s AND villa_id=%s
              AND ((villa_detail_id=%s) OR (villa_detail_id IS NULL AND %s IS NULL))
              AND request_type=%s AND status='Menunggu'
            LIMIT 1
            """,
            (owner_id, villa_id, detail_id, detail_id, request_type),
        )
        if cursor.fetchone():
            return jsonify({"status": "error", "error": "Request sejenis masih menunggu diproses Admin."}), 409

        cursor.execute(
            """
            INSERT INTO owner_change_requests
            (owner_user_id,villa_id,villa_detail_id,request_type,old_data,new_data,reason,status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,'Menunggu')
            """,
            (owner_id, villa_id, detail_id, request_type, _json_dump(old_data), _json_dump(new_data), data.get("reason")),
        )
        request_id = cursor.lastrowid
        conn.commit()
        return jsonify({
            "status": "success",
            "message": "Permintaan perubahan berhasil dikirim.",
            "request_id": request_id,
            "request_status": PENDING,
        }), 201
    except Exception as e:
        if conn:
            try: conn.rollback()
            except Exception: pass
        print("[OWNER CHANGE REQUEST CREATE]", e)
        return jsonify({"status": "error", "error": str(e)}), 500
    finally:
        _close(cursor, conn)


@owner_change_requests_bp.route("/api/owner/change-requests", methods=["GET"])
def get_owner_change_requests():
    conn = cursor = None
    try:
        owner_id = _get_owner_user_id()
        if not owner_id:
            return jsonify({"status": "error", "error": "Owner tidak terautentikasi."}), 401
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if not _validate_role(cursor, owner_id, "owner"):
            return jsonify({"status": "error", "error": "User bukan Owner."}), 403
        status = request.args.get("status")
        if status and status not in REQUEST_STATUSES:
            return jsonify({"status": "error", "error": "Status tidak valid."}), 400
        limit = _positive_int(request.args.get("limit", 50)) or 50
        limit = min(limit, 100)
        sql = """
            SELECT r.*, v.name AS villa_name
            FROM owner_change_requests r
            INNER JOIN villas v ON r.villa_id=v.id
            WHERE r.owner_user_id=%s
        """
        params = [owner_id]
        if status:
            sql += " AND r.status=%s"
            params.append(status)
        sql += f" ORDER BY r.created_at DESC LIMIT {limit}"
        cursor.execute(sql, tuple(params))
        rows = [_format_dates(row) for row in cursor.fetchall()]
        return jsonify({"status": "success", "requests": rows}), 200
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500
    finally:
        _close(cursor, conn)


@owner_change_requests_bp.route("/api/owner/change-requests/<int:request_id>/cancel", methods=["PUT"])
def cancel_change_request(request_id):
    conn = cursor = None
    try:
        owner_id = _get_owner_user_id()
        if not owner_id:
            return jsonify({"status": "error", "error": "Owner tidak terautentikasi."}), 401
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if not _validate_role(cursor, owner_id, "owner"):
            return jsonify({"status": "error", "error": "User bukan Owner."}), 403
        cursor.execute(
            "SELECT id,status FROM owner_change_requests WHERE id=%s AND owner_user_id=%s LIMIT 1",
            (request_id, owner_id),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"status": "error", "error": "Request tidak ditemukan."}), 404
        if row["status"] != PENDING:
            return jsonify({"status": "error", "error": "Request sudah diproses dan tidak dapat dibatalkan."}), 409
        cursor.execute(
            "UPDATE owner_change_requests SET status='Dibatalkan',processed_at=CURRENT_TIMESTAMP WHERE id=%s AND owner_user_id=%s AND status='Menunggu' LIMIT 1",
            (request_id, owner_id),
        )
        conn.commit()
        return jsonify({"status": "success", "message": "Request dibatalkan."}), 200
    except Exception as e:
        if conn:
            try: conn.rollback()
            except Exception: pass
        return jsonify({"status": "error", "error": str(e)}), 500
    finally:
        _close(cursor, conn)


@owner_change_requests_bp.route("/api/owner/villa-details/<int:villa_detail_id>/status", methods=["PUT"])
def update_unit_status(villa_detail_id):
    conn = cursor = None
    try:
        owner_id = _get_owner_user_id()
        if not owner_id:
            return jsonify({"status": "error", "error": "Owner tidak terautentikasi."}), 401
        data = request.get_json(silent=True) or {}
        status = str(data.get("status", "")).strip().lower()
        if status not in {"active", "inactive"}:
            return jsonify({"status": "error", "error": "Status harus active atau inactive."}), 400
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if not _validate_role(cursor, owner_id, "owner"):
            return jsonify({"status": "error", "error": "User bukan Owner."}), 403
        cursor.execute(
            """
            SELECT vd.id,vd.villa_id,v.name AS villa_name
            FROM villa_details vd INNER JOIN villas v ON vd.villa_id=v.id
            WHERE vd.id=%s AND v.owner_user_id=%s LIMIT 1
            """,
            (villa_detail_id, owner_id),
        )
        unit = cursor.fetchone()
        if not unit:
            return jsonify({"status": "error", "error": "Unit bukan milik Owner ini."}), 404
        cursor.execute("UPDATE villa_details SET status=%s WHERE id=%s LIMIT 1", (status, villa_detail_id))
        conn.commit()
        return jsonify({"status": "success", "villa_detail_id": villa_detail_id, "unit_status": status}), 200
    except Exception as e:
        if conn:
            try: conn.rollback()
            except Exception: pass
        return jsonify({"status": "error", "error": str(e)}), 500
    finally:
        _close(cursor, conn)


@owner_change_requests_bp.route("/api/admin/change-requests", methods=["GET"])
def get_admin_change_requests():
    conn = cursor = None
    try:
        admin_id = _get_admin_user_id()
        if not admin_id:
            return jsonify({"status": "error", "error": "Admin tidak terautentikasi."}), 401
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if not _validate_role(cursor, admin_id, "admin"):
            return jsonify({"status": "error", "error": "User bukan Admin."}), 403
        status = request.args.get("status")
        request_type = request.args.get("request_type")
        if status and status not in REQUEST_STATUSES:
            return jsonify({"status": "error", "error": "Status tidak valid."}), 400
        if request_type and request_type.strip().lower() not in REQUEST_TYPES:
            return jsonify({"status": "error", "error": "request_type tidak valid."}), 400
        limit = _positive_int(request.args.get("limit", 100)) or 100
        limit = min(limit, 200)
        conditions = []
        params = []
        if status:
            conditions.append("r.status=%s")
            params.append(status)
        if request_type:
            conditions.append("r.request_type=%s")
            params.append(request_type.strip().lower())
        where = (" WHERE " + " AND ".join(conditions)) if conditions else ""
        sql = f"""
            SELECT r.*,u.username AS owner_username,v.name AS villa_name,
                   pu.username AS processed_by_username
            FROM owner_change_requests r
            INNER JOIN users u ON r.owner_user_id=u.id
            INNER JOIN villas v ON r.villa_id=v.id
            LEFT JOIN users pu ON r.processed_by=pu.id
            {where}
            ORDER BY CASE WHEN r.status='Menunggu' THEN 0 ELSE 1 END,r.created_at DESC
            LIMIT {limit}
        """
        cursor.execute(sql, tuple(params))
        rows = [_format_dates(row) for row in cursor.fetchall()]
        return jsonify({"status": "success", "requests": rows}), 200
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500
    finally:
        _close(cursor, conn)


@owner_change_requests_bp.route("/api/admin/change-requests/<int:request_id>/approve", methods=["PUT"])
def approve_change_request(request_id):
    conn = cursor = None
    try:
        admin_id = _get_admin_user_id()
        if not admin_id:
            return jsonify({"status": "error", "error": "Admin tidak terautentikasi."}), 401
        data = request.get_json(silent=True) or {}
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if not _validate_role(cursor, admin_id, "admin"):
            return jsonify({"status": "error", "error": "User bukan Admin."}), 403
        cursor.execute(
            """
            SELECT id,owner_user_id,villa_id,villa_detail_id,request_type,old_data,new_data,status
            FROM owner_change_requests WHERE id=%s LIMIT 1 FOR UPDATE
            """,
            (request_id,),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"status": "error", "error": "Request tidak ditemukan."}), 404
        if row["status"] != PENDING:
            return jsonify({"status": "error", "error": "Request sudah diproses.", "current_status": row["status"]}), 409
        if not _get_owner_villa(cursor, row["owner_user_id"], row["villa_id"]):
            return jsonify({"status": "error", "error": "Relasi Owner dan villa sudah tidak valid."}), 409
        applied = _apply_request(cursor, row)
        cursor.execute(
            """
            UPDATE owner_change_requests
            SET status='Disetujui',admin_note=%s,processed_by=%s,processed_at=CURRENT_TIMESTAMP
            WHERE id=%s AND status='Menunggu' LIMIT 1
            """,
            (data.get("admin_note"), admin_id, request_id),
        )
        conn.commit()
        return jsonify({"status": "success", "message": "Request disetujui dan perubahan diterapkan.", "request_id": request_id, "applied": applied}), 200
    except ValueError as e:
        if conn:
            try: conn.rollback()
            except Exception: pass
        return jsonify({"status": "error", "error": str(e)}), 400
    except Exception as e:
        if conn:
            try: conn.rollback()
            except Exception: pass
        print("[ADMIN CHANGE REQUEST APPROVE]", e)
        return jsonify({"status": "error", "error": str(e)}), 500
    finally:
        _close(cursor, conn)


@owner_change_requests_bp.route("/api/admin/change-requests/<int:request_id>/reject", methods=["PUT"])
def reject_change_request(request_id):
    conn = cursor = None
    try:
        admin_id = _get_admin_user_id()
        if not admin_id:
            return jsonify({"status": "error", "error": "Admin tidak terautentikasi."}), 401
        data = request.get_json(silent=True) or {}
        note = str(data.get("admin_note", "")).strip()
        if not note:
            return jsonify({"status": "error", "error": "Alasan penolakan wajib diisi."}), 400
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        if not _validate_role(cursor, admin_id, "admin"):
            return jsonify({"status": "error", "error": "User bukan Admin."}), 403
        cursor.execute("SELECT id,status FROM owner_change_requests WHERE id=%s LIMIT 1 FOR UPDATE", (request_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"status": "error", "error": "Request tidak ditemukan."}), 404
        if row["status"] != PENDING:
            return jsonify({"status": "error", "error": "Request sudah diproses.", "current_status": row["status"]}), 409
        cursor.execute(
            """
            UPDATE owner_change_requests
            SET status='Ditolak',admin_note=%s,processed_by=%s,processed_at=CURRENT_TIMESTAMP
            WHERE id=%s AND status='Menunggu' LIMIT 1
            """,
            (note, admin_id, request_id),
        )
        conn.commit()
        return jsonify({"status": "success", "message": "Request ditolak.", "request_id": request_id}), 200
    except Exception as e:
        if conn:
            try: conn.rollback()
            except Exception: pass
        return jsonify({"status": "error", "error": str(e)}), 500
    finally:
        _close(cursor, conn)
