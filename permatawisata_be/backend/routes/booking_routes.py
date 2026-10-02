from flask import Blueprint, request, jsonify
from db import get_db_connection
from datetime import datetime

booking_bp = Blueprint("booking_bp", __name__)


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

    # ============================================================
# CEK KETERSEDIAAN UNIT / KAMAR UNTUK CUSTOMER
# ============================================================
@booking_bp.route('/api/bookings/available-units', methods=['GET'])
def get_available_units():
    """
    Mengembalikan semua unit dalam sebuah villa.

    Setiap unit akan memiliki:
    - is_available
    - unavailable_reason
    - max_guests
    - price_raw

    Unit yang sudah dibooking pada tanggal yang dipilih
    akan tetap ditampilkan tetapi is_available = False.
    Dengan begitu frontend dapat membuat unit tersebut
    tidak bisa diklik.
    """

    conn = cursor = None

    try:
        villa_id = request.args.get("villa_id")
        check_in = request.args.get("check_in")
        check_out = request.args.get("check_out")
        guests = request.args.get("guests", 1)

        # ----------------------------------------------------
        # VALIDASI PARAMETER
        # ----------------------------------------------------
        if not villa_id:
            return jsonify({
                "status": "error",
                "error": "villa_id wajib diisi."
            }), 400

        if not check_in or not check_out:
            return jsonify({
                "status": "error",
                "error": "check_in dan check_out wajib diisi."
            }), 400

        try:
            villa_id = int(villa_id)
            guests = int(guests)
        except ValueError:
            return jsonify({
                "status": "error",
                "error": "villa_id atau guests tidak valid."
            }), 400

        if guests < 1:
            return jsonify({
                "status": "error",
                "error": "Jumlah tamu minimal 1 orang."
            }), 400

        # ----------------------------------------------------
        # VALIDASI TANGGAL
        # ----------------------------------------------------
        try:
            check_in_date = datetime.strptime(
                check_in,
                "%Y-%m-%d"
            ).date()

            check_out_date = datetime.strptime(
                check_out,
                "%Y-%m-%d"
            ).date()

        except ValueError:
            return jsonify({
                "status": "error",
                "error": "Format tanggal harus YYYY-MM-DD."
            }), 400

        if check_out_date <= check_in_date:
            return jsonify({
                "status": "error",
                "error": "Tanggal check-out harus setelah check-in."
            }), 400

        # ----------------------------------------------------
        # DATABASE
        # ----------------------------------------------------
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)

        # ----------------------------------------------------
        # CEK VILLA
        # ----------------------------------------------------
        cursor.execute(
            """
            SELECT
                id,
                name,
                img,
                guests,
                price
            FROM villas
            WHERE id = %s
            LIMIT 1
            """,
            (villa_id,)
        )

        villa = cursor.fetchone()

        if not villa:
            return jsonify({
                "status": "error",
                "error": "Villa tidak ditemukan."
            }), 404

        # ----------------------------------------------------
        # AMBIL SEMUA UNIT VILLA
        # ----------------------------------------------------
        cursor.execute(
            """
            SELECT
                id,
                villa_id,
                bed_info,
                max_guests,
                price,
                img,
                room_type,
                description,
                facilities,
                other_facilities,
                room_count,
                bathroom_count,
                bathroom_type,
                amenities,
                equipment,
                hours
            FROM villa_details
            WHERE villa_id = %s
            ORDER BY id ASC
            """,
            (villa_id,)
        )

        units = cursor.fetchall()

        # ----------------------------------------------------
        # CEK APAKAH ADA BOOKING LAMA YANG TIDAK MEMILIKI
        # villa_detail_id.
        #
        # Booking lama seperti ini dianggap memblokir
        # seluruh villa pada tanggal tersebut.
        # ----------------------------------------------------
        cursor.execute(
            """
            SELECT id
            FROM bookings
            WHERE villa_id = %s
              AND villa_detail_id IS NULL
              AND status IN (
                  'Menunggu Pembayaran',
                  'Menunggu Verifikasi',
                  'Lunas'
              )
              AND check_in < %s
              AND check_out > %s
            LIMIT 1
            """,
            (
                villa_id,
                check_out_date,
                check_in_date
            )
        )

        legacy_booking = cursor.fetchone()

        # ----------------------------------------------------
        # HASIL UNIT
        # ----------------------------------------------------
        result = []

        for unit in units:

            unit_id = unit.get("id")

            max_guests = unit.get("max_guests")

            # Fallback ke kapasitas villa jika unit tidak punya
            # nilai max_guests.
            if max_guests is None:
                max_guests = villa.get("guests") or 1

            try:
                max_guests = int(max_guests)
            except Exception:
                max_guests = 1

            # ------------------------------------------------
            # KAPASITAS
            # ------------------------------------------------
            if guests > max_guests:
                is_available = False
                unavailable_reason = (
                    f"Unit hanya dapat menampung "
                    f"{max_guests} tamu."
                )

            # ------------------------------------------------
            # BOOKING LEGACY
            # ------------------------------------------------
            elif legacy_booking:
                is_available = False
                unavailable_reason = (
                    "Villa sedang memiliki booking."
                )

            else:

                # --------------------------------------------
                # CEK BOOKING UNIT
                # --------------------------------------------
                cursor.execute(
                    """
                    SELECT id
                    FROM bookings
                    WHERE villa_id = %s
                      AND villa_detail_id = %s
                      AND status IN (
                          'Menunggu Pembayaran',
                          'Menunggu Verifikasi',
                          'Lunas'
                      )
                      AND check_in < %s
                      AND check_out > %s
                    LIMIT 1
                    """,
                    (
                        villa_id,
                        unit_id,
                        check_out_date,
                        check_in_date
                    )
                )

                existing_booking = cursor.fetchone()

                if existing_booking:
                    is_available = False
                    unavailable_reason = (
                        "Unit sudah dibooking pada tanggal tersebut."
                    )
                else:
                    is_available = True
                    unavailable_reason = ""

            # ------------------------------------------------
            # HARGA
            # ------------------------------------------------
            price_raw = unit.get("price") or 0

            try:
                price_raw = float(price_raw)
            except Exception:
                price_raw = 0

            # ------------------------------------------------
            # IMAGE
            # ------------------------------------------------
            image_name = unit.get("img") or ""

            if image_name:
                image_url = (
                    f"/images/villas/villa_{villa_id}"
                    f"/rooms/room_{unit_id}/{image_name}"
                )
            else:
                image_url = (
                    f"/images/villas/villa_{villa_id}/utama.png"
                )

            result.append({
                "id_detail": unit_id,
                "villa_id": villa_id,

                "bed_info": (
                    unit.get("bed_info")
                    or "Standard Room"
                ),

                "max_guests": max_guests,

                "price_raw": price_raw,

                "img": image_name,

                "image_url": image_url,

                "room_type": (
                    unit.get("room_type")
                    or "Standard Room"
                ),

                "description": (
                    unit.get("description")
                    or ""
                ),

                "facilities": (
                    unit.get("facilities")
                    or ""
                ),

                "other_facilities": (
                    unit.get("other_facilities")
                    or ""
                ),

                "room_count": (
                    unit.get("room_count")
                    or 1
                ),

                "bathroom_count": (
                    unit.get("bathroom_count")
                    or 1
                ),

                "bathroom_type": (
                    unit.get("bathroom_type")
                    or ""
                ),

                "amenities": (
                    unit.get("amenities")
                    or ""
                ),

                "equipment": (
                    unit.get("equipment")
                    or ""
                ),

                "hours": (
                    unit.get("hours")
                    or ""
                ),

                "is_available": is_available,

                "unavailable_reason": unavailable_reason
            })

        # ----------------------------------------------------
        # INFORMASI VILLA
        # ----------------------------------------------------
        available_count = sum(
            1
            for item in result
            if item["is_available"]
        )

        return jsonify({
            "status": "success",

            "villa": {
                "id": villa.get("id"),
                "name": villa.get("name"),
                "img": villa.get("img"),
                "guests": villa.get("guests"),
                "price": villa.get("price")
            },

            "check_in": check_in,

            "check_out": check_out,

            "guests": guests,

            "total_units": len(result),

            "available_units": available_count,

            "is_villa_full": (
                len(result) > 0
                and available_count == 0
            ),

            "data": result
        }), 200

    except Exception as e:

        print(
            "GET AVAILABLE UNITS ERROR:",
            repr(e)
        )

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:

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
# 1. CUSTOMER
# MEMBUAT BOOKING BARU
# =========================================================

