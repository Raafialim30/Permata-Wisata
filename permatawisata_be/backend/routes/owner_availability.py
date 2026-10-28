import re
from datetime import datetime, date, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple
from flask import Blueprint, jsonify, request
from db import get_db_connection
from security import get_user_id_from_request


owner_availability_bp = Blueprint(
    "owner_availability_bp",
    __name__
)


# =========================================================
# HELPER KONVERSI & KONEKSI
# =========================================================

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


def _get_owner_user_id():
    return get_user_id_from_request("owner")


def _to_date(val: Any) -> Optional[date]:
    """Mengubah berbagai tipe data tanggal/datetime menjadi objek datetime.date yang valid."""
    if val is None:
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    if hasattr(val, "date") and callable(getattr(val, "date")):
        try:
            d = getattr(val, "date")()
            if isinstance(d, date):
                return d
        except Exception:
            pass
    if isinstance(val, str):
        try:
            return datetime.strptime(val[:10], "%Y-%m-%d").date()
        except Exception:
            pass
    return None


# =========================================================
# VALIDASI OWNER
# =========================================================

def _validate_owner(cursor, owner_user_id) -> Optional[Dict[str, Any]]:
    cursor.execute(
        """
        SELECT id, username, role
        FROM users
        WHERE id = %s
        LIMIT 1
        """,
        (owner_user_id,)
    )

    owner = cursor.fetchone()

    if not owner or not isinstance(owner, dict):
        return None

    role = owner.get("role")
    if not role or f"{role}".strip().lower() != "owner":
        return None

    return owner


# =========================================================
# VALIDASI VILLA MILIK OWNER
# =========================================================

def _get_owner_villa(cursor, owner_user_id, villa_id) -> Optional[Dict[str, Any]]:
    cursor.execute(
        """
        SELECT id, name, location, status, price, owner_user_id
        FROM villas
        WHERE id = %s AND owner_user_id = %s
        LIMIT 1
        """,
        (villa_id, owner_user_id)
    )

    res = cursor.fetchone()
    return res if isinstance(res, dict) else None


# =========================================================
# HELPER NILAI FIELD
# =========================================================

def _first_value(row: Dict[str, Any], candidates: List[str], default: Any = None) -> Any:
    if not isinstance(row, dict):
        return default

    for key in candidates:
        if key in row and row[key] is not None:
            return row[key]

    return default


# =========================================================
# NORMALISASI VILLA DETAIL
# =========================================================

