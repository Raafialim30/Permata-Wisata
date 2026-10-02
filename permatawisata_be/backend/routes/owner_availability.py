from flask import Blueprint, jsonify, request
from db import get_db_connection

from datetime import timedelta, date
import os
import re


owner_availability_bp = Blueprint(
    "owner_availability_bp",
    __name__
)


# =========================================================
# OPTIONAL JWT
# =========================================================
#
# Jika PyJWT tersedia, sistem bisa membaca JWT.
# Jika tidak tersedia, sistem tetap dapat menggunakan
# X-Owner-User-Id untuk development.
# =========================================================

try:
    import jwt
except ImportError:
    jwt = None


JWT_SECRET = os.getenv(
    "JWT_SECRET",
    "jogjavilla_admin_secret_key_2026_x89!"
)

JWT_ALGORITHM = "HS256"


# =========================================================
# HELPER
# =========================================================

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


# =========================================================
# AMBIL OWNER USER ID
# =========================================================
#
# Prioritas:
#
# 1. JWT jika tersedia dan valid
# 2. X-Owner-User-Id
# 3. dummy_token_user_X
#
# X-Owner-User-Id dipertahankan karena frontend Anda
# memang mengirim header tersebut.
# =========================================================

def _get_owner_user_id():

    # -----------------------------------------------------
    # 1. JWT
    # -----------------------------------------------------

    authorization = request.headers.get(
        "Authorization",
        ""
    ).strip()

    if (
        authorization
        and authorization.lower().startswith("bearer ")
    ):

        token = authorization.split(
            " ",
            1
        )[1].strip()

        if token:

            # ---------------------------------------------
            # JWT sungguhan
            # ---------------------------------------------

            if jwt is not None:

                try:

                    payload = jwt.decode(
                        token,
                        JWT_SECRET,
                        algorithms=[JWT_ALGORITHM]
                    )

                    role = str(
                        payload.get(
                            "role",
                            ""
                        )
                    ).strip().lower()

                    if role == "owner":

                        user_id = payload.get(
                            "user_id",
                            payload.get("id")
                        )

                        if user_id is not None:

                            user_id = int(user_id)

                            if user_id > 0:
                                return user_id

                except Exception:
                    pass

            # ---------------------------------------------
            # Dummy token development
            #
            # Contoh:
            # dummy_token_user_2
            # ---------------------------------------------

            match = re.match(
                r"dummy_token_user_(\d+)",
                token
            )

            if match:

                try:

                    user_id = int(
                        match.group(1)
                    )

                    if user_id > 0:
                        return user_id

                except Exception:
                    pass

    # -----------------------------------------------------
    # 2. X-Owner-User-Id
    # -----------------------------------------------------

    owner_header = request.headers.get(
        "X-Owner-User-Id"
    )

    if owner_header:

        try:

            owner_id = int(
                owner_header
            )

            if owner_id > 0:
                return owner_id

        except (
            TypeError,
            ValueError
        ):
            pass

    # -----------------------------------------------------
    # 3. QUERY PARAM
    # -----------------------------------------------------

    owner_query = request.args.get(
        "owner_user_id"
    )

    if owner_query:

        try:

            owner_id = int(
                owner_query
            )

            if owner_id > 0:
                return owner_id

        except (
            TypeError,
            ValueError
        ):
            pass

    return None


# =========================================================
# VALIDASI OWNER
# =========================================================

def _validate_owner(
    cursor,
    owner_user_id
):

    cursor.execute(
        """
        SELECT
            id,
            username,
            role
        FROM users
        WHERE id = %s
        LIMIT 1
        """,
        (
            owner_user_id,
        )
    )

    owner = cursor.fetchone()

    if not owner:
        return None

    if str(
        owner.get(
            "role",
            ""
        )
    ).strip().lower() != "owner":

        return None

    return owner


# =========================================================
# VALIDASI VILLA MILIK OWNER
# =========================================================

def _get_owner_villa(
    cursor,
    owner_user_id,
    villa_id
):

    cursor.execute(
        """
        SELECT
            id,
            name,
            location,
            status,
            price,
            owner_user_id
        FROM villas
        WHERE
            id = %s
            AND owner_user_id = %s
        LIMIT 1
        """,
        (
            villa_id,
            owner_user_id
        )
    )

    return cursor.fetchone()


# =========================================================
# HELPER NILAI FIELD
# =========================================================
#
# Karena kita belum ingin mengasumsikan nama kolom detail
# lain di villa_details, fungsi ini mencoba beberapa
# kemungkinan nama kolom.
# =========================================================

def _first_value(
    row,
    candidates,
    default=None
):

    for key in candidates:

        if key in row:

            value = row.get(key)

            if value is not None:
                return value

    return default


