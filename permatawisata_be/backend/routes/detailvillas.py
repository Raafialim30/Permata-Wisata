from flask import Blueprint, jsonify
from db import get_db_connection


# =========================================================
# BLUEPRINT
# =========================================================
villas_bp = Blueprint("villas_bp", __name__)


# =========================================================
# FALLBACK DATA
# =========================================================
# Digunakan agar halaman publik tetap dapat menampilkan
# data ketika database sementara tidak tersedia.
# =========================================================
def _get_fallback_villas():
    return [
        {
            "id": 1,
            "name": "Villa Puncak Indah",
            "location": "Sleman, Yogyakarta",
            "guests": 8,
            "beds": 4,
            "baths": 3,
            "price": 1200000,
            "rating": 4.9,
            "type": "villa",
            "promo": 1,
            "img": "/images/villas/villa_1/utama.png",
            "room_count": 4,
            "description": (
                "Villa premium dengan pemandangan alam "
                "dan fasilitas lengkap."
            ),
            "catalog_link": (
                "https://wa.me/6281212345678"
                "?text=Halo%20saya%20ingin%20melihat%20katalog"
                "%20Villa%20Puncak%20Indah"
            )
        },
        {
            "id": 2,
            "name": "Villa Taman Asri",
            "location": "Bantul, Yogyakarta",
            "guests": 6,
            "beds": 3,
            "baths": 2,
            "price": 950000,
            "rating": 4.8,
            "type": "villa",
            "promo": 0,
            "img": "/images/villas/villa_2/utama.png",
            "room_count": 3,
            "description": (
                "Villa nyaman untuk keluarga yang ingin "
                "bersantai di kawasan tenang."
            ),
            "catalog_link": (
                "https://wa.me/6281212345678"
                "?text=Halo%20saya%20ingin%20melihat%20katalog"
                "%20Villa%20Taman%20Asri"
            )
        },
        {
            "id": 3,
            "name": "Homestay Senja Indah",
            "location": "Yogyakarta Pusat",
            "guests": 4,
            "beds": 2,
            "baths": 2,
            "price": 700000,
            "rating": 4.7,
            "type": "homestay",
            "promo": 0,
            "img": "/images/villas/villa_3/utama.png",
            "room_count": 2,
            "description": (
                "Homestay modern dengan akses mudah "
                "ke pusat kota."
            ),
            "catalog_link": (
                "https://wa.me/6281212345678"
                "?text=Halo%20saya%20ingin%20melihat%20katalog"
                "%20Homestay%20Senja%20Indah"
            )
        }
    ]


# =========================================================
# FALLBACK DETAIL VILLA
# =========================================================
def _build_fallback_detail(villa_id):
    villa = next(
        (
            item
            for item in _get_fallback_villas()
            if item.get("id") == villa_id
        ),
        None
    )

    if not villa:
        return None

    room = {
        "id_detail": 1,
        "bed_info": "1 King Bed + 1 Sofa Bed",
        "facilities": "Wi-Fi, AC, TV, Kolam Renang",
        "other_facilities": (
            "Sarapan, parkir gratis, area santai"
        ),
        "max_guests": villa.get("guests", 4),
        "max_age_rule": (
            "Batas maksimal dihitung dari usia 6 tahun ke atas."
        ),
        "price_raw": villa.get("price", 0),
        "img": villa.get("img", ""),
        "room_type": "Standard Room",
        "description": villa.get("description", ""),
        "snk": "",
        "location": villa.get("location", ""),
        "room_count": villa.get("room_count", 1),
        "bathroom_count": villa.get("baths", 1),
        "bathroom_type": "Shower",
        "amenities": "Breakfast, Wi-Fi, AC",
        "equipment": "TV, Kulkas, Kompor",
        "hours": "",
        "addons": []
    }

    return {
        **villa,
        "rooms": [room],
        "image": villa.get("img", ""),
        "description": villa.get("description", ""),
        "guests": villa.get("guests", 4),
        "bed_info": "1 King Bed + 1 Sofa Bed",
        "facilities": "Wi-Fi, AC, TV, Kolam Renang",
        "other_facilities": (
            "Sarapan, parkir gratis, area santai"
        ),
        "max_age_rule": (
            "Batas maksimal dihitung dari usia 6 tahun ke atas."
        )
    }


# =========================================================
# HELPER: TUTUP CURSOR DAN CONNECTION
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
# HELPER: AMBIL NILAI DENGAN FALLBACK
# Unit -> Villa -> Default
# =========================================================
def get_fallback(
    room_data,
    villa_data,
    key,
    villa_key=None,
    default_val=""
):
    value = room_data.get(key)

    if value is None or str(value).strip() in ["", "-"]:
        villa_value = villa_data.get(villa_key or key)

        if (
            villa_value is not None
            and str(villa_value).strip() not in ["", "-"]
        ):
            return villa_value

        return default_val

    return value


