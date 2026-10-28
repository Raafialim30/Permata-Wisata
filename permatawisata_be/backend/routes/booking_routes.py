import json
from datetime import datetime, date
from typing import Any, List
from flask import Blueprint, request, jsonify
from db import get_db_connection
from security import require_admin

booking_bp = Blueprint("booking_bp", __name__)


# =========================================================
# HELPER KONVERSI & PEMBERSIHAN DATA
# =========================================================

def _close(cursor=None, conn=None):
    if cursor:
        try:
            cursor.close()
        except Exception:
            pass

    if conn:
        try:
            conn.close()
        except Exception:
            pass


def _to_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    try:
        return float(str(val))  # type: ignore
    except (ValueError, TypeError):
        return default


def _to_int(val: Any, default: int = 0) -> int:
    if val is None:
        return default
    try:
        return int(str(val))  # type: ignore
    except (ValueError, TypeError):
        return default


# ============================================================
# 1. CEK KETERSEDIAAN UNIT / KAMAR UNTUK CUSTOMER
# ============================================================
@booking_bp.route('/api/bookings/available-units', methods=['GET'])
def get_available_units():
    conn = cursor = None

    try:
        raw_villa_id = request.args.get("villa_id")
        check_in = request.args.get("check_in")
        check_out = request.args.get("check_out")
        raw_guests = request.args.get("guests", 1)

        if not raw_villa_id:
            return jsonify({
                "status": "error",
                "error": "villa_id wajib diisi."
            }), 400

        if not check_in or not check_out:
            return jsonify({
                "status": "error",
                "error": "check_in dan check_out wajib diisi."
            }), 400

        villa_id = _to_int(raw_villa_id)
        guests = _to_int(raw_guests)

        if villa_id <= 0 or guests <= 0:
            return jsonify({
                "status": "error",
                "error": "villa_id atau guests tidak valid."
            }), 400

        try:
            check_in_date: date = datetime.strptime(f"{check_in}", "%Y-%m-%d").date()
            check_out_date: date = datetime.strptime(f"{check_out}", "%Y-%m-%d").date()
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

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)

        cursor.execute(
            "SELECT setting_value FROM settings WHERE setting_key = 'commission_rate' LIMIT 1"
        )
        s_row = cursor.fetchone()
        commission_rate = 10.0
        if isinstance(s_row, dict):
            commission_rate = _to_float(s_row.get('setting_value'), 10.0)

        cursor.execute(
            """
            SELECT id, name, img, guests, price
            FROM villas
            WHERE id = %s
            LIMIT 1
            """,
            (villa_id,)
        )
        villa = cursor.fetchone()

        if not villa or not isinstance(villa, dict):
            return jsonify({
                "status": "error",
                "error": "Villa tidak ditemukan."
            }), 404

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
        units = cursor.fetchall() or []

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
            (villa_id, check_out_date, check_in_date)
        )
        legacy_booking = cursor.fetchone()

        result = []
        villa_base_price = _to_float(villa.get("price"))

        for unit in units:
            if not isinstance(unit, dict):
                continue

            unit_id = _to_int(unit.get("id"))
            raw_max_guests = unit.get("max_guests")

            if raw_max_guests is None:
                max_guests = _to_int(villa.get("guests"), 1)
            else:
                max_guests = _to_int(raw_max_guests, 1)

            if max_guests < 1:
                max_guests = 1

            if guests > max_guests:
                is_available = False
                unavailable_reason = f"Unit hanya dapat menampung {max_guests} tamu."
            elif legacy_booking:
                is_available = False
                unavailable_reason = "Villa sedang memiliki booking."
            else:
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
                    (villa_id, unit_id, check_out_date, check_in_date)
                )
                existing_booking = cursor.fetchone()

                if existing_booking:
                    is_available = False
                    unavailable_reason = "Unit sudah dibooking pada tanggal tersebut."
                else:
                    is_available = True
                    unavailable_reason = ""

            raw_unit_price = unit.get("price")
            u_price = _to_float(raw_unit_price)
            price_base = u_price if u_price > 0 else villa_base_price
            price_public = round(price_base * (1 + commission_rate / 100))

            image_name = str(unit.get("img") or "")
            if image_name:
                image_url = f"/images/villas/villa_{villa_id}/rooms/room_{unit_id}/{image_name}"
            else:
                image_url = f"/images/villas/villa_{villa_id}/utama.png"

            result.append({
                "id_detail": unit_id,
                "villa_id": villa_id,
                "bed_info": str(unit.get("bed_info") or "Standard Room"),
                "max_guests": max_guests,
                "price_raw": price_public,
                "price": price_public,
                "img": image_name,
                "image_url": image_url,
                "room_type": str(unit.get("room_type") or "Standard Room"),
                "description": str(unit.get("description") or ""),
                "facilities": str(unit.get("facilities") or ""),
                "other_facilities": str(unit.get("other_facilities") or ""),
                "room_count": unit.get("room_count") or 1,
                "bathroom_count": unit.get("bathroom_count") or 1,
                "bathroom_type": str(unit.get("bathroom_type") or ""),
                "amenities": str(unit.get("amenities") or ""),
                "equipment": str(unit.get("equipment") or ""),
                "hours": str(unit.get("hours") or ""),
                "is_available": is_available,
                "unavailable_reason": unavailable_reason
            })

        available_count = sum(1 for item in result if item["is_available"])

        return jsonify({
            "status": "success",
            "villa": {
                "id": villa.get("id"),
                "name": villa.get("name"),
                "img": villa.get("img"),
                "guests": villa.get("guests"),
                "price": round(villa_base_price * (1 + commission_rate / 100))
            },
            "check_in": check_in,
            "check_out": check_out,
            "guests": guests,
            "total_units": len(result),
            "available_units": available_count,
            "is_villa_full": (len(result) > 0 and available_count == 0),
            "data": result
        }), 200

    except Exception as e:
        print("GET AVAILABLE UNITS ERROR:", repr(e))
        return jsonify({
            "status": "error",
            "error": f"{e}"
        }), 500

    finally:
        _close(cursor, conn)


