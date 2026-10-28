from datetime import datetime, date
from typing import Any, Dict, List, Optional
from flask import Blueprint, jsonify, request
from db import get_db_connection
from security import get_user_id_from_request


# ==========================================================
# BLUEPRINT
# ==========================================================
owner_dashboard_bp = Blueprint("owner_dashboard_bp", __name__)


# ==========================================================
# HELPER KONVERSI & KONEKSI
# ==========================================================
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


def _get_owner_user_id():
    return get_user_id_from_request("owner")


def _to_int(val: Any, default: int = 0) -> int:
    """Konversi nilai ber-tipe Any ke int secara aman agar tidak memicu linter warning."""
    if val is None:
        return default
    try:
        return int(f"{val}")
    except (TypeError, ValueError):
        return default


def _validate_owner(cursor, owner_user_id) -> Optional[Dict[str, Any]]:
    cursor.execute(
        """
        SELECT id, username, role
        FROM users
        WHERE id = %s
        LIMIT 1
        """,
        (owner_user_id,)
    )

    owner = cursor.fetchone()

    if not owner or not isinstance(owner, dict):
        return None

    role = owner.get("role")
    if not role or str(role).strip().lower() != "owner":
        return None

    return owner


def _format_date(val: Any, date_format: str = "%Y-%m-%d") -> str:
    """Konversi tanggal/datetime menjadi string secara aman."""
    if val is None:
        return ""
    if hasattr(val, "strftime") and callable(getattr(val, "strftime")):
        try:
            return getattr(val, "strftime")(date_format)
        except Exception:
            pass
    return str(val) if val else ""


# ==========================================================
# OWNER DASHBOARD STATS
# ==========================================================
@owner_dashboard_bp.route("/api/owner/dashboard-stats", methods=["GET"])
def get_owner_dashboard_data():
    conn = None
    cursor = None

    try:
        # 1. AMBIL OWNER DARI JWT
        owner_user_id = _get_owner_user_id()

        if not owner_user_id:
            return jsonify({
                "status": "error",
                "error": "Token Owner tidak valid atau sudah kadaluarsa."
            }), 401

        # 2. DATABASE & VALIDASI
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        owner = _validate_owner(cursor, owner_user_id)

        if not owner:
            return jsonify({
                "status": "error",
                "error": "User bukan Owner atau Owner tidak ditemukan."
            }), 403

        # 3. JUMLAH VILLA MILIK OWNER
        cursor.execute(
            """
            SELECT COUNT(*) AS total_villas
            FROM villas
            WHERE owner_user_id = %s
            """,
            (owner_user_id,)
        )

        villa_count_result = cursor.fetchone()

        total_villas = 0
        if isinstance(villa_count_result, dict):
            tv = villa_count_result.get("total_villas")
            total_villas = _to_int(tv, 0)

        # 4. SUMMARY STATISTICS
        cursor.execute(
            """
            SELECT
                COUNT(b.id) AS total_bookings,
                IFNULL(
                    SUM(
                        CASE
                            WHEN b.status = 'Lunas'
                            THEN b.total_price
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_revenue,
                IFNULL(SUM(b.guests), 0) AS total_guests,
                COUNT(
                    CASE
                        WHEN b.check_in >= CURDATE()
                        THEN 1
                    END
                ) AS upcoming_bookings
            FROM bookings b
            INNER JOIN villas v ON b.villa_id = v.id
            WHERE v.owner_user_id = %s
            """,
            (owner_user_id,)
        )

        stats = cursor.fetchone()

        if not stats or not isinstance(stats, dict):
            stats = {
                "total_bookings": 0,
                "total_revenue": 0,
                "total_guests": 0,
                "upcoming_bookings": 0
            }

        # 5. UPCOMING BOOKINGS
        cursor.execute(
            """
            SELECT
                b.id,
                b.full_name AS name,
                v.name AS villa,
                b.check_in,
                b.check_out,
                b.guests,
                b.status
            FROM bookings b
            INNER JOIN villas v ON b.villa_id = v.id
            WHERE v.owner_user_id = %s
              AND b.check_in >= CURDATE()
            ORDER BY b.check_in ASC
            LIMIT 5
            """,
            (owner_user_id,)
        )

        raw_bookings = cursor.fetchall() or []
        bookings_list: List[Dict[str, Any]] = []

        for rb in raw_bookings:
            if not isinstance(rb, dict):
                continue

            check_in = _format_date(rb.get("check_in"), "%Y-%m-%d")
            check_out = _format_date(rb.get("check_out"), "%Y-%m-%d")
            status = str(rb.get("status") or "Menunggu Pembayaran")

            date_str = f"{check_in} - {check_out}" if (check_in or check_out) else "-"

            bookings_list.append({
                "id": rb.get("id"),
                "name": rb.get("name") or "-",
                "villa": rb.get("villa") or "-",
                "date": date_str,
                "guests": f"{rb.get('guests', 0)} tamu",
                "status": status
            })

        # 6. RECENT ACTIVITIES
        cursor.execute(
            """
            SELECT
                b.id,
                b.full_name,
                b.status,
                b.created_at,
                v.name AS villa
            FROM bookings b
            INNER JOIN villas v ON b.villa_id = v.id
            WHERE v.owner_user_id = %s
            ORDER BY b.created_at DESC
            LIMIT 4
            """,
            (owner_user_id,)
        )

        raw_activities = cursor.fetchall() or []
        activities_list: List[Dict[str, Any]] = []

        for ra in raw_activities:
            if not isinstance(ra, dict):
                continue

            full_name = str(ra.get("full_name") or "Tamu")
            status = str(ra.get("status") or "")
            villa_name = str(ra.get("villa") or "Villa")

            title = f"Pemesanan baru oleh {full_name}"

            if status == "Lunas":
                title = f"Pembayaran lunas ({full_name})"
            elif status == "Menunggu Verifikasi":
                title = f"Pembayaran menunggu verifikasi ({full_name})"
            elif status == "Menunggu Pembayaran":
                title = f"Menunggu pembayaran ({full_name})"
            elif status == "Batal":
                title = f"Booking dibatalkan ({full_name})"

            created_at_val = ra.get("created_at")
            activity_time = (
                _format_date(created_at_val, "%d %b %Y %H:%M")
                if created_at_val
                else "Baru saja"
            )
            if not activity_time:
                activity_time = "Baru saja"

            b_id_num = _to_int(ra.get("id"), 0)

            activities_list.append({
                "id": f"BK-2026-{b_id_num:03d}",
                "title": title,
                "time": activity_time,
                "villa": villa_name
            })

        # 7. RESPONSE
        return jsonify({
            "status": "success",
            "owner_user_id": owner_user_id,
            "owner_username": owner.get("username", ""),
            "total_villas": total_villas,
            "stats": stats,
            "bookings": bookings_list,
            "activities": activities_list
        }), 200

    except Exception as e:
        print("Owner Dashboard Error:", str(e))
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

    finally:
        _close(cursor, conn)


# ==========================================================
# EXPORT BLUEPRINT
# ==========================================================
export = owner_dashboard_bp