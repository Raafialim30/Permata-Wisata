from flask import Blueprint, request, jsonify
import os
from werkzeug.utils import secure_filename
from db import get_db_connection


manage_villas_bp = Blueprint('manage_villas_bp', __name__)


# ==========================================================
# HELPER: Tutup cursor & connection
# ==========================================================
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


# ==========================================================
# FOLDER GAMBAR
# ==========================================================
def get_villas_img_dir():
    """
    Menentukan lokasi folder gambar villa.

    Production:
        menggunakan UPLOAD_FOLDER jika tersedia.

    Development:
        mencoba folder frontend permatawisata_fe/public/images/villas
        lalu fallback ke public/images/villas.
    """

    env_dir = os.getenv("UPLOAD_FOLDER")

    if env_dir:
        return env_dir

    base_dir = os.path.dirname(
        os.path.dirname(
            os.path.dirname(
                os.path.dirname(
                    os.path.abspath(__file__)
                )
            )
        )
    )

    fe_dir = os.path.join(
        base_dir,
        'permatawisata_fe',
        'public',
        'images',
        'villas'
    )

    if os.path.exists(
        os.path.join(
            base_dir,
            'permatawisata_fe'
        )
    ):
        return fe_dir

    return os.path.join(
        base_dir,
        'public',
        'images',
        'villas'
    )


# ==========================================================
# HELPER OWNER
# ==========================================================
def _get_owner_user_id(data):
    """
    Mengambil owner_user_id dari request.

    Prioritas:
    1. owner_user_id
    2. owner_id hanya sebagai compatibility input
    3. default 2 untuk kondisi project saat ini

    PENTING:
    owner_id lama tidak otomatis dianggap sebagai
    owner_user_id apabila nilainya berbeda.

    Database saat ini:
        users.id = 2 -> Owner
    """

    raw_owner_user_id = data.get("owner_user_id")

    if (
        raw_owner_user_id is not None
        and str(raw_owner_user_id).strip() != ""
    ):
        try:
            owner_user_id = int(raw_owner_user_id)

            if owner_user_id > 0:
                return owner_user_id

        except (TypeError, ValueError):
            pass

    # Compatibility dengan frontend lama.
    #
    # Karena owner_id lama pada tabel villas bukan
    # foreign key Owner baru, kita TIDAK memakainya
    # sebagai owner_user_id.
    #
    # Untuk kondisi project sekarang, Owner utama adalah ID 2.
    return 2


# ==========================================================
# HELPER VALIDASI OWNER
# ==========================================================
def _owner_exists(cursor, owner_user_id):
    cursor.execute(
        """
        SELECT id, username, role
        FROM users
        WHERE id = %s
        LIMIT 1
        """,
        (owner_user_id,)
    )

    user = cursor.fetchone()

    if not user:
        return False, None

    # Owner harus memiliki role owner.
    if str(user.get("role", "")).lower() != "owner":
        return False, user

    return True, user