# =========================================================
# 2. CUSTOMER - MEMBUAT BOOKING BARU
# =========================================================
@booking_bp.route("/api/bookings", methods=["POST"])
def create_booking():
    conn = None
    cursor = None

    try:
        data = request.get_json(silent=True) or {}

        raw_villa_id = data.get("villa_id")
        raw_villa_detail_id = data.get("villa_detail_id")
        check_in = data.get("check_in")
        check_out = data.get("check_out")
        raw_guests = data.get("guests")
        full_name = str(data.get("full_name") or "").strip()
        email = str(data.get("email") or "").strip()
        whatsapp = str(data.get("whatsapp") or "").strip()

        requested_addons = data.get("addons_info") or []
        if isinstance(requested_addons, str):
            try:
                requested_addons = json.loads(requested_addons) if requested_addons else []
            except json.JSONDecodeError:
                requested_addons = None

        if not isinstance(requested_addons, list):
            return jsonify({
                "status": "error",
                "error": "Format addons_info tidak valid."
            }), 400

        addon_ids: List[int] = []
        for addon in requested_addons:
            if not isinstance(addon, dict):
                return jsonify({
                    "status": "error",
                    "error": "Format addons_info tidak valid."
                }), 400

            raw_addon_id = addon.get("id")
            if raw_addon_id is None:
                return jsonify({
                    "status": "error",
                    "error": "ID layanan tambahan tidak valid."
                }), 400

            addon_id = _to_int(raw_addon_id)
            if addon_id <= 0:
                return jsonify({
                    "status": "error",
                    "error": "ID layanan tambahan tidak valid."
                }), 400

            if addon_id not in addon_ids:
                addon_ids.append(addon_id)

        payment_method = "BCA"
        payment_type = "Manual"
        status = "Menunggu Pembayaran"

        if not raw_villa_id or not check_in or not check_out or not raw_guests or not full_name or not email or not whatsapp:
            return jsonify({
                "status": "error",
                "error": "Data booking belum lengkap"
            }), 400

        villa_id = _to_int(raw_villa_id)
        if villa_id <= 0:
            return jsonify({
                "status": "error",
                "error": "villa_id tidak valid"
            }), 400

        if raw_villa_detail_id in (None, "", "null") or f"{raw_villa_detail_id}".strip() in ("", "null"):
            return jsonify({
                "status": "error",
                "error": "Unit/villa_detail_id wajib dipilih."
            }), 400

        villa_detail_id = _to_int(raw_villa_detail_id)
        if villa_detail_id <= 0:
            return jsonify({
                "status": "error",
                "error": "villa_detail_id tidak valid"
            }), 400

        guests = _to_int(raw_guests)
        if guests <= 0:
            return jsonify({
                "status": "error",
                "error": "Jumlah tamu tidak valid"
            }), 400

        try:
            check_in_date: date = datetime.strptime(f"{check_in}", "%Y-%m-%d").date()
            check_out_date: date = datetime.strptime(f"{check_out}", "%Y-%m-%d").date()
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

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT setting_value FROM settings WHERE setting_key = 'commission_rate' LIMIT 1"
        )
        s_row = cursor.fetchone()
        commission_rate = 10.0
        if isinstance(s_row, dict):
            commission_rate = _to_float(s_row.get('setting_value'), 10.0)

        cursor.execute(
            """
            SELECT id, name, price, guests
            FROM villas
            WHERE id = %s
            LIMIT 1
            """,
            (villa_id,)
        )
        villa = cursor.fetchone()

        if not villa or not isinstance(villa, dict):
            return jsonify({
                "status": "error",
                "error": "Villa tidak ditemukan",
                "villa_id": villa_id
            }), 404

        villa_name = str(villa.get("name") or "")

        cursor.execute(
            """
            SELECT id, villa_id, price, max_guests
            FROM villa_details
            WHERE id = %s AND villa_id = %s
            LIMIT 1
            FOR UPDATE
            """,
            (villa_detail_id, villa_id)
        )
        villa_detail = cursor.fetchone()

        if not villa_detail or not isinstance(villa_detail, dict):
            return jsonify({
                "status": "error",
                "error": "Unit yang dipilih tidak ditemukan atau bukan bagian dari villa ini.",
                "villa_id": villa_id,
                "villa_detail_id": villa_detail_id
            }), 400

        raw_max_guests = villa_detail.get("max_guests") or villa.get("guests")
        max_g = _to_int(raw_max_guests)
        if max_g > 0 and guests > max_g:
            return jsonify({
                "status": "error",
                "error": f"Unit hanya dapat menampung {max_g} tamu."
            }), 400

        raw_unit_price = villa_detail.get("price")
        u_price = _to_float(raw_unit_price)
        v_price = _to_float(villa.get("price"))
        base_unit_price = u_price if u_price > 0 else v_price
        unit_price = round(base_unit_price * (1 + commission_rate / 100), 2)

        if unit_price <= 0:
            return jsonify({
                "status": "error",
                "error": "Harga unit belum tersedia."
            }), 400

        addon_rows = []
        if addon_ids:
            placeholders = ",".join(["%s"] * len(addon_ids))
            cursor.execute(
                f"""
                SELECT id, name, price, addon_type
                FROM room_addons
                WHERE room_id = %s AND id IN ({placeholders})
                """,
                (villa_detail_id, *addon_ids)
            )
            addon_rows = cursor.fetchall() or []

            if len(addon_rows) != len(addon_ids):
                return jsonify({
                    "status": "error",
                    "error": "Salah satu layanan tambahan tidak tersedia untuk unit yang dipilih."
                }), 400

        addons_total_per_night = 0.0
        canonical_addons = []
        for addon in addon_rows:
            if not isinstance(addon, dict):
                continue

            addon_price = _to_float(addon.get("price"))
            addons_total_per_night += addon_price
            canonical_addons.append({
                "id": addon.get("id"),
                "name": str(addon.get("name") or ""),
                "price": addon_price,
                "addon_type": str(addon.get("addon_type") or ""),
            })

        nights = (check_out_date - check_in_date).days
        total_price = round((unit_price + addons_total_per_night) * nights, 2)
        addons_info = json.dumps(canonical_addons, ensure_ascii=False)

        cursor.execute(
            """
            SELECT id, check_in, check_out, status
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
            (villa_id, villa_detail_id, check_out_date, check_in_date)
        )
        conflict = cursor.fetchone()

        if conflict and isinstance(conflict, dict):
            return jsonify({
                "status": "error",
                "error": "Unit yang Anda pilih sudah memiliki booking pada tanggal tersebut.",
                "booking_id": conflict.get("id")
            }), 409

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
            (villa_id, check_out_date, check_in_date)
        )
        legacy_conflict = cursor.fetchone()

        if legacy_conflict:
            return jsonify({
                "status": "error",
                "error": "Villa memiliki booking lama yang belum memiliki informasi unit."
            }), 409

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
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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

        return jsonify({
            "status": "success",
            "message": "Booking berhasil disimpan!",
            "booking_id": booking_id,
            "order_id": order_id,
            "villa": {"id": villa_id, "name": villa_name},
            "villa_detail": {"id": villa_detail_id},
            "payment_method": payment_method,
            "payment_type": payment_type,
            "booking_status": status,
            "total_price": total_price,
        }), 201

    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        print("Create Booking Error:", f"{e}")
        return jsonify({
            "status": "error",
            "error": f"{e}"
        }), 500

    finally:
        _close(cursor, conn)


# =========================================================
# 3. LOOKUP BOOKING
# =========================================================
@booking_bp.route("/api/bookings/lookup", methods=["POST"])
def lookup_booking():
    conn = cursor = None

    try:
        data = request.get_json(silent=True) or {}
        order_id = f"{data.get('order_id', '')}".strip().upper()
        email = f"{data.get('email', '')}".strip()

        if not order_id or not email:
            return jsonify({
                "status": "error",
                "error": "Kode pesanan dan email wajib diisi."
            }), 400

        if not order_id.startswith("PW-"):
            return jsonify({
                "status": "error",
                "error": "Format kode pesanan tidak valid."
            }), 400

        try:
            booking_id = int(f"{order_id[3:]}")
        except ValueError:
            return jsonify({
                "status": "error",
                "error": "Format kode pesanan tidak valid."
            }), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT
                b.id AS booking_id,
                b.status,
                b.check_in,
                b.check_out,
                b.guests,
                b.full_name,
                b.total_price,
                b.payment_method,
                b.payment_type,
                COALESCE(v.name, b.villa_name) AS villa_name,
                vd.bed_info AS room_name
            FROM bookings b
            LEFT JOIN villas v ON b.villa_id = v.id
            LEFT JOIN villa_details vd ON b.villa_detail_id = vd.id
            WHERE b.id = %s AND LOWER(TRIM(b.email)) = LOWER(TRIM(%s))
            LIMIT 1
            """,
            (booking_id, email),
        )
        booking = cursor.fetchone()

        if not booking or not isinstance(booking, dict):
            return jsonify({
                "status": "error",
                "error": "Pesanan tidak ditemukan. Periksa kode pesanan dan email."
            }), 404

        for date_field in ("check_in", "check_out"):
            value = booking.get(date_field)
            if value:
                booking[date_field] = (
                    value.strftime("%Y-%m-%d")
                    if hasattr(value, "strftime")
                    else f"{value}"[:10]
                )

        booking["order_id"] = f"PW-{booking_id}"

        return jsonify({
            "status": "success",
            "data": booking,
        }), 200

    except Exception as error:
        print("Booking Lookup Error:", error)
        return jsonify({
            "status": "error",
            "error": "Pesanan tidak dapat dimuat saat ini."
        }), 500

    finally:
        _close(cursor, conn)


