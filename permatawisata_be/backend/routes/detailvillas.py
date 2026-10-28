from typing import Any, Dict, List
from flask import Blueprint, jsonify
from db import get_db_connection


# =========================================================
# BLUEPRINT
# =========================================================
villas_bp = Blueprint("villas_bp", __name__)


# =========================================================
# HELPER KONVERSI & PENUTUPAN KONEKSI
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


def _to_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _to_int(val: Any, default: int = 0) -> int:
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


# =========================================================
# FALLBACK DATA
# =========================================================
def _get_fallback_villas() -> List[Dict[str, Any]]:
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


def _build_fallback_detail(villa_id: int) -> Any:
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
# HELPER: AMBIL NILAI DENGAN FALLBACK
# =========================================================
def get_fallback(
    room_data: Dict[str, Any],
    villa_data: Dict[str, Any],
    key: str,
    villa_key: Any = None,
    default_val: Any = ""
) -> Any:
    r_data = room_data if isinstance(room_data, dict) else {}
    v_data = villa_data if isinstance(villa_data, dict) else {}

    value = r_data.get(key)

    if value is None or str(value).strip() in ["", "-"]:
        v_key = villa_key if villa_key is not None else key
        villa_value = v_data.get(v_key)

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
    conn = cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

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
        villas = cursor.fetchall() or []

        if villas:
            return jsonify(villas), 200

        return jsonify(_get_fallback_villas()), 200

    except Exception as e:
        print("ERROR GET VILLAS:", e)
        return jsonify(_get_fallback_villas()), 200

    finally:
        _close(cursor, conn)


# =========================================================
# 2. DETAIL VILLA
# =========================================================
@villas_bp.route("/api/villas/<int:villa_id>", methods=["GET"])
def get_villa_by_id(villa_id: int):
    conn = cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)

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

        cursor.execute(villa_query, (villa_id,))
        villa = cursor.fetchone()

        if not villa or not isinstance(villa, dict):
            fallback_payload = _build_fallback_detail(villa_id)
            if fallback_payload:
                return jsonify(fallback_payload), 200

            return jsonify({
                "status": "error",
                "error": "Villa tidak ditemukan"
            }), 404

        room_query = """
            SELECT *
            FROM villa_details
            WHERE villa_id = %s
            ORDER BY id ASC
        """

        cursor.execute(room_query, (villa_id,))
        rooms_raw = cursor.fetchall() or []

        room_ids: List[int] = []
        for room in rooms_raw:
            if isinstance(room, dict):
                r_id = room.get("id")
                if r_id is not None:
                    room_ids.append(_to_int(r_id))

        addons_by_room: Dict[int, List[Dict[str, Any]]] = {}

        if room_ids:
            placeholders = ",".join(["%s"] * len(room_ids))
            addon_query = f"""
                SELECT *
                FROM room_addons
                WHERE room_id IN ({placeholders})
                ORDER BY id ASC
            """

            cursor.execute(addon_query, tuple(room_ids))
            addons_raw = cursor.fetchall() or []

            for addon in addons_raw:
                if isinstance(addon, dict):
                    r_id = _to_int(addon.get("room_id"))
                    if r_id not in addons_by_room:
                        addons_by_room[r_id] = []
                    addons_by_room[r_id].append(addon)

        rooms: List[Dict[str, Any]] = []

        for room in rooms_raw:
            if not isinstance(room, dict):
                continue

            price_raw = _to_int(room.get("price"))

            if price_raw == 0:
                try:
                    other_facilities = str(room.get("other_facilities") or "")
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

            img_val = str(room.get("img") or "")
            if img_val in [
                "room_1_1.png",
                "default_room.jpg",
                "image_1.png"
            ]:
                img_val = ""

            room_id_val = _to_int(room.get("id"))

            rooms.append({
                "id_detail": room_id_val,
                "bed_info": str(room.get("bed_info") or "Standard Bed Setup"),
                "facilities": get_fallback(
                    room,
                    villa,
                    "facilities",
                    default_val="Free Wifi, TV, AC"
                ),
                "other_facilities": str(room.get("other_facilities") or ""),
                "max_guests": get_fallback(
                    room,
                    villa,
                    "max_guests",
                    "guests",
                    4
                ),
                "max_age_rule": str(room.get("max_age_rule") or ""),
                "price_raw": price_raw,
                "img": img_val,
                "room_type": str(room.get("room_type") or "Standard Room"),
                "description": str(room.get("description") or ""),
                "snk": str(room.get("snk") or ""),
                "location": str(
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
                "bathroom_type": str(room.get("bathroom_type") or ""),
                "amenities": str(room.get("amenities") or ""),
                "equipment": str(room.get("equipment") or ""),
                "hours": str(room.get("hours") or ""),
                "addons": addons_by_room.get(room_id_val, [])
            })

        payload: Dict[str, Any] = dict(villa)
        payload.update({
            "rooms": rooms,
            "image": str(
                villa.get("image")
                or villa.get("img")
                or ""
            ),
            "description": str(villa.get("description") or ""),
            "guests": (
                villa.get("guests")
                or (
                    rooms[0]["max_guests"]
                    if rooms
                    else 4
                )
            ),
            "bed_info": (
                str(villa.get("bed_type") or "")
                or (
                    rooms[0]["bed_info"]
                    if rooms
                    else "Standard Setup"
                )
            ),
            "facilities": (
                str(villa.get("facilities") or "")
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
        })

        return jsonify(payload), 200

    except Exception as e:
        print(f"ERROR GET VILLA DETAIL (ID {villa_id}):", e)

        fallback_payload = _build_fallback_detail(villa_id)
        if fallback_payload:
            return jsonify(fallback_payload), 200

        return jsonify({
            "status": "error",
            "error": "Villa tidak ditemukan"
        }), 404

    finally:
        _close(cursor, conn)