def _clean_room_text(value: Any) -> str:
    """Membersihkan teks nama kamar dari prefix/sisa kurung."""
    if value is None:
        return ""

    text = f"{value}".strip()
    text = re.sub(r"^kamar\s*:\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^unit\s*:\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip()

    return text


def _parse_bed_info(bed_info: Any) -> Tuple[str, str]:
    """Mengubah 'Kamar: Nama (Tipe)' menjadi nama + tipe."""
    full_text = _clean_room_text(bed_info)

    if not full_text:
        return "", ""

    match = re.match(r"^(.*?)\s*\((.*)\)\s*$", full_text)

    if not match:
        return full_text, ""

    room_name = match.group(1).strip()
    room_type = match.group(2).strip()

    while room_type.startswith("("):
        room_type = room_type[1:].strip()

    while room_type.endswith(")"):
        room_type = room_type[:-1].strip()

    room_name = re.sub(r"\s+", " ", room_name)
    room_type = re.sub(r"\s+", " ", room_type)

    return room_name, room_type


def _normalize_villa_detail(row: Dict[str, Any]) -> Dict[str, Any]:
    """Normalisasi villa_details sesuai struktur SQL yang digunakan."""
    if not isinstance(row, dict):
        row = {}

    unit_id = row.get("id")
    villa_id = row.get("villa_id")

    bed_info_raw = row.get("bed_info")
    parsed_name, parsed_type = _parse_bed_info(bed_info_raw)

    raw_name = _first_value(
        row,
        [
            "name",
            "nama",
            "nama_unit",
            "unit_name",
            "room_name",
            "room",
            "title",
            "detail_name"
        ]
    )

    if parsed_name:
        name = parsed_name
    elif raw_name:
        name = _clean_room_text(raw_name)
    else:
        name = f"Unit {unit_id}"

    database_room_type = row.get("room_type")
    if database_room_type is not None and f"{database_room_type}".strip() != "":
        room_type = f"{database_room_type}".strip()
    else:
        room_type = parsed_type

    image = _first_value(
        row,
        [
            "img",
            "image",
            "image_url",
            "villa_image",
            "room_image",
            "photo",
            "foto",
            "gambar",
            "thumbnail"
        ]
    )

    description = row.get("description") or ""
    facilities = row.get("facilities") or ""

    price = row.get("price")
    capacity = row.get("max_guests")

    clean_bed_info = f"{bed_info_raw}".strip() if bed_info_raw else ""

    return {
        "id": unit_id,
        "villa_id": villa_id,
        "name": name,
        "room_name": name,
        "room_type": room_type,
        "bed_info": clean_bed_info,
        "image": image,
        "img": image,
        "description": f"{description}".strip(),
        "facilities": facilities,
        "price": price,
        "capacity": capacity,
        "max_guests": capacity,
        "status": row.get("status") or "active"
    }


# =========================================================
# 1. DAFTAR VILLA OWNER
# =========================================================

@owner_availability_bp.route(
    "/api/owner/villas-list",
    methods=["GET"]
)
def get_owner_villas():
    conn = None
    cursor = None

    try:
        owner_user_id = _get_owner_user_id()

        if not owner_user_id:
            return jsonify({
                "status": "error",
                "error": "Token Owner tidak valid atau user owner belum ditemukan."
            }), 401

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        owner = _validate_owner(cursor, owner_user_id)

        if not owner:
            return jsonify({
                "status": "error",
                "error": "Owner tidak valid."
            }), 403

        cursor.execute(
            """
            SELECT id, name, location, status, price, owner_user_id
            FROM villas
            WHERE owner_user_id = %s
            ORDER BY id ASC
            """,
            (owner_user_id,)
        )

        villas = cursor.fetchall() or []

        return jsonify({
            "status": "success",
            "owner_user_id": owner_user_id,
            "data": villas
        }), 200

    except Exception as e:
        print(f"Owner Villas Error: {e}")

        return jsonify({
            "status": "error",
            "error": f"{e}"
        }), 500

    finally:
        _close(cursor, conn)


# =========================================================
# 2. DAFTAR UNIT DALAM VILLA
# =========================================================

@owner_availability_bp.route(
    "/api/owner/villa-details",
    methods=["GET"]
)
def get_owner_villa_details():
    conn = None
    cursor = None

    try:
        owner_user_id = _get_owner_user_id()

        if not owner_user_id:
            return jsonify({
                "status": "error",
                "error": "Owner belum terautentikasi."
            }), 401

        villa_id_raw = request.args.get("villa_id")

        if not villa_id_raw:
            return jsonify({
                "status": "error",
                "error": "villa_id wajib diisi."
            }), 400

        try:
            villa_id = int(villa_id_raw)
        except (TypeError, ValueError):
            return jsonify({
                "status": "error",
                "error": "villa_id tidak valid."
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        owner = _validate_owner(cursor, owner_user_id)

        if not owner:
            return jsonify({
                "status": "error",
                "error": "Owner tidak valid."
            }), 403

        villa = _get_owner_villa(cursor, owner_user_id, villa_id)

        if not villa:
            return jsonify({
                "status": "error",
                "error": "Villa tidak ditemukan atau bukan milik Owner ini."
            }), 403

        cursor.execute(
            """
            SELECT
                id, villa_id, max_guests, facilities, img,
                room_type, price, description, bed_info, status
            FROM villa_details
            WHERE villa_id = %s
              AND (status = 'active' OR status IS NULL OR status = '')
            ORDER BY id ASC
            """,
            (villa_id,)
        )

        rows = cursor.fetchall() or []
        details = [_normalize_villa_detail(row) for row in rows if isinstance(row, dict)]

        return jsonify({
            "status": "success",
            "owner_user_id": owner_user_id,
            "villa_id": villa_id,
            "villa_name": villa.get("name"),
            "data": details
        }), 200

    except Exception as e:
        print(f"Owner Villa Details Error: {e}")

        return jsonify({
            "status": "error",
            "error": f"{e}"
        }), 500

    finally:
        _close(cursor, conn)


# =========================================================
# 3. BOOKED DATES PER UNIT
# =========================================================

@owner_availability_bp.route(
    "/api/owner/booked-dates",
    methods=["GET"]
)
def get_booked_dates():
    conn = None
    cursor = None

    try:
        owner_user_id = _get_owner_user_id()

        if not owner_user_id:
            return jsonify({
                "status": "error",
                "error": "Token Owner tidak valid atau sudah kadaluarsa."
            }), 401

        villa_id_raw = request.args.get("villa_id")
        villa_detail_id_raw = request.args.get("villa_detail_id")
        month_raw = request.args.get("month")
        year_raw = request.args.get("year")

        if (
            villa_id_raw is None
            or villa_detail_id_raw is None
            or month_raw is None
            or year_raw is None
        ):
            return jsonify({
                "status": "error",
                "error": "villa_id, villa_detail_id, month dan year wajib diisi."
            }), 400

        try:
            villa_id = int(villa_id_raw)
            villa_detail_id = int(villa_detail_id_raw)
            month_input = int(month_raw)
            year = int(year_raw)
        except (TypeError, ValueError):
            return jsonify({
                "status": "error",
                "error": "villa_id, villa_detail_id, month atau year tidak valid."
            }), 400

        if 0 <= month_input <= 11:
            month = month_input + 1
        elif 1 <= month_input <= 12:
            month = month_input
        else:
            return jsonify({
                "status": "error",
                "error": "Bulan tidak valid."
            }), 400

        if year < 2000 or year > 2100:
            return jsonify({
                "status": "error",
                "error": "Tahun tidak valid."
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        owner = _validate_owner(cursor, owner_user_id)

        if not owner:
            return jsonify({
                "status": "error",
                "error": "Owner tidak valid."
            }), 403

        villa = _get_owner_villa(cursor, owner_user_id, villa_id)

        if not villa:
            return jsonify({
                "status": "error",
                "error": "Villa tidak ditemukan atau bukan milik Owner ini."
            }), 403

        cursor.execute(
            """
            SELECT id, villa_id
            FROM villa_details
            WHERE id = %s AND villa_id = %s
            LIMIT 1
            """,
            (villa_detail_id, villa_id)
        )

        villa_detail = cursor.fetchone()

        if not villa_detail:
            return jsonify({
                "status": "error",
                "error": "Unit tidak ditemukan atau bukan bagian dari villa ini."
            }), 404

        first_day = date(year, month, 1)

        if month == 12:
            next_month = date(year + 1, 1, 1)
        else:
            next_month = date(year, month + 1, 1)

        last_day = next_month - timedelta(days=1)

        cursor.execute(
            """
            SELECT id, villa_id, villa_detail_id, check_in, check_out, status
            FROM bookings
            WHERE villa_id = %s
              AND villa_detail_id = %s
              AND status IN (
                  'Menunggu Pembayaran',
                  'Menunggu Verifikasi',
                  'Lunas'
              )
              AND check_in <= %s
              AND check_out >= %s
            ORDER BY check_in ASC
            """,
            (villa_id, villa_detail_id, last_day, first_day)
        )

        unit_bookings = cursor.fetchall() or []

        cursor.execute(
            """
            SELECT id, villa_id, villa_detail_id, check_in, check_out, status
            FROM bookings
            WHERE villa_id = %s
              AND villa_detail_id IS NULL
              AND status IN (
                  'Menunggu Pembayaran',
                  'Menunggu Verifikasi',
                  'Lunas'
              )
              AND check_in <= %s
              AND check_out >= %s
            ORDER BY check_in ASC
            """,
            (villa_id, last_day, first_day)
        )

        legacy_bookings = cursor.fetchall() or []

        booked_days: Set[int] = set()

        for booking in unit_bookings:
            if not isinstance(booking, dict):
                continue

            curr = _to_date(booking.get("check_in"))
            end = _to_date(booking.get("check_out"))

            if not curr or not end or curr > end:
                continue

            while curr < end:
                if curr.month == month and curr.year == year:
                    booked_days.add(curr.day)
                curr += timedelta(days=1)

        legacy_days: Set[int] = set()

        for booking in legacy_bookings:
            if not isinstance(booking, dict):
                continue

            curr = _to_date(booking.get("check_in"))
            end = _to_date(booking.get("check_out"))

            if not curr or not end or curr > end:
                continue

            while curr < end:
                if curr.month == month and curr.year == year:
                    legacy_days.add(curr.day)
                curr += timedelta(days=1)

        all_booked_days = sorted(list(booked_days | legacy_days))

        return jsonify({
            "status": "success",
            "owner_user_id": owner_user_id,
            "villa_id": villa_id,
            "villa_detail_id": villa_detail_id,
            "villa_name": villa.get("name"),
            "month": month,
            "year": year,
            "booked_dates": all_booked_days,
            "unit_booked_dates": sorted(list(booked_days)),
            "legacy_booked_dates": sorted(list(legacy_days))
        }), 200

    except Exception as e:
        print(f"Owner Availability Error: {e}")

        return jsonify({
            "status": "error",
            "error": f"{e}"
        }), 500

    finally:
        _close(cursor, conn)


# =========================================================
# EXPORT
# =========================================================

export = owner_availability_bp