# =========================================================
# 4. ADMIN - AMBIL SEMUA BOOKING
# =========================================================
@booking_bp.route("/api/admin/bookings", methods=["GET"])
@require_admin
def get_all_bookings_for_admin():
    conn = cursor = None

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
                COALESCE(v.name, b.villa_name) AS villa_name,
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
            LEFT JOIN villas v ON b.villa_id = v.id
            ORDER BY b.created_at DESC
            """
        )
        bookings = cursor.fetchall() or []

        for booking in bookings:
            if isinstance(booking, dict):
                check_in_val = booking.get("check_in")
                check_out_val = booking.get("check_out")
                created_at_val = booking.get("created_at")

                if check_in_val and hasattr(check_in_val, "strftime"):
                    booking["check_in"] = check_in_val.strftime("%Y-%m-%d")
                if check_out_val and hasattr(check_out_val, "strftime"):
                    booking["check_out"] = check_out_val.strftime("%Y-%m-%d")
                if created_at_val and hasattr(created_at_val, "strftime"):
                    booking["created_at"] = created_at_val.strftime("%Y-%m-%d %H:%M:%S")

        return jsonify({
            "status": "success",
            "data": bookings
        }), 200

    except Exception as e:
        print("Admin Booking Error:", f"{e}")
        return jsonify({
            "status": "error",
            "error": f"{e}"
        }), 500

    finally:
        _close(cursor, conn)


# =========================================================
# 5. CUSTOMER - KONFIRMASI PEMBAYARAN MANUAL
# =========================================================
@booking_bp.route("/api/bookings/<int:booking_id>/confirm", methods=["PUT"])
def confirm_manual_payment(booking_id):
    conn = cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, status, payment_method, payment_type
            FROM bookings
            WHERE id = %s
            LIMIT 1
            """,
            (booking_id,)
        )
        booking = cursor.fetchone()

        if not booking or not isinstance(booking, dict):
            return jsonify({
                "status": "error",
                "error": "Booking tidak ditemukan"
            }), 404

        payment_method = f"{booking.get('payment_method')}".upper()
        payment_type = f"{booking.get('payment_type')}".lower()
        booking_status = booking.get("status")

        if payment_method != "BCA" or payment_type != "manual":
            return jsonify({
                "status": "error",
                "error": "Booking ini bukan pembayaran BCA manual"
            }), 400

        if booking_status in ("Lunas", "Batal"):
            return jsonify({
                "status": "error",
                "error": f"Booking sudah berstatus {booking_status} dan tidak dapat dikonfirmasi ulang"
            }), 400

        cursor.execute(
            """
            UPDATE bookings
            SET status = %s
            WHERE id = %s
            """,
            ("Menunggu Verifikasi", booking_id)
        )
        conn.commit()

        return jsonify({
            "status": "success",
            "message": "Pembayaran BCA berhasil dikonfirmasi dan menunggu verifikasi admin",
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
        print("Confirm Payment Error:", f"{e}")
        return jsonify({
            "status": "error",
            "error": f"{e}"
        }), 500

    finally:
        _close(cursor, conn)