@booking_bp.route("/api/bookings", methods=["POST"])
def create_booking():
    conn = None
    cursor = None

    try:
        data = request.get_json(silent=True) or {}

        # -------------------------------------------------
        # DATA BOOKING
        # -------------------------------------------------

        villa_id = data.get("villa_id")

        # BARU:
        # ID unit / variasi kamar yang dipilih customer
        villa_detail_id = data.get("villa_detail_id")

        villa_name_from_frontend = data.get("villa_name")

        check_in = data.get("check_in")
        check_out = data.get("check_out")

        guests = data.get("guests")

        full_name = data.get("full_name")
        email = data.get("email")
        whatsapp = data.get("whatsapp")

        total_price = data.get("total_price")

        addons_info = data.get("addons_info", "")

        # -------------------------------------------------
        # PEMBAYARAN
        # -------------------------------------------------

        payment_method = "BCA"
        payment_type = "Manual"

        status = "Menunggu Pembayaran"

        # -------------------------------------------------
        # VALIDASI DATA WAJIB
        # -------------------------------------------------

        required_fields = {
            "villa_id": villa_id,
            "check_in": check_in,
            "check_out": check_out,
            "guests": guests,
            "full_name": full_name,
            "email": email,
            "whatsapp": whatsapp,
            "total_price": total_price,
        }

        missing_fields = [
            key
            for key, value in required_fields.items()
            if value is None or str(value).strip() == ""
        ]

        if missing_fields:
            return jsonify({
                "status": "error",
                "error": "Data booking belum lengkap",
                "missing_fields": missing_fields
            }), 400

        # -------------------------------------------------
        # VALIDASI VILLA ID
        # -------------------------------------------------

        try:
            villa_id = int(villa_id)
        except (TypeError, ValueError):
            return jsonify({
                "status": "error",
                "error": "villa_id tidak valid"
            }), 400

        if villa_id <= 0:
            return jsonify({
                "status": "error",
                "error": "villa_id tidak valid"
            }), 400

        # -------------------------------------------------
        # VALIDASI VILLA DETAIL ID
        # -------------------------------------------------
        # Untuk alur booking baru, customer WAJIB memilih
        # unit. Dengan demikian booking selalu tercatat
        # pada unit yang benar.
        # -------------------------------------------------

        if villa_detail_id in (None, "", "null"):
            return jsonify({
                "status": "error",
                "error": "Unit/villa_detail_id wajib dipilih."
            }), 400

        try:
            villa_detail_id = int(villa_detail_id)
        except (TypeError, ValueError):
            return jsonify({
                "status": "error",
                "error": "villa_detail_id tidak valid"
            }), 400

        if villa_detail_id <= 0:
            return jsonify({
                "status": "error",
                "error": "villa_detail_id tidak valid"
            }), 400

        # -------------------------------------------------
        # VALIDASI TAMU & HARGA
        # -------------------------------------------------

        try:
            guests = int(guests)
            total_price = float(total_price)
        except (TypeError, ValueError):
            return jsonify({
                "status": "error",
                "error": "Jumlah tamu atau total harga tidak valid"
            }), 400

        if guests < 1:
            return jsonify({
                "status": "error",
                "error": "Jumlah tamu minimal 1 orang"
            }), 400

        if total_price < 0:
            return jsonify({
                "status": "error",
                "error": "Total harga tidak boleh negatif"
            }), 400

        # -------------------------------------------------
        # VALIDASI TANGGAL BOOKING
        # -------------------------------------------------
        try:
            check_in_date = datetime.strptime(
                str(check_in),
                "%Y-%m-%d"
            ).date()

            check_out_date = datetime.strptime(
                str(check_out),
                "%Y-%m-%d"
            ).date()

        except (TypeError, ValueError):
            return jsonify({
                "status": "error",
                "error": "Format tanggal harus YYYY-MM-DD."
            }), 400

        if check_out_date <= check_in_date:
            return jsonify({
                "status": "error",
                "error": "Tanggal check-out harus setelah check-in."
            }), 400

        # =================================================
        # DATABASE
        # =================================================

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # -------------------------------------------------
        # CEK VILLA
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                name
            FROM villas
            WHERE id = %s
            LIMIT 1
            """,
            (villa_id,)
        )

        villa = cursor.fetchone()

        if not villa:
            return jsonify({
                "status": "error",
                "error": "Villa tidak ditemukan",
                "villa_id": villa_id
            }), 404

        villa_name = villa["name"]

        # -------------------------------------------------
        # CEK UNIT / VILLA DETAIL
        # -------------------------------------------------
        #
        # Kita hanya membutuhkan:
        # id
        # villa_id
        #
        # sehingga tidak bergantung pada nama kolom lain
        # di tabel villa_details.
        # -------------------------------------------------

        villa_detail = None

        if villa_detail_id is not None:

            cursor.execute(
                """
                SELECT
                    id,
                    villa_id
                FROM villa_details
                WHERE id = %s
                  AND villa_id = %s
                LIMIT 1
                FOR UPDATE
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
                        "Unit yang dipilih tidak ditemukan "
                        "atau bukan bagian dari villa ini."
                    ),
                    "villa_id": villa_id,
                    "villa_detail_id": villa_detail_id
                }), 400

        # =================================================
        # CEK BENTROK BOOKING UNIT
        # =================================================
        #
        # Hanya dilakukan jika customer memilih unit.
        #
        # Status yang dianggap aktif:
        #
        # Menunggu Pembayaran
        # Menunggu Verifikasi
        # Lunas
        #
        # Tujuannya agar dua customer tidak bisa memilih
        # unit yang sama pada tanggal yang bertabrakan.
        # Baris unit dikunci (FOR UPDATE) sampai transaksi
        # selesai agar dua request bersamaan tidak lolos
        # pada saat yang sama.
        # =================================================

        if villa_detail_id is not None:

            cursor.execute(
                """
                SELECT
                    id,
                    check_in,
                    check_out,
                    status
                FROM bookings
                WHERE villa_id = %s
                  AND villa_detail_id = %s
                  AND status IN (
                      'Menunggu Pembayaran',
                      'Menunggu Verifikasi',
                      'Lunas'
                  )
                  AND check_in < %s
                  AND check_out > %s
                LIMIT 1
                """,
                (
                    villa_id,
                    villa_detail_id,
                    check_out_date,
                    check_in_date
                )
            )

            conflict = cursor.fetchone()

            if conflict:

                return jsonify({
                    "status": "error",
                    "error": (
                        "Unit yang Anda pilih sudah memiliki "
                        "booking pada tanggal tersebut."
                    ),
                    "booking_id": conflict["id"],
                    "check_in": (
                        conflict["check_in"].strftime("%Y-%m-%d")
                        if conflict.get("check_in")
                        else None
                    ),
                    "check_out": (
                        conflict["check_out"].strftime("%Y-%m-%d")
                        if conflict.get("check_out")
                        else None
                    )
                }), 409

        # -------------------------------------------------
        # BACKUP:
        # BOOKING LAMA TANPA UNIT
        # -------------------------------------------------
        #
        # Jika ada booking lama villa tersebut dengan
        # villa_detail_id NULL, maka untuk keamanan kita
        # anggap seluruh villa sedang terblokir pada tanggal
        # tersebut.
        #
        # Ini mencegah booking baru masuk ke unit tertentu
        # ketika booking lama sebenarnya belum diketahui
        # unitnya.
        # -------------------------------------------------

        if villa_detail_id is not None:

            cursor.execute(
                """
                SELECT
                    id,
                    check_in,
                    check_out,
                    status
                FROM bookings
                WHERE villa_id = %s
                  AND villa_detail_id IS NULL
                  AND status IN (
                      'Menunggu Pembayaran',
                      'Menunggu Verifikasi',
                      'Lunas'
                  )
                  AND check_in < %s
                  AND check_out > %s
                LIMIT 1
                """,
                (
                    villa_id,
                    check_out_date,
                    check_in_date
                )
            )

            legacy_conflict = cursor.fetchone()

            if legacy_conflict:

                return jsonify({
                    "status": "error",
                    "error": (
                        "Villa memiliki booking lama yang "
                        "belum memiliki informasi unit. "
                        "Silakan pilih tanggal lain atau "
                        "hubungi pengelola."
                    ),
                    "booking_id": legacy_conflict["id"]
                }), 409

        # =================================================
        # INSERT BOOKING
        # =================================================

        cursor.execute(
            """
            INSERT INTO bookings
            (
                villa_id,
                villa_detail_id,
                villa_name,
                check_in,
                check_out,
                guests,
                full_name,
                email,
                whatsapp,
                total_price,
                payment_method,
                payment_type,
                status,
                addons_info
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                villa_id,
                villa_detail_id,
                villa_name,
                check_in,
                check_out,
                guests,
                full_name,
                email,
                whatsapp,
                total_price,
                payment_method,
                payment_type,
                status,
                addons_info
            )
        )

        booking_id = cursor.lastrowid

        conn.commit()

        order_id = f"PW-{booking_id}"

        # =================================================
        # RESPONSE
        # =================================================

        return jsonify({
            "status": "success",
            "message": "Booking berhasil disimpan!",

            "booking_id": booking_id,
            "order_id": order_id,

            "villa": {
                "id": villa_id,
                "name": villa_name
            },

            "villa_detail": {
                "id": villa_detail_id
            },

            "payment_method": payment_method,
            "payment_type": payment_type,
            "booking_status": status
        }), 201

    except Exception as e:

        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        print("Create Booking Error:", str(e))

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)


# =========================================================
# 2. ADMIN
# AMBIL SEMUA BOOKING
# =========================================================

@booking_bp.route("/api/admin/bookings", methods=["GET"])
def get_all_bookings_for_admin():

    conn = None
    cursor = None

    try:

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                b.id,
                b.full_name,
                b.email,
                b.whatsapp,

                COALESCE(
                    v.name,
                    b.villa_name
                ) AS villa_name,

                b.villa_id,
                b.villa_detail_id,

                b.check_in,
                b.check_out,

                b.guests,
                b.total_price,

                b.payment_method,
                b.payment_type,

                b.status,
                b.created_at,

                b.addons_info,

                v.owner_user_id

            FROM bookings b

            LEFT JOIN villas v
                ON b.villa_id = v.id

            ORDER BY
                b.created_at DESC
            """
        )

        bookings = cursor.fetchall()

        for booking in bookings:

            if booking.get("check_in"):
                booking["check_in"] = booking[
                    "check_in"
                ].strftime("%Y-%m-%d")

            if booking.get("check_out"):
                booking["check_out"] = booking[
                    "check_out"
                ].strftime("%Y-%m-%d")

            if booking.get("created_at"):
                booking["created_at"] = booking[
                    "created_at"
                ].strftime("%Y-%m-%d %H:%M:%S")

        return jsonify({
            "status": "success",
            "data": bookings
        }), 200

    except Exception as e:

        print("Admin Booking Error:", str(e))

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)