# =========================================================
# NORMALISASI VILLA DETAIL
# =========================================================

def _clean_room_text(value):
    """Membersihkan teks nama kamar dari prefix/sisa kurung."""
    if value is None:
        return ""

    text = str(value).strip()

    # Hilangkan prefix yang memang ada di data SQL.
    text = re.sub(r"^kamar\s*:\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^unit\s*:\s*", "", text, flags=re.IGNORECASE)

    # Rapikan spasi.
    text = re.sub(r"\s+", " ", text).strip()

    return text


def _parse_bed_info(bed_info):
    """Mengubah 'Kamar: Nama (Tipe)' menjadi nama + tipe."""
    full_text = _clean_room_text(bed_info)

    if not full_text:
        return "", ""

    # Ambil bagian dalam kurung terakhir sebagai tipe kamar.
    # Contoh:
    # 'OI (Private Homestay)' -> OI / Private Homestay
    match = re.match(r"^(.*?)\s*\((.*)\)\s*$", full_text)

    if not match:
        return full_text, ""

    room_name = match.group(1).strip()
    room_type = match.group(2).strip()

    # Data SQL tertentu mempunyai kurung ganda, misalnya:
    # 'Agung Room ((Standard Double Bed ...))'
    # Bersihkan hanya kurung pembungkus yang berlebih.
    while room_type.startswith("("):
        room_type = room_type[1:].strip()

    while room_type.endswith(")"):
        room_type = room_type[:-1].strip()

    room_name = re.sub(r"\s+", " ", room_name)
    room_type = re.sub(r"\s+", " ", room_type)

    return room_name, room_type


def _normalize_villa_detail(row):
    """Normalisasi villa_details sesuai struktur SQL yang digunakan."""
    unit_id = row.get("id")
    villa_id = row.get("villa_id")

    # ---------------------------------------------------------
    # SUMBER NAMA KAMAR/SUB-VILLA
    # ---------------------------------------------------------
    # Pada SQL Anda, nama unit tersimpan di kolom bed_info,
    # contoh: 'Kamar: OI (Private Homestay)'.
    # ---------------------------------------------------------
    bed_info = row.get("bed_info")
    parsed_name, parsed_type = _parse_bed_info(bed_info)

    # Jika suatu saat ada data lama yang memiliki kolom name,
    # tetap gunakan data tersebut sebagai fallback.
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

    # ---------------------------------------------------------
    # TIPE KAMAR
    # ---------------------------------------------------------
    database_room_type = row.get("room_type")
    room_type = (
        str(database_room_type).strip()
        if database_room_type not in (None, "")
        else parsed_type
    )

    # ---------------------------------------------------------
    # GAMBAR
    # ---------------------------------------------------------
    # Di SQL villa_details, nama kolom gambar adalah `img`.
    # ---------------------------------------------------------
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

    # ---------------------------------------------------------
    # DESKRIPSI & FASILITAS
    # ---------------------------------------------------------
    description = row.get("description")
    facilities = row.get("facilities")

    if description is None:
        description = ""

    if facilities is None:
        facilities = ""

    # ---------------------------------------------------------
    # HARGA & KAPASITAS
    # ---------------------------------------------------------
    price = row.get("price")
    capacity = row.get("max_guests")

    return {
        "id": unit_id,
        "villa_id": villa_id,

        # Nama bersih untuk ditampilkan di frontend.
        "name": str(name),
        "room_name": str(name),

        # Tipe kamar dari room_type atau dari bed_info.
        "room_type": room_type,

        # Simpan data asli juga agar frontend tetap fleksibel.
        "bed_info": str(bed_info).strip() if bed_info is not None else "",

        "image": image,
        "img": image,

        "description": str(description).strip(),
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
                "error": (
                    "Token Owner tidak valid "
                    "atau user owner belum ditemukan."
                )
            }), 401

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )

        owner = _validate_owner(
            cursor,
            owner_user_id
        )

        if not owner:

            return jsonify({
                "status": "error",
                "error": "Owner tidak valid."
            }), 403

        cursor.execute(
            """
            SELECT
                id,
                name,
                location,
                status,
                price,
                owner_user_id
            FROM villas
            WHERE owner_user_id = %s
            ORDER BY id ASC
            """,
            (
                owner_user_id,
            )
        )

        villas = cursor.fetchall()

        return jsonify({
            "status": "success",
            "owner_user_id": owner_user_id,
            "data": villas
        }), 200

    except Exception as e:

        print(
            "Owner Villas Error:",
            str(e)
        )

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:

        _close(
            cursor,
            conn
        )


