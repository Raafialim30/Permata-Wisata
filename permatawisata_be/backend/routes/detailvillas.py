import os
import re
from typing import Any, Dict, List, Optional
from flask import Blueprint, jsonify, request
from db import get_db_connection

# =========================================================
# BLUEPRINT
# =========================================================
villas_bp = Blueprint("villas_bp", __name__)


# =========================================================
# HELPER TYPE CHECKING & CONVERSION
# =========================================================
def _to_int(val: Any) -> Optional[int]:
    """Helper konversi tipe data ke int secara aman."""
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _close(cursor: Any = None, conn: Any = None) -> None:
    """Helper menutup cursor dan koneksi database."""
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
# MEDIA DISK SCANNER HELPERS (PEMINDAI FOTO DISK OTOMATIS)
# =========================================================
def _get_media_dir() -> str:
    """Mengembalikan path absolut folder media backend."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.normpath(os.path.join(base_dir, 'media'))


def _natural_sort_key(s: str) -> List[Any]:
    """Urutkan nama file foto secara alami (1.png, 2.png, ..., 9.png, 10.png)."""
    parts = re.split(r'(\d+)', s)
    return [int(p) if p.isdigit() else p.lower() for p in parts]


def _find_villa_dir(villa_id: int) -> Optional[str]:
    """
    Mencari folder villa di disk secara dinamis untuk SEMUA villa (1 s/d 100+).
    Mendukung format nama folder: 'villa_62', 'villa 62', 'villa62', '62', 'Villa 62', dll.
    """
    media_dir = _get_media_dir()
    villas_parent = os.path.join(media_dir, 'villas')
    if not os.path.isdir(villas_parent):
        return None

    target_str = str(villa_id)
    exact_candidates = [
        f"villa_{target_str}",
        f"villa {target_str}",
        f"villa{target_str}",
        target_str
    ]

    try:
        entries = os.listdir(villas_parent)
        # 1. Cek pencocokan persis (case-insensitive)
        for entry in entries:
            full_path = os.path.join(villas_parent, entry)
            if os.path.isdir(full_path) and entry.lower() in [c.lower() for c in exact_candidates]:
                return full_path

        # 2. Cek angka via regex fallback
        for entry in entries:
            full_path = os.path.join(villas_parent, entry)
            if os.path.isdir(full_path):
                nums = re.findall(r'\d+', entry)
                if nums and nums[0] == target_str:
                    return full_path
    except Exception:
        pass

    return None


def _scan_villa_images(villa_id: int) -> List[str]:
    """Memindai seluruh foto di folder villa utama."""
    media_dir = _get_media_dir()
    villa_dir = _find_villa_dir(villa_id)
    if not villa_dir:
        return []

    valid_exts = ('.png', '.jpg', '.jpeg', '.webp', '.gif')
    images: List[str] = []

    if os.path.isdir(villa_dir):
        try:
            files = os.listdir(villa_dir)
            sorted_files = sorted(
                [f for f in files if os.path.isfile(os.path.join(villa_dir, f)) and f.lower().endswith(valid_exts)],
                key=_natural_sort_key
            )
            rel_dir = os.path.relpath(villa_dir, media_dir).replace('\\', '/')
            for f in sorted_files:
                images.append(f"{rel_dir}/{f}")
        except Exception:
            pass

    return images


def _scan_room_images(villa_id: int, room_id: Optional[int] = None, room_index: int = 1) -> List[str]:
    """
    Memindai foto kamar secara dinamis untuk SEMUA villa dan SEMUA kamar.
    - Mencari subfolder kamar di dalam 'rooms/' atau langsung di folder villa.
    - Jika tidak ada subfolder khusus, mengambil foto dari 'rooms/' atau folder villa utama.
    """
    media_dir = _get_media_dir()
    villa_dir = _find_villa_dir(villa_id)
    if not villa_dir:
        return []

    valid_exts = ('.png', '.jpg', '.jpeg', '.webp', '.gif')
    images: List[str] = []

    rooms_parent = os.path.join(villa_dir, 'rooms')
    
    search_parents: List[str] = []
    if os.path.isdir(rooms_parent):
        search_parents.append(rooms_parent)
    search_parents.append(villa_dir)

    all_subdirs: List[str] = []
    for s_parent in search_parents:
        try:
            subdirs = [
                os.path.join(s_parent, d) for d in os.listdir(s_parent)
                if os.path.isdir(os.path.join(s_parent, d)) and d.lower() != 'rooms'
            ]
            all_subdirs.extend(subdirs)
        except Exception:
            pass

    target_dir: Optional[str] = None

    # 1. Cari folder yang nomornya cocok dengan room_id (misal: room_13 -> 13)
    if room_id is not None:
        r_id_str = str(room_id)
        for sdir in all_subdirs:
            folder_name = os.path.basename(sdir)
            nums = re.findall(r'\d+', folder_name)
            if nums and nums[0] == r_id_str:
                target_dir = sdir
                break

    # 2. Cari folder yang nomornya cocok dengan room_index (misal: room_1 -> 1)
    if not target_dir:
        r_idx_str = str(room_index)
        for sdir in all_subdirs:
            folder_name = os.path.basename(sdir)
            nums = re.findall(r'\d+', folder_name)
            if nums and nums[0] == r_idx_str:
                target_dir = sdir
                break

    # 3. Fallback berdasarkan urutan folder alami
    if not target_dir and all_subdirs:
        sorted_subdirs = sorted(all_subdirs, key=lambda p: _natural_sort_key(os.path.basename(p)))
        if 0 <= (room_index - 1) < len(sorted_subdirs):
            target_dir = sorted_subdirs[room_index - 1]

    # Ambil foto dari target subfolder
    if target_dir and os.path.isdir(target_dir):
        try:
            files = os.listdir(target_dir)
            sorted_files = sorted(
                [f for f in files if os.path.isfile(os.path.join(target_dir, f)) and f.lower().endswith(valid_exts)],
                key=_natural_sort_key
            )
            rel_dir = os.path.relpath(target_dir, media_dir).replace('\\', '/')
            for f in sorted_files:
                images.append(f"{rel_dir}/{f}")
            if images:
                return images
        except Exception:
            pass

    # 4. Fallback jika tidak ada subfolder kamar khusus: ambil foto dari folder rooms/
    if os.path.isdir(rooms_parent):
        try:
            files = os.listdir(rooms_parent)
            sorted_files = sorted(
                [f for f in files if os.path.isfile(os.path.join(rooms_parent, f)) and f.lower().endswith(valid_exts)],
                key=_natural_sort_key
            )
            if sorted_files:
                rel_dir = os.path.relpath(rooms_parent, media_dir).replace('\\', '/')
                for f in sorted_files:
                    images.append(f"{rel_dir}/{f}")
                if images:
                    return images
        except Exception:
            pass

    # 5. Fallback akhir: ambil foto dari folder villa utama
    return _scan_villa_images(villa_id)


# =========================================================
# DYNAMIC FALLBACK HELPERS
# =========================================================
def _build_fallback_detail(villa_id: int) -> Dict[str, Any]:
    """Fallback dinamis untuk SEMUA villa ID jika database tidak dapat diakses."""
    villa_scanned_imgs = _scan_villa_images(villa_id)
    room_scanned_imgs = _scan_room_images(villa_id, room_index=1)
    
    all_imgs = villa_scanned_imgs or room_scanned_imgs or [f"villas/villa_{villa_id}/utama.png"]
    main_img = all_imgs[0] if all_imgs else f"villas/villa_{villa_id}/utama.png"

    room = {
        "id_detail": 1,
        "bed_info": "Standard Bed Setup",
        "facilities": "Wi-Fi, AC, TV, Kolam Renang",
        "other_facilities": "Parkir gratis, area santai",
        "max_guests": 4,
        "max_age_rule": "Batas maksimal dihitung dari usia 6 tahun ke atas.",
        "price_raw": 1000000,
        "img": main_img,
        "images": room_scanned_imgs or all_imgs,
        "room_type": "Standard Room",
        "description": "Fasilitas lengkap dan nyaman.",
        "snk": "",
        "location": "Yogyakarta",
        "room_count": 1,
        "bathroom_count": 1,
        "bathroom_type": "Shower",
        "amenities": "Wi-Fi, AC",
        "equipment": "TV, Kulkas",
        "hours": "",
        "addons": []
    }

    return {
        "id": villa_id,
        "name": f"Villa {villa_id}",
        "location": "Yogyakarta",
        "guests": 4,
        "beds": 2,
        "baths": 1,
        "price": 1000000,
        "rating": 5.0,
        "total_reviews": 0,
        "type": "villa",
        "promo": 0,
        "img": main_img,
        "images": all_imgs,
        "room_count": 1,
        "rooms": [room],
        "image": main_img,
        "description": "Informasi villa.",
        "bed_info": "Standard Bed Setup",
        "facilities": "Wi-Fi, AC, TV",
        "other_facilities": "Parkir gratis",
        "max_age_rule": "Batas maksimal dihitung dari usia 6 tahun ke atas."
    }


def get_fallback(room_data: Dict[str, Any], villa_data: Dict[str, Any], key: str, villa_key: Optional[str] = None, default_val: Any = "") -> Any:
    """Helper pengambil nilai properti kamar dengan fallback ke data villa utama."""
    value = room_data.get(key)
    if value is None or str(value).strip() in ["", "-"]:
        villa_value = villa_data.get(villa_key or key)
        if villa_value is not None and str(villa_value).strip() not in ["", "-"]:
            return villa_value
        return default_val
    return value


# =========================================================
# 1. LIST SEMUA VILLA (/api/villas)
# =========================================================
@villas_bp.route("/api/villas", methods=["GET"])
def get_villas():
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        if not conn:
            return jsonify([]), 200

        cursor = conn.cursor(dictionary=True)
        if not cursor:
            _close(None, conn)
            return jsonify([]), 200

        query = """
            SELECT
                v.id,
                v.name,
                v.location,
                v.price,
                ROUND(AVG(r.rating), 1) AS rating,
                COUNT(r.id) AS total_reviews,
                v.guests,
                v.beds,
                v.baths,
                v.bed_type,
                v.check_in_time,
                v.check_out_time,
                v.status,
                v.type,
                v.img,
                v.whatsapp,
                v.catalog_link,
                v.promo,
                v.room_count,
                v.bathroom_type,
                v.hours,
                v.description,
                v.amenities,
                v.equipment,
                v.facilities
            FROM villas v
            LEFT JOIN villa_reviews r 
                ON v.id = r.villa_id 
                AND (r.is_approved = 1 OR r.is_approved IS NULL)
            GROUP BY v.id
            ORDER BY v.id DESC
        """

        cursor.execute(query)
        villas_raw = cursor.fetchall() or []

        villas_list: List[Dict[str, Any]] = []
        if isinstance(villas_raw, list):
            for item in villas_raw:
                if isinstance(item, dict):
                    villas_list.append(item)

        return jsonify(villas_list), 200

    except Exception as e:
        print("ERROR GET VILLAS:", e)
        return jsonify([]), 200
    finally:
        _close(cursor, conn)


# =========================================================
# 2. DETAIL VILLA (/api/villas/<id>)
# =========================================================
@villas_bp.route("/api/villas/<int:villa_id>", methods=["GET"])
def get_villa_by_id(villa_id: int):
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        if not conn:
            fallback = _build_fallback_detail(villa_id)
            return jsonify(fallback), 200

        cursor = conn.cursor(dictionary=True, buffered=True)
        if not cursor:
            _close(None, conn)
            fallback = _build_fallback_detail(villa_id)
            return jsonify(fallback), 200

        # 1. Ambil Data Villa Utama dari DB
        villa_query = """
            SELECT
                v.id,
                v.name,
                v.location,
                v.price,
                ROUND(AVG(r.rating), 1) AS rating,
                COUNT(r.id) AS total_reviews,
                v.guests,
                v.beds,
                v.baths,
                v.bed_type,
                v.check_in_time,
                v.check_out_time,
                v.status,
                v.type,
                v.img,
                v.whatsapp,
                v.catalog_link,
                v.promo,
                v.room_count,
                v.bathroom_type,
                v.hours,
                v.description,
                v.amenities,
                v.equipment,
                v.facilities
            FROM villas v
            LEFT JOIN villa_reviews r 
                ON v.id = r.villa_id 
                AND (r.is_approved = 1 OR r.is_approved IS NULL)
            WHERE v.id = %s
            GROUP BY v.id
            LIMIT 1
        """

        cursor.execute(villa_query, (villa_id,))
        villa_data = cursor.fetchone()

        if not villa_data or not isinstance(villa_data, dict):
            fallback_payload = _build_fallback_detail(villa_id)
            return jsonify(fallback_payload), 200

        villa: Dict[str, Any] = dict(villa_data)

        # 2. Ambil Semua Detail Kamar (villa_details) untuk Villa Ini
        room_query = "SELECT * FROM villa_details WHERE villa_id = %s ORDER BY id ASC"
        cursor.execute(room_query, (villa_id,))
        rooms_raw = cursor.fetchall() or []

        # 3. Batch Fetch Addons Kamar
        room_ids: List[int] = []
        if isinstance(rooms_raw, list):
            for room in rooms_raw:
                if isinstance(room, dict):
                    r_id_int = _to_int(room.get('id'))
                    if r_id_int is not None:
                        room_ids.append(r_id_int)

        addons_by_room: Dict[int, List[Dict[str, Any]]] = {}
        if room_ids:
            try:
                placeholders = ",".join(["%s"] * len(room_ids))
                addon_query = f"SELECT * FROM room_addons WHERE room_id IN ({placeholders}) ORDER BY id ASC"
                cursor.execute(addon_query, tuple(room_ids))
                addons_raw = cursor.fetchall() or []
                if isinstance(addons_raw, list):
                    for addon in addons_raw:
                        if isinstance(addon, dict):
                            addon_room_id = _to_int(addon.get("room_id"))
                            if addon_room_id is not None:
                                addons_by_room.setdefault(addon_room_id, []).append(addon)
            except Exception:
                addons_by_room = {}

        # 4. Formatur Data Kamar + Media Disk Scanning Foto Room untuk Villa Ini
        formatted_rooms: List[Dict[str, Any]] = []
        all_room_images: List[str] = []
        villa_scanned_imgs = _scan_villa_images(villa_id)

        if isinstance(rooms_raw, list):
            for idx, room in enumerate(rooms_raw, start=1):
                if isinstance(room, dict):
                    r_id_int = _to_int(room.get('id'))
                    price_raw = room.get("price") or 0

                    if price_raw == 0:
                        try:
                            other_fac_val = room.get("other_facilities")
                            if isinstance(other_fac_val, str) and "Rp" in other_fac_val:
                                rp_parts = other_fac_val.split("Rp", 1)
                                if len(rp_parts) > 1:
                                    pipe_parts = rp_parts[1].split("|", 1)
                                    price_str = pipe_parts[0].strip().replace(".", "").replace(",", "")
                                    if price_str.isdigit():
                                        price_raw = int(price_str)
                        except Exception:
                            price_raw = 0

                    # Pindai foto kamar dari disk fisik secara dinamis
                    room_scanned_imgs = _scan_room_images(villa_id, r_id_int, room_index=idx)
                    
                    if room_scanned_imgs:
                        room_images = room_scanned_imgs
                        room_img_main = room_scanned_imgs[0]
                        all_room_images.extend(room_scanned_imgs)
                    else:
                        db_img = room.get("img")
                        if not db_img or db_img in ["room_1_1.png", "default_room.jpg", "image_1.png"]:
                            db_img = ""
                        room_images = [db_img] if db_img else (villa_scanned_imgs or [villa.get("img", "")])
                        room_img_main = room_images[0] if room_images else ""

                    room_addons = addons_by_room.get(r_id_int, []) if r_id_int is not None else []

                    formatted_rooms.append({
                        "id_detail": r_id_int,
                        "bed_info": room.get("bed_info") or "Standard Bed Setup",
                        "facilities": get_fallback(room, villa, "facilities", default_val="Free Wifi, TV, AC"),
                        "other_facilities": room.get("other_facilities") or "",
                        "max_guests": get_fallback(room, villa, "max_guests", "guests", 4),
                        "max_age_rule": room.get("max_age_rule") or "",
                        "price_raw": price_raw,
                        "img": room_img_main,
                        "images": room_images,
                        "room_type": room.get("room_type") or "Standard Room",
                        "description": room.get("description") or "",
                        "snk": room.get("snk") or "",
                        "location": room.get("location") or villa.get("location") or "",
                        "room_count": get_fallback(room, villa, "room_count", default_val=1),
                        "bathroom_count": get_fallback(room, villa, "bathroom_count", "baths", 1),
                        "bathroom_type": room.get("bathroom_type") or "",
                        "amenities": room.get("amenities") or "",
                        "equipment": room.get("equipment") or "",
                        "hours": room.get("hours") or "",
                        "addons": room_addons
                    })

        # 5. JIKA TABEL villa_details KOSONG DI DATABASE MYSQL:
        # OTOMATIS GENERATE KAMAR DEFAULT DENGAN PEMINDAIAN FOTO DISK AGAR KAMAR & FOTO TETAP TAMPIL DI FRONTEND
        if not formatted_rooms:
            total_rooms_to_create = _to_int(villa.get("room_count")) or _to_int(villa.get("beds")) or 1
            if total_rooms_to_create < 1:
                total_rooms_to_create = 1

            for idx in range(1, total_rooms_to_create + 1):
                auto_room_scanned_imgs = _scan_room_images(villa_id, room_id=None, room_index=idx)
                if not auto_room_scanned_imgs:
                    auto_room_scanned_imgs = villa_scanned_imgs or [villa.get("img") or ""]

                main_auto_img = auto_room_scanned_imgs[0] if auto_room_scanned_imgs else (villa.get("img") or "")
                all_room_images.extend(auto_room_scanned_imgs)

                formatted_rooms.append({
                    "id_detail": idx,
                    "bed_info": f"Kamar {idx} ({villa.get('bed_type') or 'Standard Bed'})",
                    "facilities": villa.get("facilities") or "Free Wifi, AC, TV",
                    "other_facilities": villa.get("other_facilities") or "",
                    "max_guests": villa.get("guests") or 4,
                    "max_age_rule": "Batas maksimal dihitung dari usia 6 tahun ke atas.",
                    "price_raw": villa.get("price") or 0,
                    "img": main_auto_img,
                    "images": auto_room_scanned_imgs,
                    "room_type": "Standard Room",
                    "description": villa.get("description") or "",
                    "snk": "",
                    "location": villa.get("location") or "",
                    "room_count": 1,
                    "bathroom_count": villa.get("baths") or 1,
                    "bathroom_type": villa.get("bathroom_type") or "Shower",
                    "amenities": villa.get("amenities") or "",
                    "equipment": villa.get("equipment") or "",
                    "hours": villa.get("hours") or "",
                    "addons": []
                })

        # 6. Media Disk Scanning Foto Villa Utama & Payload Final untuk Frontend
        if villa_scanned_imgs:
            villa_images = list(dict.fromkeys(villa_scanned_imgs + all_room_images))
        elif all_room_images:
            villa_images = all_room_images
        else:
            db_villa_img = villa.get('img')
            villa_images = [db_villa_img] if db_villa_img else []

        first_room_other_fac = formatted_rooms[0]["other_facilities"] if formatted_rooms else ""
        first_room_age_rule = formatted_rooms[0]["max_age_rule"] if formatted_rooms else ""

        payload = {
            **villa,
            "rooms": formatted_rooms,
            "image": villa.get("image") or villa.get("img") or (villa_images[0] if villa_images else ""),
            "images": villa_images,
            "other_facilities": villa.get("other_facilities") or first_room_other_fac,
            "max_age_rule": villa.get("max_age_rule") or first_room_age_rule,
            "description": villa.get("description") or "",
            "guests": villa.get("guests") or (formatted_rooms[0]["max_guests"] if formatted_rooms else 4),
            "bed_info": villa.get("bed_type") or (formatted_rooms[0]["bed_info"] if formatted_rooms else "Standard Setup"),
            "facilities": villa.get("facilities") or (formatted_rooms[0]["facilities"] if formatted_rooms else "Free Wifi, TV, AC"),
        }

        return jsonify(payload), 200

    except Exception as e:
        print(f"ERROR GET VILLA DETAIL (ID {villa_id}):", e)
        fallback_payload = _build_fallback_detail(villa_id)
        return jsonify(fallback_payload), 200
    finally:
        _close(cursor, conn)


# =========================================================
# 3. GET ULASAN VILLA (/api/reviews)
# =========================================================
@villas_bp.route("/api/reviews", methods=["GET"])
def get_reviews():
    """Endpoint ulasan aman untuk mencegah error HTTP 500 di frontend VillaDetail.jsx."""
    villa_id = request.args.get("villa_id")
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"status": "success", "data": []}), 200

        cursor = conn.cursor(dictionary=True)
        if not cursor:
            _close(None, conn)
            return jsonify({"status": "success", "data": []}), 200

        if villa_id:
            query = """
                SELECT id, villa_id, reviewer_name, rating, comment, room_id, created_at 
                FROM villa_reviews 
                WHERE villa_id = %s AND (is_approved = 1 OR is_approved IS NULL)
                ORDER BY id DESC
            """
            cursor.execute(query, (villa_id,))
        else:
            query = """
                SELECT id, villa_id, reviewer_name, rating, comment, room_id, created_at 
                FROM villa_reviews 
                WHERE (is_approved = 1 OR is_approved IS NULL)
                ORDER BY id DESC
            """
            cursor.execute(query)

        reviews_raw = cursor.fetchall() or []
        reviews_list: List[Dict[str, Any]] = []
        if isinstance(reviews_raw, list):
            for r in reviews_raw:
                if isinstance(r, dict):
                    reviews_list.append(r)

        return jsonify({"status": "success", "data": reviews_list}), 200
    except Exception as e:
        print("ERROR GET REVIEWS:", e)
        return jsonify({"status": "success", "data": []}), 200
    finally:
        _close(cursor, conn)