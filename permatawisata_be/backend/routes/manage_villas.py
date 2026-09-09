from flask import Blueprint, request, jsonify
import os
from werkzeug.utils import secure_filename
from db import get_db_connection

manage_villas_bp = Blueprint('manage_villas_bp', __name__)


def _close(cursor=None, conn=None):
    try:
        if cursor: cursor.close()
    except Exception:
        pass
    try:
        if conn: conn.close()
    except Exception:
        pass


def get_villas_img_dir():
    # Mengambil folder upload gambar dari env variable jika diatur di production.
    # Fallback ke path relatif untuk development lokal.
    env_dir = os.getenv("UPLOAD_FOLDER")
    if env_dir:
        return env_dir
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    fe_dir = os.path.join(base_dir, 'permatawisata_fe', 'public', 'images', 'villas')
    if os.path.exists(os.path.join(base_dir, 'permatawisata_fe')):
        return fe_dir
    return os.path.join(base_dir, 'public', 'images', 'villas')


# ==========================================================
# ROUTE KELOLA MITRA / VILLAS UTAMA
# ==========================================================

@manage_villas_bp.route('/api/admin/villas', methods=['POST'])
def add_villa():
    conn = cursor = None
    try:
        data = request.json

        villa_id       = data.get('id')
        name           = data.get('name')
        location       = data.get('location', 'Yogyakarta')
        raw_price      = data.get('price')
        price          = int(raw_price) if raw_price else 0
        rating         = data.get('rating', 5)
        guests         = data.get('guests', 4)
        beds           = data.get('beds', 2)
        baths          = data.get('baths', 1)
        bed_type       = data.get('bed_type', '1 King Size')
        check_in_time  = data.get('check_in_time', '14:00')
        check_out_time = data.get('check_out_time', '12:00')
        status         = data.get('status', 'available')
        whatsapp       = data.get('whatsapp') or data.get('link_wa', '')
        v_type         = data.get('type', 'Villa')
        
        # Kolom baru
        room_count     = data.get('room_count', '1')
        bathroom_type  = data.get('bathroom_type', '-')
        hours          = data.get('hours', '-')
        description    = data.get('description', '')
        amenities      = data.get('amenities', '')
        equipment      = data.get('equipment', '')
        facilities     = data.get('facilities', '')
        img            = data.get('img', 'villa1.jpg')
        catalog_link   = data.get('catalog_link', '')
        promo          = data.get('promo', '')
        owner_id_raw   = data.get('owner_id')
        owner_id       = int(owner_id_raw) if owner_id_raw and str(owner_id_raw).isdigit() else 1

        conn   = get_db_connection()
        cursor = conn.cursor()

        if villa_id:
            cursor.execute(
                """
                INSERT INTO villas
                    (id, name, location, price, rating, guests, beds, baths,
                     bed_type, check_in_time, check_out_time, status, type, img, whatsapp, catalog_link, promo, owner_id,
                     room_count, bathroom_type, hours, description, amenities, equipment, facilities)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (villa_id, name, location, price, rating, guests, beds, baths,
                 bed_type, check_in_time, check_out_time, status, v_type, img, whatsapp, catalog_link, promo, owner_id,
                 room_count, bathroom_type, hours, description, amenities, equipment, facilities)
            )
        else:
            cursor.execute(
                """
                INSERT INTO villas
                    (name, location, price, rating, guests, beds, baths,
                     bed_type, check_in_time, check_out_time, status, type, img, whatsapp, catalog_link, promo, owner_id,
                     room_count, bathroom_type, hours, description, amenities, equipment, facilities)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (name, location, price, rating, guests, beds, baths,
                 bed_type, check_in_time, check_out_time, status, v_type, img, whatsapp, catalog_link, promo, owner_id,
                 room_count, bathroom_type, hours, description, amenities, equipment, facilities)
            )

        conn.commit()
        return jsonify({"status": "success", "message": "Villa berhasil ditambahkan!"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)


@manage_villas_bp.route('/api/admin/villas', methods=['GET'])
def get_villas():
    conn = cursor = None
    try:
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM villas")
        return jsonify({"status": "success", "data": cursor.fetchall()}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)


@manage_villas_bp.route('/api/admin/villas/next_id', methods=['GET'])
def get_next_villa_id():
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT AUTO_INCREMENT FROM information_schema.tables WHERE table_name='villas' AND table_schema=DATABASE()")
        res = cursor.fetchone()
        next_id = res['AUTO_INCREMENT'] if res and res.get('AUTO_INCREMENT') else 1
        return jsonify({"status": "success", "next_id": next_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)


@manage_villas_bp.route('/api/admin/villas/<int:villa_id>', methods=['PUT'])
def edit_villa(villa_id):
    conn = cursor = None
    try:
        data = request.json
        whatsapp = data.get('whatsapp') or data.get('link_wa', '')

        conn   = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE villas
            SET name=%s, location=%s, price=%s, rating=%s, guests=%s, beds=%s, baths=%s,
                bed_type=%s, check_in_time=%s, check_out_time=%s, status=%s, whatsapp=%s, img=%s,
                room_count=%s, bathroom_type=%s, hours=%s, description=%s, amenities=%s, equipment=%s, facilities=%s, promo=%s
            WHERE id=%s
            """,
            (data.get('name'), data.get('location'), data.get('price'), data.get('rating'),
             data.get('guests'), data.get('beds'), data.get('baths'), data.get('bed_type'),
             data.get('check_in_time'), data.get('check_out_time'), data.get('status'),
             whatsapp, data.get('img', 'utama.png'), 
             data.get('room_count', '1'), data.get('bathroom_type', '-'), data.get('hours', '-'), 
             data.get('description', ''), data.get('amenities', ''), data.get('equipment', ''), data.get('facilities', ''),
             data.get('promo', '0'),
             villa_id)
        )
        conn.commit()
        return jsonify({"status": "success", "message": "Detail Villa berhasil diperbarui!"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)


@manage_villas_bp.route('/api/admin/villas/<int:villa_id>', methods=['DELETE'])
def delete_villa(villa_id):
    conn = cursor = None
    try:
        conn   = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM villas WHERE id = %s", (villa_id,))
        conn.commit()
        return jsonify({"status": "success", "message": "Villa berhasil dihapus!"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)


# ==========================================================
# REVISI FIXED: ROUTE DETAILED ROOMS (SINKRON DENGAN DATABASE)
# ==========================================================

@manage_villas_bp.route('/api/admin/villa-details', methods=['GET', 'POST'])
def handle_villa_details():
    conn = cursor = None
    try:
        conn = get_db_connection()
        
        # --- MENAMPILKAN DATA KAMAR (GET) ---
        if request.method == 'GET':
            cursor = conn.cursor(dictionary=True)
            villa_id = request.args.get('villa_id')
            
            if villa_id:
                cursor.execute("SELECT * FROM villa_details WHERE villa_id = %s", (villa_id,))
            else:
                cursor.execute("SELECT * FROM villa_details")
                
            rooms = cursor.fetchall()
            return jsonify({"status": "success", "data": rooms}), 200

        # --- MENAMBAH DATA KAMAR BARU (POST) ---
        elif request.method == 'POST':
            cursor = conn.cursor()
            data = request.json
            
            villa_id = data.get('villa_id')
            bed_info = data.get('bed_info') or data.get('room_name', '')
            room_type = data.get('room_type', 'Standard Room')
            price = int(data.get('price', 0))
            facilities = data.get('facilities', '')
            img = data.get('img', '')
            snk = data.get('snk', '')
            description = data.get('description', '')
            
            # Kolom database
            max_guests = data.get('max_guests', '')
            max_age_rule = data.get('max_age_rule', '')
            other_facilities = data.get('other_facilities', '')
            
            # Kolom baru dari Excel
            room_count = data.get('room_count', '')
            bathroom_count = data.get('bathroom_count', '')
            bathroom_type = data.get('bathroom_type', '')
            amenities = data.get('amenities', '')
            equipment = data.get('equipment', '')
            hours = data.get('hours', '')
            location = data.get('location', '')
            
            # Query diperbaiki: Murni menyasar kolom database nyata (Tanpa kolom 'room_name')
            cursor.execute(
                """
                INSERT INTO villa_details 
                    (villa_id, bed_info, room_type, price, facilities, img, snk, description, max_guests, max_age_rule, other_facilities, room_count, bathroom_count, bathroom_type, amenities, equipment, hours, location) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (villa_id, bed_info, room_type, price, facilities, img, snk, description, max_guests, max_age_rule, other_facilities, room_count, bathroom_count, bathroom_type, amenities, equipment, hours, location)
            )
            conn.commit()
            return jsonify({"status": "success", "message": "Variasi kamar berhasil disimpan!"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)


@manage_villas_bp.route('/api/admin/villa-details/<int:room_id>', methods=['PUT', 'DELETE'])
def update_delete_room(room_id):
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # --- EDIT INFORMASI KAMAR (PUT) ---
        if request.method == 'PUT':
            data = request.json
            bed_info = data.get('bed_info') or data.get('room_name', '')
            room_type = data.get('room_type', 'Standard Room')
            price = int(data.get('price', 0))
            facilities = data.get('facilities', '')
            img = data.get('img', '')
            description = data.get('description', '')
            
            max_guests = data.get('max_guests', '')
            max_age_rule = data.get('max_age_rule', '')
            other_facilities = data.get('other_facilities', '')
            snk = data.get('snk', '')
            
            # Kolom baru dari Excel
            room_count = data.get('room_count', '')
            bathroom_count = data.get('bathroom_count', '')
            bathroom_type = data.get('bathroom_type', '')
            amenities = data.get('amenities', '')
            equipment = data.get('equipment', '')
            hours = data.get('hours', '')
            location = data.get('location', '')

            # Query update disinkronkan dengan struktur kolom riil database
            cursor.execute(
                """
                UPDATE villa_details 
                SET bed_info=%s, room_type=%s, price=%s, facilities=%s, img=%s, description=%s, 
                    max_guests=%s, max_age_rule=%s, other_facilities=%s, snk=%s,
                    room_count=%s, bathroom_count=%s, bathroom_type=%s, amenities=%s, equipment=%s, hours=%s, location=%s
                WHERE id=%s
                """,
                (bed_info, room_type, price, facilities, img, description, max_guests, max_age_rule, other_facilities, snk, room_count, bathroom_count, bathroom_type, amenities, equipment, hours, location, room_id)
            )
            conn.commit()
            return jsonify({"status": "success", "message": "Kamar berhasil diperbarui!"}), 200
            
        # --- HAPUS TIPE KAMAR (DELETE) ---
        elif request.method == 'DELETE':
            cursor.execute("DELETE FROM villa_details WHERE id = %s", (room_id,))
            conn.commit()
            return jsonify({"status": "success", "message": "Kamar berhasil dihapus dari sistem!"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)

# ==========================================================
# ROUTE UPLOAD GAMBAR FISIK (OTOMATIS)
# ==========================================================
@manage_villas_bp.route('/api/admin/upload', methods=['POST'])
def upload_image():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "Tidak ada file yang diunggah"}), 400
            
        file = request.files['file']
        villa_id = request.form.get('villa_id')
        folder_type = request.form.get('folder_type') # 'main' atau 'room'
        target_filename = request.form.get('filename')

        if not file or file.filename == '':
            return jsonify({"error": "File kosong"}), 400
            
        if not villa_id or not folder_type or not target_filename:
            return jsonify({"error": "Parameter tidak lengkap (butuh villa_id, folder_type, filename)"}), 400

        # VALIDASI KEAMANAN FILE
        villa_id_str = str(villa_id).strip()
        if not villa_id_str.isdigit() or int(villa_id_str) < 0:
            return jsonify({"error": "Villa ID tidak valid"}), 400

        # Allowed extensions
        allowed_exts = ('.png', '.jpg', '.jpeg', '.webp', '.gif')
        filename_safe = secure_filename(target_filename).lower()
        
        if not any(filename_safe.endswith(ext) for ext in allowed_exts):
            return jsonify({"error": "Tipe file tidak didukung. Gunakan PNG, JPG, JPEG, WEBP, atau GIF"}), 400

        # Resolusi path absolut ke direktori gambar
        villas_img_dir = get_villas_img_dir()

        # Tentukan folder tujuan
        if folder_type == 'main':
            target_dir = os.path.join(villas_img_dir, f"villa_{villa_id_str}")
        elif folder_type == 'room':
            room_id = request.form.get('room_id')
            
            # VALIDASI ROOM_ID
            if not room_id:
                return jsonify({"error": "Room ID diperlukan untuk tipe folder 'room'"}), 400
            room_id_str = str(room_id).strip()
            if not room_id_str.isdigit() or int(room_id_str) < 0:
                return jsonify({"error": "Room ID tidak valid"}), 400
                
            target_dir = os.path.join(villas_img_dir, f"villa_{villa_id_str}", "rooms", f"room_{room_id_str}")
        else:
            return jsonify({"error": "folder_type tidak valid (harus 'main' atau 'room')"}), 400

        # VALIDASI PATH - Pastikan path tidak keluar dari direktori yang dituju
        target_dir_resolved = os.path.abspath(target_dir)
        villas_base_resolved = os.path.abspath(villas_img_dir)
        
        if not target_dir_resolved.startswith(villas_base_resolved):
            return jsonify({"error": "Path tidak valid - kemungkinan path traversal attack"}), 400

        # Buat folder jika belum ada
        os.makedirs(target_dir, exist_ok=True)

        # Simpan file
        file_path = os.path.join(target_dir, filename_safe)
        
        # Jika file sudah ada, hapus dulu (untuk memastikan update)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Warning: Gagal menghapus file lama: {e}")

        file.save(file_path)

        return jsonify({
            "status": "success", 
            "message": "File berhasil diunggah", 
            "filename": filename_safe,
            "path": file_path
        }), 200

    except Exception as e:
        return jsonify({"error": f"Gagal mengunggah file: {str(e)}"}), 500

# ==========================================================
# ROUTE BACA GALERI FISIK (OTOMATIS)
# ==========================================================
@manage_villas_bp.route('/api/admin/gallery', methods=['GET'])
def get_gallery():
    try:
        villa_id = request.args.get('villa_id')
        folder_type = request.args.get('folder_type', 'room')
        room_id = request.args.get('room_id')

        if not villa_id:
            return jsonify({"error": "Butuh villa_id"}), 400

        villas_img_dir = os.path.join(get_villas_img_dir(), f"villa_{villa_id}")

        if folder_type == 'room':
            if room_id:
                target_dir = os.path.join(villas_img_dir, 'rooms', f"room_{room_id}")
            else:
                target_dir = os.path.join(villas_img_dir, 'rooms')
        else:
            target_dir = villas_img_dir

        if not os.path.exists(target_dir):
            return jsonify({"status": "success", "data": []}), 200

        # Ambil semua file gambar yang benar-benar ada di folder
        valid_exts = ('.png', '.jpg', '.jpeg', '.webp')
        files = [f for f in os.listdir(target_dir) if os.path.isfile(os.path.join(target_dir, f)) and f.lower().endswith(valid_exts)]

        # Urutkan file agar rapi
        files.sort()

        return jsonify({"status": "success", "data": files}), 200
    except Exception as e:
        return jsonify({"error": f"Gagal membaca galeri: {str(e)}"}), 500

# ==========================================================
# ROUTE DELETE GAMBAR FISIK (AMAN)
# ==========================================================
@manage_villas_bp.route('/api/admin/gallery', methods=['DELETE'])
def delete_gallery_image():
    try:
        villa_id = request.args.get('villa_id')
        folder_type = request.args.get('folder_type', 'room')
        room_id = request.args.get('room_id')
        filename = request.args.get('filename')

        # VALIDASI
        if not villa_id or not filename:
            return jsonify({"error": "Butuh villa_id dan filename"}), 400

        # Validasi villa_id
        villa_id_str = str(villa_id).strip()
        if not villa_id_str.isdigit() or int(villa_id_str) < 0:
            return jsonify({"error": "Villa ID tidak valid"}), 400

        # Validasi filename - harus file image saja, tidak boleh ada path traversal
        filename_safe = secure_filename(filename).lower()
        allowed_exts = ('.png', '.jpg', '.jpeg', '.webp', '.gif')
        
        if not any(filename_safe.endswith(ext) for ext in allowed_exts):
            return jsonify({"error": "Format file tidak valid"}), 400

        if '/' in filename_safe or '\\' in filename_safe or filename_safe.startswith('.'):
            return jsonify({"error": "Path traversal terdeteksi"}), 400

        villas_img_dir = os.path.join(get_villas_img_dir(), f"villa_{villa_id_str}")

        if folder_type == 'room':
            if not room_id:
                return jsonify({"error": "Room ID diperlukan untuk folder 'room'"}), 400
            
            room_id_str = str(room_id).strip()
            if not room_id_str.isdigit() or int(room_id_str) < 0:
                return jsonify({"error": "Room ID tidak valid"}), 400
            
            target_dir = os.path.join(villas_img_dir, 'rooms', f"room_{room_id_str}")
        else:
            target_dir = villas_img_dir

        # Path traversal check - pastikan path tetap dalam direktori yang seharusnya
        target_dir_resolved = os.path.abspath(target_dir)
        villas_base_resolved = os.path.abspath(os.path.dirname(villas_img_dir))
        
        if not target_dir_resolved.startswith(villas_base_resolved):
            return jsonify({"error": "Path tidak valid - kemungkinan path traversal attack"}), 400

        # Hapus file
        file_path = os.path.join(target_dir, filename_safe)
        
        if not os.path.exists(file_path):
            return jsonify({"error": "File tidak ditemukan"}), 404

        # Hapus file dengan safe
        try:
            os.remove(file_path)
            return jsonify({
                "status": "success",
                "message": f"Gambar '{filename_safe}' berhasil dihapus",
                "filename": filename_safe
            }), 200
        except Exception as e:
            return jsonify({"error": f"Gagal menghapus file: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": f"Gagal memproses permintaan: {str(e)}"}), 500

# ==========================================================

@manage_villas_bp.route('/api/admin/room-addons', methods=['POST'])
def add_room_addon():
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        data = request.json
        
        room_id = data.get('room_id')
        addon_type = data.get('addon_type')
        name = data.get('name')
        price = data.get('price', 0)
        description = data.get('description', '')
        image = data.get('image', '')

        cursor.execute(
            "INSERT INTO room_addons (room_id, addon_type, name, price, description, image) VALUES (%s, %s, %s, %s, %s, %s)",
            (room_id, addon_type, name, price, description, image)
        )
        conn.commit()
        return jsonify({"status": "success", "message": "Layanan tambahan berhasil ditambahkan!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)

@manage_villas_bp.route('/api/admin/room-addons/<int:addon_id>', methods=['PUT', 'DELETE'])
def update_delete_addon(addon_id):
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if request.method == 'PUT':
            data = request.json
            addon_type = data.get('addon_type')
            name = data.get('name')
            price = data.get('price', 0)
            description = data.get('description', '')
            image = data.get('image', '')

            cursor.execute(
                "UPDATE room_addons SET addon_type=%s, name=%s, price=%s, description=%s, image=%s WHERE id=%s",
                (addon_type, name, price, description, image, addon_id)
            )
            conn.commit()
            return jsonify({"status": "success", "message": "Layanan tambahan diperbarui!"}), 200
            
        elif request.method == 'DELETE':
            cursor.execute("DELETE FROM room_addons WHERE id = %s", (addon_id,))
            conn.commit()
            return jsonify({"status": "success", "message": "Layanan tambahan dihapus!"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        _close(cursor, conn)