# =========================================================
# 2. DAFTAR UNIT DALAM VILLA
# =========================================================
#
# ENDPOINT BARU
#
# GET:
#
# /api/owner/villa-details?villa_id=1
#
# Hanya unit yang benar-benar milik villa dan owner
# yang boleh keluar.
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

        villa_id_raw = request.args.get(
            "villa_id"
        )

        if not villa_id_raw:

            return jsonify({
                "status": "error",
                "error": "villa_id wajib diisi."
            }), 400

        try:

            villa_id = int(
                villa_id_raw
            )

        except (
            TypeError,
            ValueError
        ):

            return jsonify({
                "status": "error",
                "error": "villa_id tidak valid."
            }), 400

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )

        # -------------------------------------------------
        # CEK OWNER
        # -------------------------------------------------

        owner = _validate_owner(
            cursor,
            owner_user_id
        )

        if not owner:

            return jsonify({
                "status": "error",
                "error": "Owner tidak valid."
            }), 403

        # -------------------------------------------------
        # CEK VILLA
        # -------------------------------------------------

        villa = _get_owner_villa(
            cursor,
            owner_user_id,
            villa_id
        )

        if not villa:

            return jsonify({
                "status": "error",
                "error": (
                    "Villa tidak ditemukan "
                    "atau bukan milik Owner ini."
                )
            }), 403

        # -------------------------------------------------
        # AMBIL UNIT
        # -------------------------------------------------
        #
        # SELECT * digunakan sementara karena kita tidak
        # mengasumsikan nama kolom selain id dan villa_id.
        # Data kemudian dinormalisasi sebelum dikirim.
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                villa_id,
                max_guests,
                facilities,
                img,
                room_type,
                price,
                description,
                bed_info,
                status
            FROM villa_details
            WHERE
                villa_id = %s
                AND (status = 'active' OR status IS NULL OR status = '')
            ORDER BY id ASC
            """,
            (
                villa_id,
            )
        )

        rows = cursor.fetchall()

        details = [
            _normalize_villa_detail(row)
            for row in rows
        ]

        return jsonify({
            "status": "success",

            "owner_user_id":
                owner_user_id,

            "villa_id":
                villa_id,

            "villa_name":
                villa.get("name"),

            "data":
                details
        }), 200

    except Exception as e:

        print(
            "Owner Villa Details Error:",
            str(e)
        )

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:

        _close(
            cursor,
            conn
        )


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

        # -------------------------------------------------
        # OWNER
        # -------------------------------------------------

        owner_user_id = _get_owner_user_id()

        if not owner_user_id:

            return jsonify({
                "status": "error",
                "error": (
                    "Token Owner tidak valid "
                    "atau sudah kadaluarsa."
                )
            }), 401

        # -------------------------------------------------
        # PARAMETER
        # -------------------------------------------------

        villa_id_raw = request.args.get(
            "villa_id"
        )

        villa_detail_id_raw = request.args.get(
            "villa_detail_id"
        )

        month_raw = request.args.get(
            "month"
        )

        year_raw = request.args.get(
            "year"
        )

        # -------------------------------------------------
        # VALIDASI
        # -------------------------------------------------

        if (
            villa_id_raw is None
            or villa_detail_id_raw is None
            or month_raw is None
            or year_raw is None
        ):

            return jsonify({
                "status": "error",
                "error": (
                    "villa_id, villa_detail_id, "
                    "month dan year wajib diisi."
                )
            }), 400

        try:

            villa_id = int(
                villa_id_raw
            )

            villa_detail_id = int(
                villa_detail_id_raw
            )

            month_input = int(
                month_raw
            )

            year = int(
                year_raw
            )

        except (
            TypeError,
            ValueError
        ):

            return jsonify({
                "status": "error",
                "error": (
                    "villa_id, villa_detail_id, "
                    "month atau year tidak valid."
                )
            }), 400

        # -------------------------------------------------
        # MONTH
        # -------------------------------------------------
        #
        # JavaScript:
        # Januari = 0
        # Desember = 11
        #
        # MySQL/calendar:
        # Januari = 1
        # Desember = 12
        # -------------------------------------------------

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

        # -------------------------------------------------
        # DATABASE
        # -------------------------------------------------

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )

        # -------------------------------------------------
        # OWNER
        # -------------------------------------------------

        owner = _validate_owner(
            cursor,
            owner_user_id
        )

        if not owner:

            return jsonify({
                "status": "error",
                "error": "Owner tidak valid."
            }), 403

        # -------------------------------------------------
        # VILLA
        # -------------------------------------------------

        villa = _get_owner_villa(
            cursor,
            owner_user_id,
            villa_id
        )

        if not villa:

            return jsonify({
                "status": "error",
                "error": (
                    "Villa tidak ditemukan "
                    "atau bukan milik Owner ini."
                )
            }), 403

        # -------------------------------------------------
        # UNIT
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                villa_id
            FROM villa_details
            WHERE
                id = %s
                AND villa_id = %s
            LIMIT 1
            """,
            (
                villa_detail_id,
                villa_id
            )
        )

        villa_detail = cursor.fetchone()

        if not villa_detail:

            return jsonify({
                "status": "error",
                "error": (
                    "Unit tidak ditemukan "
                    "atau bukan bagian dari villa ini."
                )
            }), 404

        # -------------------------------------------------
        # RENTANG BULAN
        # -------------------------------------------------

        first_day = date(
            year,
            month,
            1
        )

        if month == 12:

            next_month = date(
                year + 1,
                1,
                1
            )

        else:

            next_month = date(
                year,
                month + 1,
                1
            )

        last_day = (
            next_month
            - timedelta(days=1)
        )

        # -------------------------------------------------
        # BOOKING UNIT
        # -------------------------------------------------
        #
        # Booking:
        #
        # 5 check-in
        # 8 check-out
        #
        # Maka malam:
        #
        # 5
        # 6
        # 7
        #
        # Bukan tanggal 8.
        #
        # Karena itu kondisi overlap menggunakan:
        #
        # check_in < last_day+1
        # check_out > first_day
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                villa_id,
                villa_detail_id,
                check_in,
                check_out,
                status
            FROM bookings
            WHERE
                villa_id = %s
                AND villa_detail_id = %s

                AND status IN (
                    'Menunggu Pembayaran',
                    'Menunggu Verifikasi',
                    'Lunas'
                )

                AND check_in <= %s
                AND check_out >= %s

            ORDER BY
                check_in ASC
            """,
            (
                villa_id,
                villa_detail_id,
                last_day,
                first_day
            )
        )

        unit_bookings = cursor.fetchall()

        # -------------------------------------------------
        # BOOKING LAMA
        #
        # villa_detail_id IS NULL
        #
        # Booking lama dianggap memblokir seluruh villa.
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                villa_id,
                villa_detail_id,
                check_in,
                check_out,
                status
            FROM bookings
            WHERE
                villa_id = %s
                AND villa_detail_id IS NULL

                AND status IN (
                    'Menunggu Pembayaran',
                    'Menunggu Verifikasi',
                    'Lunas'
                )

                AND check_in <= %s
                AND check_out >= %s

            ORDER BY
                check_in ASC
            """,
            (
                villa_id,
                last_day,
                first_day
            )
        )

        legacy_bookings = cursor.fetchall()

        # -------------------------------------------------
        # BENTUK SET TANGGAL
        # -------------------------------------------------

        booked_days = set()

        # -------------------------------------------------
        # BOOKING UNIT
        # -------------------------------------------------

        for booking in unit_bookings:

            curr = booking.get(
                "check_in"
            )

            end = booking.get(
                "check_out"
            )

            if not curr or not end:
                continue

            if hasattr(
                curr,
                "date"
            ):
                curr = curr.date()

            if hasattr(
                end,
                "date"
            ):
                end = end.date()

            if curr > end:
                continue

            # ---------------------------------------------
            # CHECK-IN sampai sehari sebelum CHECK-OUT
            # ---------------------------------------------

            while curr < end:

                if (
                    curr.month == month
                    and curr.year == year
                ):

                    booked_days.add(
                        curr.day
                    )

                curr += timedelta(
                    days=1
                )

        # -------------------------------------------------
        # BOOKING LAMA TANPA UNIT
        # -------------------------------------------------

        legacy_days = set()

        for booking in legacy_bookings:

            curr = booking.get(
                "check_in"
            )

            end = booking.get(
                "check_out"
            )

            if not curr or not end:
                continue

            if hasattr(
                curr,
                "date"
            ):
                curr = curr.date()

            if hasattr(
                end,
                "date"
            ):
                end = end.date()

            if curr > end:
                continue

            while curr < end:

                if (
                    curr.month == month
                    and curr.year == year
                ):

                    legacy_days.add(
                        curr.day
                    )

                curr += timedelta(
                    days=1
                )

        # -------------------------------------------------
        # GABUNG
        # -------------------------------------------------

        all_booked_days = sorted(
            booked_days | legacy_days
        )

        return jsonify({

            "status":
                "success",

            "owner_user_id":
                owner_user_id,

            "villa_id":
                villa_id,

            "villa_detail_id":
                villa_detail_id,

            "villa_name":
                villa.get("name"),

            "month":
                month,

            "year":
                year,

            "booked_dates":
                all_booked_days,

            # Informasi tambahan untuk frontend
            "unit_booked_dates":
                sorted(booked_days),

            "legacy_booked_dates":
                sorted(legacy_days)

        }), 200

    except Exception as e:

        print(
            "Owner Availability Error:",
            str(e)
        )

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:

        _close(
            cursor,
            conn
        )


# =========================================================
# EXPORT
# =========================================================

export = owner_availability_bp