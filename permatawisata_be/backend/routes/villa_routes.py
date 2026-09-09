import os
import sys
from flask import Blueprint, jsonify

# Menambahkan path folder utama agar Python bisa membaca modul 'backend'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.db import get_db_connection

villa_bp = Blueprint("villa", __name__)

# =========================================================
# 1. AMBIL SEMUA DAFTAR VILLA (UNTUK LANDING / VILLAS PAGE)
# =========================================================
@villa_bp.route("", methods=["GET"])
def get_villas():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM villas")
        villas = cursor.fetchall()

        return jsonify(villas), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# =========================================================
# 2. AMBIL DETAIL SATU VILLA & SEMUA VARIASI KAMARNYA (FIXED)
# =========================================================
@villa_bp.route("/<int:villa_id>", methods=["GET"])
def get_villa_by_id(villa_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Ambil data utama villa berdasarkan ID
        cursor.execute("SELECT * FROM villas WHERE id = %s", (villa_id,))
        villa = cursor.fetchone()

        if not villa:
            return jsonify({"error": "Villa tidak ditemukan"}), 404

        # 2. Ambil semua tipe kamar yang terikat dengan villa ini
        cursor.execute("SELECT * FROM villa_details WHERE villa_id = %s", (villa_id,))
        rooms_raw = cursor.fetchall()

        # 3. Membersihkan data kamar & mengekstrak harga
        rooms = []
        for r in rooms_raw:
            price_raw = 0
            try:
                of = r.get("other_facilities") or ""
                if "Rp" in of:
                    # Pola ekstrak harga dari string "Harga Kamar: Rp XXX.XXX | ..."
                    price_str = of.split("Rp")[1].split("|")[0].strip().replace(".", "").replace(",", "")
                    price_raw = int(price_str)
            except Exception:
                price_raw = 0

            # KUNCI UTAMA: Menyertakan field 'img' asli dari database agar dikirim ke frontend React
            rooms.append({
                "id_detail":        r.get("id"),
                "bed_info":         r.get("bed_info")         or "Standard Bed Setup",
                "facilities":       r.get("facilities")       or "Free Wifi, TV, AC",
                "other_facilities": r.get("other_facilities") or "Fasilitas Standar Lengkap",
                "max_guests":       r.get("max_guests")       or 4,
                "max_age_rule":     r.get("max_age_rule")     or "Batas usia standar 6 tahun ke atas.",
                "price_raw":        price_raw,
                "img":              r.get("img")              or "room_1_1.png"  # <-- Mengirim data gambar asli dari DB
            })

        # 4. Menyusun payload respon data yang dibutuhkan oleh VillaDetail.jsx
        payload = {
            "id":               villa.get("id"),
            "name":             villa.get("name"),
            "location":         villa.get("location"),
            "price":            villa.get("price"),
            "image":            villa.get("image") or villa.get("img"),
            "rating":           villa.get("rating") or 5.0,
            "description":      villa.get("description") or "",
            "rooms":            rooms,
            # Fallback jika list rooms kosong
            "guests":           rooms[0]["max_guests"]      if rooms else 4,
            "bed_info":         rooms[0]["bed_info"]        if rooms else "Standard Setup",
            "facilities":       rooms[0]["facilities"]      if rooms else "Free Wifi, TV, AC",
            "other_facilities": rooms[0]["other_facilities"] if rooms else "Fasilitas Lengkap",
            "max_age_rule":     rooms[0]["max_age_rule"]    if rooms else "Batas usia standar.",
        }

        return jsonify(payload), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()