# =========================================================
# 3. CUSTOMER
# KONFIRMASI PEMBAYARAN MANUAL
# =========================================================

@booking_bp.route(
    "/api/bookings/<int:booking_id>/confirm",
    methods=["PUT"]
)
def confirm_manual_payment(booking_id):

    conn = None
    cursor = None

    try:

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # -------------------------------------------------
        # CARI BOOKING
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                status,
                payment_method,
                payment_type
            FROM bookings
            WHERE id = %s
            LIMIT 1
            """,
            (booking_id,)
        )

        booking = cursor.fetchone()

        if not booking:
            return jsonify({
                "status": "error",
                "error": "Booking tidak ditemukan"
            }), 404

        # -------------------------------------------------
        # HARUS BCA MANUAL
        # -------------------------------------------------

        if (
            str(
                booking["payment_method"]
            ).upper() != "BCA"
            or
            str(
                booking["payment_type"]
            ).lower() != "manual"
        ):

            return jsonify({
                "status": "error",
                "error": (
                    "Booking ini bukan pembayaran "
                    "BCA manual"
                )
            }), 400

        # -------------------------------------------------
        # CEK STATUS
        # -------------------------------------------------

        if booking["status"] in (
            "Lunas",
            "Batal"
        ):

            return jsonify({
                "status": "error",
                "error": (
                    f"Booking sudah berstatus "
                    f"{booking['status']} dan tidak "
                    f"dapat dikonfirmasi ulang"
                )
            }), 400

        # -------------------------------------------------
        # UPDATE
        # -------------------------------------------------

        cursor.execute(
            """
            UPDATE bookings
            SET status = %s
            WHERE id = %s
            """,
            (
                "Menunggu Verifikasi",
                booking_id
            )
        )

        conn.commit()

        return jsonify({
            "status": "success",
            "message": (
                "Pembayaran BCA berhasil dikonfirmasi "
                "dan menunggu verifikasi admin"
            ),
            "booking_id": booking_id,
            "payment_method": "BCA",
            "payment_type": "Manual",
            "booking_status": "Menunggu Verifikasi"
        }), 200

    except Exception as e:

        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        print(
            "Confirm Payment Error:",
            str(e)
        )

        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)