# ==========================================================
# 1. ADMIN: TAMBAH VILLA
# ==========================================================
@manage_villas_bp.route(
    '/api/admin/villas',
    methods=['POST']
)
def add_villa():

    conn = cursor = None

    try:
        data = request.get_json(
            silent=True
        ) or {}

        # --------------------------------------------------
        # Data villa
        # --------------------------------------------------
        villa_id = data.get('id')

        name = data.get('name')

        location = data.get(
            'location',
            'Yogyakarta'
        )

        raw_price = data.get('price')

        try:
            price = int(raw_price) if raw_price else 0
        except (TypeError, ValueError):
            price = 0

        rating = data.get(
            'rating',
            5
        )

        guests = data.get(
            'guests',
            4
        )

        beds = data.get(
            'beds',
            2
        )

        baths = data.get(
            'baths',
            1
        )

        bed_type = data.get(
            'bed_type',
            '1 King Size'
        )

        check_in_time = data.get(
            'check_in_time',
            '14:00'
        )

        check_out_time = data.get(
            'check_out_time',
            '12:00'
        )

        status = data.get(
            'status',
            'available'
        )

        whatsapp = (
            data.get('whatsapp')
            or data.get('link_wa')
            or ''
        )

        v_type = data.get(
            'type',
            'Villa'
        )

        # --------------------------------------------------
        # Detail villa
        # --------------------------------------------------
        room_count = data.get(
            'room_count',
            '1'
        )

        bathroom_type = data.get(
            'bathroom_type',
            '-'
        )

        hours = data.get(
            'hours',
            '-'
        )

        description = data.get(
            'description',
            ''
        )

        amenities = data.get(
            'amenities',
            ''
        )

        equipment = data.get(
            'equipment',
            ''
        )

        facilities = data.get(
            'facilities',
            ''
        )

        img = data.get(
            'img',
            'villa1.jpg'
        )

        catalog_link = data.get(
            'catalog_link',
            ''
        )

        promo = data.get(
            'promo',
            ''
        )

        # --------------------------------------------------
        # OWNER
        # --------------------------------------------------
        owner_user_id = _get_owner_user_id(data)

        # --------------------------------------------------
        # Validasi nama
        # --------------------------------------------------
        if not name or str(name).strip() == "":
            return jsonify({
                "status": "error",
                "error": "Nama villa wajib diisi"
            }), 400

        # --------------------------------------------------
        # Validasi owner
        # --------------------------------------------------
        conn = get_db_connection()
        cursor = conn.cursor(
            dictionary=True
        )

        owner_valid, owner = _owner_exists(
            cursor,
            owner_user_id
        )

        if not owner_valid:
            return jsonify({
                "status": "error",
                "error": (
                    "Owner tidak valid. "
                    "owner_user_id harus mengarah "
                    "ke users dengan role 'owner'."
                ),
                "owner_user_id": owner_user_id
            }), 400

        # --------------------------------------------------
        # INSERT VILLA
        #
        # owner_id LAMA tetap disimpan sebagai compatibility
        # field.
        #
        # owner_user_id adalah relasi Owner BARU.
        # --------------------------------------------------
        if villa_id:

            cursor.execute(
                """
                INSERT INTO villas
                (
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
                    owner_id,
                    owner_user_id,
                    room_count,
                    bathroom_type,
                    hours,
                    description,
                    amenities,
                    equipment,
                    facilities
                )
                VALUES
                (
                    %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s
                )
                """,
                (
                    villa_id,
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
                    v_type,
                    img,
                    whatsapp,
                    catalog_link,
                    promo,

                    # owner_id LAMA
                    data.get(
                        'owner_id',
                        owner_user_id
                    ),

                    # owner_user_id BARU
                    owner_user_id,

                    room_count,
                    bathroom_type,
                    hours,
                    description,
                    amenities,
                    equipment,
                    facilities
                )
            )

        else:

            cursor.execute(
                """
                INSERT INTO villas
                (
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
                    owner_id,
                    owner_user_id,
                    room_count,
                    bathroom_type,
                    hours,
                    description,
                    amenities,
                    equipment,
                    facilities
                )
                VALUES
                (
                    %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s
                )
                """,
                (
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
                    v_type,
                    img,
                    whatsapp,
                    catalog_link,
                    promo,

                    # owner_id LAMA
                    data.get(
                        'owner_id',
                        owner_user_id
                    ),

                    # owner_user_id BARU
                    owner_user_id,

                    room_count,
                    bathroom_type,
                    hours,
                    description,
                    amenities,
                    equipment,
                    facilities
                )
            )

            villa_id = cursor.lastrowid

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Villa berhasil ditambahkan!",
            "villa_id": villa_id,
            "owner_user_id": owner_user_id
        }), 201

    except Exception as e:

        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)


# ==========================================================
# 2. ADMIN: SEMUA VILLA
# ==========================================================
@manage_villas_bp.route(
    '/api/admin/villas',
    methods=['GET']
)
def get_villas():

    conn = cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT *
            FROM villas
            ORDER BY id ASC
            """
        )

        return jsonify({
            "status": "success",
            "data": cursor.fetchall()
        }), 200

    except Exception as e:

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)


# ==========================================================
# 3. ADMIN: NEXT VILLA ID
# ==========================================================
@manage_villas_bp.route(
    '/api/admin/villas/next_id',
    methods=['GET']
)
def get_next_villa_id():

    conn = cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT AUTO_INCREMENT
            FROM information_schema.tables
            WHERE table_name = 'villas'
            AND table_schema = DATABASE()
            """
        )

        res = cursor.fetchone()

        next_id = (
            res['AUTO_INCREMENT']
            if res and res.get('AUTO_INCREMENT')
            else 1
        )

        return jsonify({
            "status": "success",
            "next_id": next_id
        }), 200

    except Exception as e:

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)