# =========================================================
# 1. LIST SEMUA VILLA
# =========================================================
@villas_bp.route("/api/villas", methods=["GET"])
def get_villas():
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # -------------------------------------------------
        # PENTING:
        # Jangan menggunakan SELECT *.
        #
        # owner_user_id dan owner_id adalah informasi internal
        # kepemilikan villa dan tidak perlu dikirim ke renter.
        # -------------------------------------------------
        query = """
            SELECT
                id,
                name,
                location,
                price,
                rating,
                guests,
                beds,
                baths,
                bed_type,
                check_in_time,
                check_out_time,
                status,
                type,
                img,
                whatsapp,
                catalog_link,
                promo,
                room_count,
                bathroom_type,
                hours,
                description,
                amenities,
                equipment,
                facilities
            FROM villas
            ORDER BY id ASC
        """

        cursor.execute(query)

        villas = cursor.fetchall()

        # Jika database memiliki data villa
        if villas:
            return jsonify(villas), 200

        # Jika tabel villa kosong
        return jsonify(_get_fallback_villas()), 200

    except Exception as e:
        # Tetap tampilkan error di terminal agar mudah
        # diketahui ketika debugging.
        print("ERROR GET VILLAS:", e)

        # Pertahankan mekanisme fallback yang sudah ada.
        return jsonify(_get_fallback_villas()), 200

    finally:
        _close(cursor, conn)


