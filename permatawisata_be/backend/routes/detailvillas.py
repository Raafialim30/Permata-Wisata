from flask import Blueprint, jsonify
from db import get_db_connection  # Import dari pool terpusat

villas_bp = Blueprint('villas_bp', __name__)


# =========================================================
# FALLBACK DATA: Agar halaman tetap bisa tampil saat DB tidak tersedia
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
            "description": "Villa premium dengan pemandangan alam dan fasilitas lengkap.",
            "catalog_link": "https://wa.me/6281212345678?text=Halo%20saya%20ingin%20melihat%20katalog%20Villa%20Puncak%20Indah"
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
            "description": "Villa nyaman untuk keluarga yang ingin bersantai di kawasan tenang.",
            "catalog_link": "https://wa.me/6281212345678?text=Halo%20saya%20ingin%20melihat%20katalog%20Villa%20Taman%20Asri"
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
            "description": "Homestay modern dengan akses mudah ke pusat kota.",
            "catalog_link": "https://wa.me/6281212345678?text=Halo%20saya%20ingin%20melihat%20katalog%20Homestay%20Senja%20Indah"
        },
    ]


def _build_fallback_detail(villa_id):
    villa = next((item for item in _get_fallback_villas() if item.get("id") == villa_id), None)
    if not villa:
        return None

    room = {
        "id_detail": 1,
        "bed_info": "1 King Bed + 1 Sofa Bed",
        "facilities": "Wi-Fi, AC, TV, Kolam Renang",
        "other_facilities": "Sarapan, parkir gratis, area santai",
        "max_guests": villa.get("guests", 4),
        "max_age_rule": "Batas maksimal dihitung dari usia 6 tahun ke atas.",
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
        "other_facilities": "Sarapan, parkir gratis, area santai",
        "max_age_rule": "Batas maksimal dihitung dari usia 6 tahun ke atas."
    }


# =========================================================
# HELPER: Tutup cursor & connection dengan aman
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
# HELPER: Ambil nilai fallback (Unit -> Villa -> Default)
# =========================================================
def get_fallback(r, villa, key, villa_key=None, default_val=""):
    val = r.get(key)
    if val is None or str(val).strip() in ["", "-"]:
        villa_val = villa.get(villa_key or key)
        if villa_val is not None and str(villa_val).strip() not in ["", "-"]:
            return villa_val
        return default_val
    return val

# =========================================================
# 2. LIST SEMUA VILLAS (LANDING PAGE / VILLAS PAGE)
# =========================================================
@villas_bp.route('/api/villas', methods=['GET'])
def get_villas():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM villas")
        villas = cursor.fetchall()
        if villas:
            return jsonify(villas)
        return jsonify(_get_fallback_villas())

    except Exception:
        return jsonify(_get_fallback_villas())
    finally:
        _close(cursor, conn)


# =========================================================
# 3. DETAIL VILLA (termasuk semua daftar kamar)
# =========================================================
@villas_bp.route('/api/villas/<int:villa_id>', methods=['GET'])
def get_villa_by_id(villa_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)

        cursor.execute("SELECT * FROM villas WHERE id = %s", (villa_id,))
        villa = cursor.fetchone()

        if villa:
            cursor.execute("SELECT * FROM villa_details WHERE villa_id = %s", (villa_id,))
            rooms_raw = cursor.fetchall()

            room_ids = [r['id'] for r in rooms_raw]
            addons_by_room = {}
            if room_ids:
                format_strings = ','.join(['%s'] * len(room_ids))
                cursor.execute(f"SELECT * FROM room_addons WHERE room_id IN ({format_strings})", tuple(room_ids))
                addons_raw = cursor.fetchall()
                for addon in addons_raw:
                    rid = addon['room_id']
                    if rid not in addons_by_room:
                        addons_by_room[rid] = []
                    addons_by_room[rid].append(addon)

            rooms = []
            for r in rooms_raw:
                price_raw = 0
                price_raw = r.get("price") or 0
                if price_raw == 0:
                    try:
                        of = r.get("other_facilities") or ""
                        if "Rp" in of:
                            price_str = of.split("Rp")[1].split("|")[0].strip().replace(".", "").replace(",", "")
                            price_raw = int(price_str)
                    except Exception:
                        price_raw = 0

                img_val = r.get("img")
                if not img_val or img_val in ["room_1_1.png", "default_room.jpg", "image_1.png"]:
                    img_val = ""

                rooms.append({
                    "id_detail":        r.get("id"),
                    "bed_info":         r.get("bed_info") or "Standard Bed Setup",
                    "facilities":       get_fallback(r, villa, "facilities", default_val="Free Wifi, TV, AC"),
                    "other_facilities": r.get("other_facilities") or "",
                    "max_guests":       get_fallback(r, villa, "max_guests", "guests", 4),
                    "max_age_rule":     r.get("max_age_rule") or "",
                    "price_raw":        price_raw,
                    "img":              img_val,
                    "room_type":        r.get("room_type") or "Standard Room",
                    "description":      r.get("description") or "",
                    "snk":              r.get("snk") or "",
                    "location":         r.get("location") or "",
                    "room_count":       get_fallback(r, villa, "room_count", default_val=1),
                    "bathroom_count":   get_fallback(r, villa, "bathroom_count", "baths", 1),
                    "bathroom_type":    r.get("bathroom_type") or "",
                    "amenities":        r.get("amenities") or "",
                    "equipment":        r.get("equipment") or "",
                    "hours":            r.get("hours") or "",
                    "addons":           addons_by_room.get(r.get("id"), [])
                })

            payload = {
                **villa,
                "rooms": rooms,
                "image": villa.get("image") or villa.get("img"),
                "description": villa.get("description") or "",
                "guests": villa.get("guests") or (rooms[0]["max_guests"] if rooms else 4),
                "bed_info": villa.get("bed_type") or (rooms[0]["bed_info"] if rooms else "Standard Setup"),
                "facilities": villa.get("facilities") or (rooms[0]["facilities"] if rooms else "Free Wifi, TV, AC"),
                "other_facilities": rooms[0]["other_facilities"] if rooms else "Fasilitas Lengkap",
                "max_age_rule": rooms[0]["max_age_rule"] if rooms else "Batas usia standar.",
            }
            return jsonify(payload)

        fallback_payload = _build_fallback_detail(villa_id)
        if fallback_payload:
            return jsonify(fallback_payload)
        return jsonify({"error": "Villa tidak ditemukan"}), 404

    except Exception:
        fallback_payload = _build_fallback_detail(villa_id)
        if fallback_payload:
            return jsonify(fallback_payload)
        return jsonify({"error": "Villa tidak ditemukan"}), 404
    finally:
        _close(cursor, conn)