# ==========================================================
# 4. ADMIN: EDIT VILLA
# ==========================================================
@manage_villas_bp.route(
    '/api/admin/villas/<int:villa_id>',
    methods=['PUT']
)
def edit_villa(villa_id):

    conn = cursor = None

    try:
        data = request.get_json(
            silent=True
        ) or {}

        whatsapp = (
            data.get('whatsapp')
            or data.get('link_wa')
            or ''
        )

        conn = get_db_connection()
        cursor = conn.cursor(
            dictionary=True
        )

        # --------------------------------------------------
        # Pastikan villa ada
        # --------------------------------------------------
        cursor.execute(
            """
            SELECT id, owner_user_id, owner_id
            FROM villas
            WHERE id = %s
            LIMIT 1
            """,
            (villa_id,)
        )

        existing_villa = cursor.fetchone()

        if not existing_villa:
            return jsonify({
                "status": "error",
                "error": "Villa tidak ditemukan"
            }), 404

        # --------------------------------------------------
        # OWNER
        #
        # Jika owner_user_id dikirim, gunakan nilai baru.
        # Jika tidak, pertahankan owner_user_id lama.
        # --------------------------------------------------
        owner_user_id = data.get(
            'owner_user_id'
        )

        if owner_user_id is None or str(
            owner_user_id
        ).strip() == "":

            owner_user_id = (
                existing_villa.get(
                    'owner_user_id'
                )
            )

        try:
            owner_user_id = int(
                owner_user_id
            )
        except (TypeError, ValueError):

            return jsonify({
                "status": "error",
                "error": "owner_user_id tidak valid"
            }), 400

        # --------------------------------------------------
        # Validasi owner
        # --------------------------------------------------
        owner_valid, owner = _owner_exists(
            cursor,
            owner_user_id
        )

        if not owner_valid:
            return jsonify({
                "status": "error",
                "error": (
                    "owner_user_id harus mengarah "
                    "ke users dengan role 'owner'."
                )
            }), 400

        # --------------------------------------------------
        # UPDATE
        #
        # owner_id lama TIDAK diubah.
        # owner_user_id baru yang diubah.
        # --------------------------------------------------
        cursor.execute(
            """
            UPDATE villas
            SET
                name = %s,
                location = %s,
                price = %s,
                rating = %s,
                guests = %s,
                beds = %s,
                baths = %s,
                bed_type = %s,
                check_in_time = %s,
                check_out_time = %s,
                status = %s,
                whatsapp = %s,
                img = %s,
                room_count = %s,
                bathroom_type = %s,
                hours = %s,
                description = %s,
                amenities = %s,
                equipment = %s,
                facilities = %s,
                promo = %s,
                owner_user_id = %s
            WHERE id = %s
            """,
            (
                data.get('name'),
                data.get('location'),
                data.get('price'),
                data.get('rating'),
                data.get('guests'),
                data.get('beds'),
                data.get('baths'),
                data.get('bed_type'),
                data.get('check_in_time'),
                data.get('check_out_time'),
                data.get('status'),
                whatsapp,
                data.get(
                    'img',
                    'utama.png'
                ),
                data.get(
                    'room_count',
                    '1'
                ),
                data.get(
                    'bathroom_type',
                    '-'
                ),
                data.get(
                    'hours',
                    '-'
                ),
                data.get(
                    'description',
                    ''
                ),
                data.get(
                    'amenities',
                    ''
                ),
                data.get(
                    'equipment',
                    ''
                ),
                data.get(
                    'facilities',
                    ''
                ),
                data.get(
                    'promo',
                    '0'
                ),
                owner_user_id,
                villa_id
            )
        )

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Detail Villa berhasil diperbarui!",
            "villa_id": villa_id,
            "owner_user_id": owner_user_id
        }), 200

    except Exception as e:

        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)