# =========================================================
# 2. DETAIL VILLA
# =========================================================
@villas_bp.route("/api/villas/<int:villa_id>", methods=["GET"])
def get_villa_by_id(villa_id):
    conn = None
    cursor = None

    try:
        conn = get_db_connection()

        # buffered=True membantu proses beberapa query
        # dalam satu connection.
        cursor = conn.cursor(
            dictionary=True,
            buffered=True
        )

        # -------------------------------------------------
        # AMBIL DATA VILLA
        # -------------------------------------------------
        # owner_user_id dan owner_id sengaja tidak dipilih.
        # Data tersebut digunakan sistem internal Owner.
        # -------------------------------------------------
        villa_query = """
            SELECT
                id,
                name,
                location,
                price,
                rating,
                guests,
                beds,
                baths,
                bed_type,
                check_in_time,
                check_out_time,
                status,
                type,
                img,
                whatsapp,
                catalog_link,
                promo,
                room_count,
                bathroom_type,
                hours,
                description,
                amenities,
                equipment,
                facilities
            FROM villas
            WHERE id = %s
            LIMIT 1
        """

        cursor.execute(
            villa_query,
            (villa_id,)
        )

        villa = cursor.fetchone()

        # -------------------------------------------------
        # JIKA VILLA TIDAK DITEMUKAN DI DATABASE
        # -------------------------------------------------
        if not villa:
            fallback_payload = _build_fallback_detail(
                villa_id
            )

            if fallback_payload:
                return jsonify(fallback_payload), 200

            return jsonify({
                "status": "error",
                "error": "Villa tidak ditemukan"
            }), 404

        # -------------------------------------------------
        # AMBIL SEMUA DETAIL KAMAR
        # -------------------------------------------------
        # SELECT * dipertahankan di sini karena struktur
        # villa_details perlu tetap kompatibel dengan data
        # kamar yang sudah ada di database.
        # -------------------------------------------------
        room_query = """
            SELECT *
            FROM villa_details
            WHERE villa_id = %s
            ORDER BY id ASC
        """

        cursor.execute(
            room_query,
            (villa_id,)
        )

        rooms_raw = cursor.fetchall()

        # -------------------------------------------------
        # AMBIL ID KAMAR
        # -------------------------------------------------
        room_ids = [
            room.get("id")
            for room in rooms_raw
            if room.get("id") is not None
        ]

        addons_by_room = {}

        # -------------------------------------------------
        # AMBIL ADDON KAMAR
        # -------------------------------------------------
        if room_ids:
            placeholders = ",".join(
                ["%s"] * len(room_ids)
            )

            addon_query = f"""
                SELECT *
                FROM room_addons
                WHERE room_id IN ({placeholders})
                ORDER BY id ASC
            """

            cursor.execute(
                addon_query,
                tuple(room_ids)
            )

            addons_raw = cursor.fetchall()

            for addon in addons_raw:
                room_id = addon.get("room_id")

                if room_id not in addons_by_room:
                    addons_by_room[room_id] = []

                addons_by_room[room_id].append(addon)

        # -------------------------------------------------
        # BENTUK RESPONSE KAMAR
        # -------------------------------------------------
        rooms = []

        for room in rooms_raw:

            # ---------------------------------------------
            # HARGA KAMAR
            # ---------------------------------------------
            price_raw = room.get("price") or 0

            # Jika price kosong/0, coba ambil harga
            # dari kolom other_facilities.
            if price_raw == 0:
                try:
                    other_facilities = (
                        room.get("other_facilities") or ""
                    )

                    if "Rp" in other_facilities:
                        price_str = (
                            other_facilities
                            .split("Rp", 1)[1]
                            .split("|", 1)[0]
                            .strip()
                            .replace(".", "")
                            .replace(",", "")
                        )

                        if price_str.isdigit():
                            price_raw = int(price_str)

                except Exception:
                    price_raw = 0

            # ---------------------------------------------
            # GAMBAR KAMAR
            # ---------------------------------------------
            img_val = room.get("img")

            # Hilangkan nama gambar default yang tidak valid
            # sebagai gambar kamar.
            if not img_val or img_val in [
                "room_1_1.png",
                "default_room.jpg",
                "image_1.png"
            ]:
                img_val = ""

            # ---------------------------------------------
            # DATA KAMAR
            # ---------------------------------------------
            rooms.append({
                "id_detail": room.get("id"),

                "bed_info": (
                    room.get("bed_info")
                    or "Standard Bed Setup"
                ),

                "facilities": get_fallback(
                    room,
                    villa,
                    "facilities",
                    default_val="Free Wifi, TV, AC"
                ),

                "other_facilities": (
                    room.get("other_facilities") or ""
                ),

                "max_guests": get_fallback(
                    room,
                    villa,
                    "max_guests",
                    "guests",
                    4
                ),

                "max_age_rule": (
                    room.get("max_age_rule") or ""
                ),

                "price_raw": price_raw,

                "img": img_val,

                "room_type": (
                    room.get("room_type")
                    or "Standard Room"
                ),

                "description": (
                    room.get("description") or ""
                ),

                "snk": (
                    room.get("snk") or ""
                ),

                "location": (
                    room.get("location")
                    or villa.get("location")
                    or ""
                ),

                "room_count": get_fallback(
                    room,
                    villa,
                    "room_count",
                    default_val=1
                ),

                "bathroom_count": get_fallback(
                    room,
                    villa,
                    "bathroom_count",
                    "baths",
                    1
                ),

                "bathroom_type": (
                    room.get("bathroom_type") or ""
                ),

                "amenities": (
                    room.get("amenities") or ""
                ),

                "equipment": (
                    room.get("equipment") or ""
                ),

                "hours": (
                    room.get("hours") or ""
                ),

                "addons": addons_by_room.get(
                    room.get("id"),
                    []
                )
            })

        # -------------------------------------------------
        # PAYLOAD DETAIL VILLA
        # -------------------------------------------------
        # Karena query villa sudah memilih kolom secara
        # eksplisit, **villa di sini tidak mengandung
        # owner_user_id atau owner_id.
        # -------------------------------------------------
        payload = {
            **villa,

            "rooms": rooms,

            "image": (
                villa.get("image")
                or villa.get("img")
                or ""
            ),

            "description": (
                villa.get("description") or ""
            ),

            "guests": (
                villa.get("guests")
                or (
                    rooms[0]["max_guests"]
                    if rooms
                    else 4
                )
            ),

            "bed_info": (
                villa.get("bed_type")
                or (
                    rooms[0]["bed_info"]
                    if rooms
                    else "Standard Setup"
                )
            ),

            "facilities": (
                villa.get("facilities")
                or (
                    rooms[0]["facilities"]
                    if rooms
                    else "Free Wifi, TV, AC"
                )
            ),

            "other_facilities": (
                rooms[0]["other_facilities"]
                if rooms
                else "Fasilitas Lengkap"
            ),

            "max_age_rule": (
                rooms[0]["max_age_rule"]
                if rooms
                else "Batas usia standar."
            )
        }

        return jsonify(payload), 200

    except Exception as e:
        # -------------------------------------------------
        # LOG ERROR
        # -------------------------------------------------
        # Sebelumnya error ditelan begitu saja. Sekarang
        # error ditampilkan di terminal supaya kita bisa
        # mengetahui penyebab sebenarnya ketika debugging.
        # -------------------------------------------------
        print(
            f"ERROR GET VILLA DETAIL "
            f"(ID {villa_id}):",
            e
        )

        # -------------------------------------------------
        # FALLBACK
        # -------------------------------------------------
        fallback_payload = _build_fallback_detail(
            villa_id
        )

        if fallback_payload:
            return jsonify(fallback_payload), 200

        return jsonify({
            "status": "error",
            "error": "Villa tidak ditemukan"
        }), 404

    finally:
        _close(cursor, conn)