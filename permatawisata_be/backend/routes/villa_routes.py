from flask import Blueprint, jsonify
from db import get_db_connection


# =========================================================
# BLUEPRINT
# =========================================================
villa_bp = Blueprint("villa", __name__)


# =========================================================
# DAFTAR VILLA
# =========================================================
@villa_bp.route("", methods=["GET"])
def get_villas():
    """
    Mengambil seluruh data villa.

    Catatan:
    - Tidak menggunakan SELECT *
    - owner_user_id sengaja tidak dikirim ke frontend publik
    - owner_id lama juga tidak dikirim
    """

    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
            SELECT
                id,
                name,
                location,
                description,
                price,
                image,
                facilities,
                capacity,
                status
            FROM villas
            ORDER BY id ASC
        """

        cursor.execute(query)
        villas = cursor.fetchall()

        return jsonify(villas), 200

    except Exception as e:
        print("ERROR GET VILLAS:", e)

        return jsonify({
            "success": False,
            "message": "Gagal mengambil data villa",
            "error": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()


# =========================================================
# DETAIL VILLA
# =========================================================
@villa_bp.route("/<int:villa_id>", methods=["GET"])
def get_villa_detail(villa_id):
    """
    Mengambil detail satu villa berdasarkan ID.

    Data yang dikembalikan:
    - Informasi utama villa
    - Detail kamar dari villa_details
    - owner_user_id dan owner_id tidak dikirim ke publik
    """

    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # -------------------------------------------------
        # AMBIL DATA VILLA
        # -------------------------------------------------
        villa_query = """
            SELECT
                id,
                name,
                location,
                description,
                price,
                image,
                facilities,
                capacity,
                status
            FROM villas
            WHERE id = %s
            LIMIT 1
        """

        cursor.execute(villa_query, (villa_id,))
        villa = cursor.fetchone()

        # Villa tidak ditemukan
        if not villa:
            return jsonify({
                "success": False,
                "message": "Villa tidak ditemukan"
            }), 404

        # -------------------------------------------------
        # AMBIL DETAIL KAMAR
        # -------------------------------------------------
        detail_query = """
            SELECT *
            FROM villa_details
            WHERE villa_id = %s
            ORDER BY id ASC
        """

        cursor.execute(detail_query, (villa_id,))
        rooms = cursor.fetchall()

        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------
        response = {
            "success": True,
            "data": {
                "id": villa.get("id"),
                "name": villa.get("name"),
                "location": villa.get("location"),
                "description": villa.get("description"),
                "price": villa.get("price"),
                "image": villa.get("image"),
                "facilities": villa.get("facilities"),
                "capacity": villa.get("capacity"),
                "status": villa.get("status"),
                "rooms": rooms
            }
        }

        return jsonify(response), 200

    except Exception as e:
        print("ERROR GET VILLA DETAIL:", e)

        return jsonify({
            "success": False,
            "message": "Gagal mengambil detail villa",
            "error": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()


# =========================================================
# DETAIL KAMAR BERDASARKAN VILLA
# =========================================================
@villa_bp.route("/<int:villa_id>/rooms", methods=["GET"])
def get_villa_rooms(villa_id):
    """
    Mengambil daftar kamar/detail kamar dari sebuah villa.
    """

    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Pastikan villa ada
        villa_query = """
            SELECT id
            FROM villas
            WHERE id = %s
            LIMIT 1
        """

        cursor.execute(villa_query, (villa_id,))
        villa = cursor.fetchone()

        if not villa:
            return jsonify({
                "success": False,
                "message": "Villa tidak ditemukan"
            }), 404

        # Ambil kamar
        room_query = """
            SELECT *
            FROM villa_details
            WHERE villa_id = %s
            ORDER BY id ASC
        """

        cursor.execute(room_query, (villa_id,))
        rooms = cursor.fetchall()

        return jsonify({
            "success": True,
            "villa_id": villa_id,
            "rooms": rooms
        }), 200

    except Exception as e:
        print("ERROR GET VILLA ROOMS:", e)

        return jsonify({
            "success": False,
            "message": "Gagal mengambil data kamar villa",
            "error": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()