# ==========================================================
# 5. ADMIN: HAPUS VILLA
# ==========================================================
@manage_villas_bp.route(
    '/api/admin/villas/<int:villa_id>',
    methods=['DELETE']
)
def delete_villa(villa_id):

    conn = cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            DELETE FROM villas
            WHERE id = %s
            """,
            (villa_id,)
        )

        if cursor.rowcount == 0:
            return jsonify({
                "status": "error",
                "error": "Villa tidak ditemukan"
            }), 404

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Villa berhasil dihapus!"
        }), 200

    except Exception as e:

        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)


# ==========================================================
# 6. DETAIL KAMAR - GET & POST
# ==========================================================
@manage_villas_bp.route(
    '/api/admin/villa-details',
    methods=['GET', 'POST']
)
def handle_villa_details():

    conn = cursor = None

    try:
        conn = get_db_connection()

        # --------------------------------------------------
        # GET
        # --------------------------------------------------
        if request.method == 'GET':

            cursor = conn.cursor(
                dictionary=True
            )

            villa_id = request.args.get(
                'villa_id'
            )

            if villa_id:

                cursor.execute(
                    """
                    SELECT *
                    FROM villa_details
                    WHERE villa_id = %s
                    ORDER BY id ASC
                    """,
                    (villa_id,)
                )

            else:

                cursor.execute(
                    """
                    SELECT *
                    FROM villa_details
                    ORDER BY id ASC
                    """
                )

            rooms = cursor.fetchall()

            return jsonify({
                "status": "success",
                "data": rooms
            }), 200

        # --------------------------------------------------
        # POST
        # --------------------------------------------------
        cursor = conn.cursor()

        data = request.get_json(
            silent=True
        ) or {}

        villa_id = data.get(
            'villa_id'
        )

        if not villa_id:
            return jsonify({
                "status": "error",
                "error": "villa_id wajib diisi"
            }), 400

        bed_info = (
            data.get('bed_info')
            or data.get('room_name')
            or ''
        )

        room_type = data.get(
            'room_type',
            'Standard Room'
        )

        try:
            price = int(
                data.get(
                    'price',
                    0
                )
                or 0
            )
        except (TypeError, ValueError):
            price = 0

        facilities = data.get(
            'facilities',
            ''
        )

        img = data.get(
            'img',
            ''
        )

        snk = data.get(
            'snk',
            ''
        )

        description = data.get(
            'description',
            ''
        )

        max_guests = data.get(
            'max_guests',
            ''
        )

        max_age_rule = data.get(
            'max_age_rule',
            ''
        )

        other_facilities = data.get(
            'other_facilities',
            ''
        )

        room_count = data.get(
            'room_count',
            ''
        )

        bathroom_count = data.get(
            'bathroom_count',
            ''
        )

        bathroom_type = data.get(
            'bathroom_type',
            ''
        )

        amenities = data.get(
            'amenities',
            ''
        )

        equipment = data.get(
            'equipment',
            ''
        )

        hours = data.get(
            'hours',
            ''
        )

        location = data.get(
            'location',
            ''
        )

        cursor.execute(
            """
            INSERT INTO villa_details
            (
                villa_id,
                bed_info,
                room_type,
                price,
                facilities,
                img,
                snk,
                description,
                max_guests,
                max_age_rule,
                other_facilities,
                room_count,
                bathroom_count,
                bathroom_type,
                amenities,
                equipment,
                hours,
                location
            )
            VALUES
            (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s
            )
            """,
            (
                villa_id,
                bed_info,
                room_type,
                price,
                facilities,
                img,
                snk,
                description,
                max_guests,
                max_age_rule,
                other_facilities,
                room_count,
                bathroom_count,
                bathroom_type,
                amenities,
                equipment,
                hours,
                location
            )
        )

        new_room_id = cursor.lastrowid

        # --------------------------------------------------
        # BUAT FOLDER FISIK KAMAR SECARA OTOMATIS
        #
        # Struktur:
        # images/villas/
        #   villa_<villa_id>/
        #       rooms/
        #           room_<room_id>/
        #
        # Folder dibuat sejak record kamar dibuat.
        # --------------------------------------------------
        room_folder = os.path.join(
            get_villas_img_dir(),
            f"villa_{str(villa_id).strip()}",
            "rooms",
            f"room_{new_room_id}"
        )

        os.makedirs(room_folder, exist_ok=True)

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Variasi kamar berhasil disimpan dan folder kamar dibuat!",
            "room_id": new_room_id,
            "folder": room_folder
        }), 201

    except Exception as e:

        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)


# ==========================================================
# 7. EDIT / DELETE KAMAR
# ==========================================================
@manage_villas_bp.route(
    '/api/admin/villa-details/<int:room_id>',
    methods=['PUT', 'DELETE']
)
def update_delete_room(room_id):

    conn = cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # --------------------------------------------------
        # PUT
        # --------------------------------------------------
        if request.method == 'PUT':

            data = request.get_json(
                silent=True
            ) or {}

            bed_info = (
                data.get('bed_info')
                or data.get('room_name')
                or ''
            )

            room_type = data.get(
                'room_type',
                'Standard Room'
            )

            try:
                price = int(
                    data.get(
                        'price',
                        0
                    )
                    or 0
                )
            except (TypeError, ValueError):
                price = 0

            facilities = data.get(
                'facilities',
                ''
            )

            img = data.get(
                'img',
                ''
            )

            description = data.get(
                'description',
                ''
            )

            max_guests = data.get(
                'max_guests',
                ''
            )

            max_age_rule = data.get(
                'max_age_rule',
                ''
            )

            other_facilities = data.get(
                'other_facilities',
                ''
            )

            snk = data.get(
                'snk',
                ''
            )

            room_count = data.get(
                'room_count',
                ''
            )

            bathroom_count = data.get(
                'bathroom_count',
                ''
            )

            bathroom_type = data.get(
                'bathroom_type',
                ''
            )

            amenities = data.get(
                'amenities',
                ''
            )

            equipment = data.get(
                'equipment',
                ''
            )

            hours = data.get(
                'hours',
                ''
            )

            location = data.get(
                'location',
                ''
            )

            cursor.execute(
                """
                UPDATE villa_details
                SET
                    bed_info = %s,
                    room_type = %s,
                    price = %s,
                    facilities = %s,
                    img = %s,
                    description = %s,
                    max_guests = %s,
                    max_age_rule = %s,
                    other_facilities = %s,
                    snk = %s,
                    room_count = %s,
                    bathroom_count = %s,
                    bathroom_type = %s,
                    amenities = %s,
                    equipment = %s,
                    hours = %s,
                    location = %s
                WHERE id = %s
                """,
                (
                    bed_info,
                    room_type,
                    price,
                    facilities,
                    img,
                    description,
                    max_guests,
                    max_age_rule,
                    other_facilities,
                    snk,
                    room_count,
                    bathroom_count,
                    bathroom_type,
                    amenities,
                    equipment,
                    hours,
                    location,
                    room_id
                )
            )

            if cursor.rowcount == 0:
                return jsonify({
                    "status": "error",
                    "error": "Kamar tidak ditemukan"
                }), 404

            # Pastikan folder fisik kamar selalu tersedia,
            # termasuk kamar lama yang dibuat sebelum sistem folder
            # otomatis diterapkan.
            cursor.execute(
                "SELECT villa_id FROM villa_details WHERE id = %s LIMIT 1",
                (room_id,)
            )
            room_owner = cursor.fetchone()

            if room_owner:
                room_folder = os.path.join(
                    get_villas_img_dir(),
                    f"villa_{str(room_owner[0]).strip()}",
                    "rooms",
                    f"room_{room_id}"
                )
                os.makedirs(room_folder, exist_ok=True)

            conn.commit()

            return jsonify({
                "status": "success",
                "message": "Kamar berhasil diperbarui dan folder kamar dipastikan tersedia!"
            }), 200

        # --------------------------------------------------
        # DELETE
        # --------------------------------------------------
        cursor.execute(
            """
            DELETE FROM villa_details
            WHERE id = %s
            """,
            (room_id,)
        )

        if cursor.rowcount == 0:
            return jsonify({
                "status": "error",
                "error": "Kamar tidak ditemukan"
            }), 404

        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Kamar berhasil dihapus dari sistem!"
        }), 200

    except Exception as e:

        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)


# ==========================================================
# 8. UPLOAD GAMBAR
# ==========================================================
@manage_villas_bp.route(
    '/api/admin/upload',
    methods=['POST']
)
def upload_image():

    try:
        if 'file' not in request.files:
            return jsonify({
                "status": "error",
                "error": "Tidak ada file yang diunggah"
            }), 400

        file = request.files['file']

        villa_id = request.form.get(
            'villa_id'
        )

        folder_type = request.form.get(
            'folder_type'
        )

        target_filename = request.form.get(
            'filename'
        )

        if not file or file.filename == '':
            return jsonify({
                "status": "error",
                "error": "File kosong"
            }), 400

        if (
            not villa_id
            or not folder_type
            or not target_filename
        ):
            return jsonify({
                "status": "error",
                "error": (
                    "Parameter tidak lengkap "
                    "(butuh villa_id, folder_type, filename)"
                )
            }), 400

        # --------------------------------------------------
        # Validasi villa_id
        # --------------------------------------------------
        villa_id_str = str(
            villa_id
        ).strip()

        if (
            not villa_id_str.isdigit()
            or int(villa_id_str) < 0
        ):
            return jsonify({
                "status": "error",
                "error": "Villa ID tidak valid"
            }), 400

        # --------------------------------------------------
        # Validasi extension
        # --------------------------------------------------
        allowed_exts = (
            '.png',
            '.jpg',
            '.jpeg',
            '.webp',
            '.gif'
        )

        filename_safe = secure_filename(
            target_filename
        ).lower()

        if not any(
            filename_safe.endswith(ext)
            for ext in allowed_exts
        ):
            return jsonify({
                "status": "error",
                "error": (
                    "Tipe file tidak didukung. "
                    "Gunakan PNG, JPG, JPEG, WEBP, atau GIF"
                )
            }), 400

        # --------------------------------------------------
        # Folder utama
        # --------------------------------------------------
        villas_img_dir = get_villas_img_dir()

        if folder_type == 'main':

            target_dir = os.path.join(
                villas_img_dir,
                f"villa_{villa_id_str}"
            )

        elif folder_type == 'room':

            room_id = request.form.get(
                'room_id'
            )

            if not room_id:
                return jsonify({
                    "status": "error",
                    "error": (
                        "Room ID diperlukan "
                        "untuk folder 'room'"
                    )
                }), 400

            room_id_str = str(
                room_id
            ).strip()

            if (
                not room_id_str.isdigit()
                or int(room_id_str) < 0
            ):
                return jsonify({
                    "status": "error",
                    "error": "Room ID tidak valid"
                }), 400

            target_dir = os.path.join(
                villas_img_dir,
                f"villa_{villa_id_str}",
                "rooms",
                f"room_{room_id_str}"
            )

        else:

            return jsonify({
                "status": "error",
                "error": (
                    "folder_type tidak valid "
                    "(harus 'main' atau 'room')"
                )
            }), 400

        # --------------------------------------------------
        # Path traversal protection
        # --------------------------------------------------
        target_dir_resolved = os.path.abspath(
            target_dir
        )

        villas_base_resolved = os.path.abspath(
            villas_img_dir
        )

        if not (
            target_dir_resolved == villas_base_resolved
            or target_dir_resolved.startswith(
                villas_base_resolved + os.sep
            )
        ):
            return jsonify({
                "status": "error",
                "error": (
                    "Path tidak valid - "
                    "kemungkinan path traversal attack"
                )
            }), 400

        os.makedirs(
            target_dir,
            exist_ok=True
        )

        file_path = os.path.join(
            target_dir,
            filename_safe
        )

        # --------------------------------------------------
        # Hapus file lama jika ada
        # --------------------------------------------------
        if os.path.exists(file_path):

            try:
                os.remove(file_path)

            except Exception as e:

                print(
                    "Warning: Gagal menghapus "
                    f"file lama: {e}"
                )

        file.save(file_path)

        return jsonify({
            "status": "success",
            "message": "File berhasil diunggah",
            "filename": filename_safe,
            "path": file_path
        }), 200

    except Exception as e:

        return jsonify({
            "status": "error",
            "error": (
                f"Gagal mengunggah file: {str(e)}"
            )
        }), 500


# ==========================================================
# 9. BACA GALERI
# ==========================================================
@manage_villas_bp.route(
    '/api/admin/gallery',
    methods=['GET']
)
def get_gallery():

    try:
        villa_id = request.args.get(
            'villa_id'
        )

        folder_type = request.args.get(
            'folder_type',
            'room'
        )

        room_id = request.args.get(
            'room_id'
        )

        if not villa_id:
            return jsonify({
                "status": "error",
                "error": "Butuh villa_id"
            }), 400

        villa_id_str = str(
            villa_id
        ).strip()

        if (
            not villa_id_str.isdigit()
            or int(villa_id_str) < 0
        ):
            return jsonify({
                "status": "error",
                "error": "Villa ID tidak valid"
            }), 400

        villas_img_dir = os.path.join(
            get_villas_img_dir(),
            f"villa_{villa_id_str}"
        )

        if folder_type == 'room':

            if room_id:

                room_id_str = str(
                    room_id
                ).strip()

                if (
                    not room_id_str.isdigit()
                    or int(room_id_str) < 0
                ):
                    return jsonify({
                        "status": "error",
                        "error": "Room ID tidak valid"
                    }), 400

                target_dir = os.path.join(
                    villas_img_dir,
                    'rooms',
                    f"room_{room_id_str}"
                )

            else:

                target_dir = os.path.join(
                    villas_img_dir,
                    'rooms'
                )

        elif folder_type == 'main':

            target_dir = villas_img_dir

        else:

            return jsonify({
                "status": "error",
                "error": "folder_type tidak valid"
            }), 400

        if not os.path.exists(target_dir):
            return jsonify({
                "status": "success",
                "data": []
            }), 200

        valid_exts = (
            '.png',
            '.jpg',
            '.jpeg',
            '.webp',
            '.gif'
        )

        files = [
            filename
            for filename in os.listdir(
                target_dir
            )
            if os.path.isfile(
                os.path.join(
                    target_dir,
                    filename
                )
            )
            and filename.lower().endswith(
                valid_exts
            )
        ]

        files.sort()

        return jsonify({
            "status": "success",
            "data": files
        }), 200

    except Exception as e:

        return jsonify({
            "status": "error",
            "error": (
                f"Gagal membaca galeri: {str(e)}"
            )
        }), 500


# ==========================================================
# 10. DELETE GAMBAR
# ==========================================================
@manage_villas_bp.route(
    '/api/admin/gallery',
    methods=['DELETE']
)
def delete_gallery_image():

    try:
        villa_id = request.args.get(
            'villa_id'
        )

        folder_type = request.args.get(
            'folder_type',
            'room'
        )

        room_id = request.args.get(
            'room_id'
        )

        filename = request.args.get(
            'filename'
        )

        if not villa_id or not filename:
            return jsonify({
                "status": "error",
                "error": (
                    "Butuh villa_id dan filename"
                )
            }), 400

        villa_id_str = str(
            villa_id
        ).strip()

        if (
            not villa_id_str.isdigit()
            or int(villa_id_str) < 0
        ):
            return jsonify({
                "status": "error",
                "error": "Villa ID tidak valid"
            }), 400

        filename_safe = secure_filename(
            filename
        ).lower()

        allowed_exts = (
            '.png',
            '.jpg',
            '.jpeg',
            '.webp',
            '.gif'
        )

        if not any(
            filename_safe.endswith(ext)
            for ext in allowed_exts
        ):
            return jsonify({
                "status": "error",
                "error": "Format file tidak valid"
            }), 400

        if (
            '/' in filename_safe
            or '\\' in filename_safe
            or filename_safe.startswith('.')
        ):
            return jsonify({
                "status": "error",
                "error": (
                    "Path traversal terdeteksi"
                )
            }), 400

        villas_img_dir = os.path.join(
            get_villas_img_dir(),
            f"villa_{villa_id_str}"
        )

        if folder_type == 'room':

            if not room_id:
                return jsonify({
                    "status": "error",
                    "error": (
                        "Room ID diperlukan "
                        "untuk folder 'room'"
                    )
                }), 400

            room_id_str = str(
                room_id
            ).strip()

            if (
                not room_id_str.isdigit()
                or int(room_id_str) < 0
            ):
                return jsonify({
                    "status": "error",
                    "error": "Room ID tidak valid"
                }), 400

            target_dir = os.path.join(
                villas_img_dir,
                'rooms',
                f"room_{room_id_str}"
            )

        elif folder_type == 'main':

            target_dir = villas_img_dir

        else:

            return jsonify({
                "status": "error",
                "error": "folder_type tidak valid"
            }), 400

        # --------------------------------------------------
        # Path traversal protection
        # --------------------------------------------------
        target_dir_resolved = os.path.abspath(
            target_dir
        )

        villas_base_resolved = os.path.abspath(
            os.path.dirname(
                villas_img_dir
            )
        )

        if not (
            target_dir_resolved == villas_base_resolved
            or target_dir_resolved.startswith(
                villas_base_resolved + os.sep
            )
        ):
            return jsonify({
                "status": "error",
                "error": (
                    "Path tidak valid - "
                    "kemungkinan path traversal attack"
                )
            }), 400

        file_path = os.path.join(
            target_dir,
            filename_safe
        )

        if not os.path.exists(file_path):
            return jsonify({
                "status": "error",
                "error": "File tidak ditemukan"
            }), 404

        try:
            os.remove(file_path)

            return jsonify({
                "status": "success",
                "message": (
                    f"Gambar '{filename_safe}' "
                    "berhasil dihapus"
                ),
                "filename": filename_safe
            }), 200

        except Exception as e:

            return jsonify({
                "status": "error",
                "error": (
                    f"Gagal menghapus file: {str(e)}"
                )
            }), 500

    except Exception as e:

        return jsonify({
            "status": "error",
            "error": (
                f"Gagal memproses permintaan: {str(e)}"
            )
        }), 500


# ==========================================================
# 11. TAMBAH ROOM ADDON
# ==========================================================
@manage_villas_bp.route(
    '/api/admin/room-addons',
    methods=['POST']
)
def add_room_addon():

    conn = cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        data = request.get_json(
            silent=True
        ) or {}

        room_id = data.get(
            'room_id'
        )

        addon_type = data.get(
            'addon_type'
        )

        name = data.get(
            'name'
        )

        price = data.get(
            'price',
            0
        )

        description = data.get(
            'description',
            ''
        )

        image = data.get(
            'image',
            ''
        )

        cursor.execute(
            """
            INSERT INTO room_addons
            (
                room_id,
                addon_type,
                name,
                price,
                description,
                image
            )
            VALUES
            (
                %s, %s, %s, %s, %s, %s
            )
            """,
            (
                room_id,
                addon_type,
                name,
                price,
                description,
                image
            )
        )

        conn.commit()

        return jsonify({
            "status": "success",
            "message": (
                "Layanan tambahan berhasil "
                "ditambahkan!"
            ),
            "addon_id": cursor.lastrowid
        }), 201

    except Exception as e:

        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)


# ==========================================================
# 12. EDIT / DELETE ROOM ADDON
# ==========================================================
@manage_villas_bp.route(
    '/api/admin/room-addons/<int:addon_id>',
    methods=['PUT', 'DELETE']
)
def update_delete_addon(addon_id):

    conn = cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # --------------------------------------------------
        # PUT
        # --------------------------------------------------
        if request.method == 'PUT':

            data = request.get_json(
                silent=True
            ) or {}

            addon_type = data.get(
                'addon_type'
            )

            name = data.get(
                'name'
            )

            price = data.get(
                'price',
                0
            )

            description = data.get(
                'description',
                ''
            )

            image = data.get(
                'image',
                ''
            )

            cursor.execute(
                """
                UPDATE room_addons
                SET
                    addon_type = %s,
                    name = %s,
                    price = %s,
                    description = %s,
                    image = %s
                WHERE id = %s
                """,
                (
                    addon_type,
                    name,
                    price,
                    description,
                    image,
                    addon_id
                )
            )

            if cursor.rowcount == 0:
                return jsonify({
                    "status": "error",
                    "error": (
                        "Layanan tambahan "
                        "tidak ditemukan"
                    )
                }), 404

            conn.commit()

            return jsonify({
                "status": "success",
                "message": (
                    "Layanan tambahan "
                    "diperbarui!"
                )
            }), 200

        # --------------------------------------------------
        # DELETE
        # --------------------------------------------------
        cursor.execute(
            """
            DELETE FROM room_addons
            WHERE id = %s
            """,
            (addon_id,)
        )

        if cursor.rowcount == 0:
            return jsonify({
                "status": "error",
                "error": (
                    "Layanan tambahan "
                    "tidak ditemukan"
                )
            }), 404

        conn.commit()

        return jsonify({
            "status": "success",
            "message": (
                "Layanan tambahan dihapus!"
            )
        }), 200

    except Exception as e:

        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)