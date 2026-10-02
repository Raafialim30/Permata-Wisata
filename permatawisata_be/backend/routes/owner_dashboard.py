from flask import Blueprint, jsonify, request
from db import get_db_connection

import jwt
import os


# ==========================================================
# BLUEPRINT
# ==========================================================

owner_dashboard_bp = Blueprint(
    "owner_dashboard_bp",
    __name__
)


# ==========================================================
# JWT CONFIG
# ==========================================================

JWT_SECRET = os.getenv(
    "JWT_SECRET",
    "jogjavilla_admin_secret_key_2026_x89!"
)

JWT_ALGORITHM = "HS256"


# ==========================================================
# HELPER: TUTUP CONNECTION
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
# HELPER: AMBIL OWNER USER ID DARI JWT
# ==========================================================

def _get_owner_user_id():
    """
    Mengambil user_id Owner langsung dari JWT.

    Frontend TIDAK dipercaya untuk menentukan
    owner_user_id.

    Alur:

        Login
          ↓
        JWT
          ↓
        payload.user_id
          ↓
        villas.owner_user_id
          ↓
        Dashboard Owner
    """

    authorization = request.headers.get(
        "Authorization",
        ""
    ).strip()

    if not authorization:
        return None

    if not authorization.lower().startswith(
        "bearer "
    ):
        return None

    parts = authorization.split(
        " ",
        1
    )

    if len(parts) != 2:
        return None

    token = parts[1].strip()

    if not token:
        return None

    try:

        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )

        # ------------------------------------------------------
        # TOKEN HARUS MILIK OWNER
        # ------------------------------------------------------

        role = str(
            payload.get(
                "role",
                ""
            )
        ).strip().lower()

        if role != "owner":
            return None

        # ------------------------------------------------------
        # AMBIL USER ID
        # ------------------------------------------------------

        user_id = payload.get(
            "user_id"
        )

        if user_id is None:
            return None

        user_id = int(
            user_id
        )

        if user_id <= 0:
            return None

        return user_id

    except jwt.ExpiredSignatureError:

        print(
            "[OWNER AUTH] JWT sudah kadaluarsa."
        )

        return None

    except jwt.InvalidTokenError:

        print(
            "[OWNER AUTH] JWT tidak valid."
        )

        return None

    except (
        TypeError,
        ValueError
    ):

        return None


# ==========================================================
# HELPER: VALIDASI OWNER KE DATABASE
# ==========================================================

def _validate_owner(
    cursor,
    owner_user_id
):

    cursor.execute(
        """
        SELECT
            id,
            username,
            role
        FROM users
        WHERE id = %s
        LIMIT 1
        """,
        (
            owner_user_id,
        )
    )

    owner = cursor.fetchone()

    if not owner:
        return None

    if str(
        owner.get(
            "role",
            ""
        )
    ).strip().lower() != "owner":

        return None

    return owner


# ==========================================================
# OWNER DASHBOARD
# ==========================================================

@owner_dashboard_bp.route(
    "/api/owner/dashboard-stats",
    methods=["GET"]
)
def get_owner_dashboard_data():

    conn = None
    cursor = None

    try:

        # ======================================================
        # 1. AMBIL OWNER DARI JWT
        # ======================================================

        owner_user_id = (
            _get_owner_user_id()
        )

        if not owner_user_id:

            return jsonify({
                "status": "error",
                "error": (
                    "Token Owner tidak valid "
                    "atau sudah kadaluarsa."
                )
            }), 401


        # ======================================================
        # 2. DATABASE
        # ======================================================

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )


        # ======================================================
        # 3. VALIDASI OWNER
        # ======================================================

        owner = _validate_owner(
            cursor,
            owner_user_id
        )

        if not owner:

            return jsonify({
                "status": "error",
                "error": (
                    "User bukan Owner "
                    "atau Owner tidak ditemukan."
                )
            }), 403


        # ======================================================
        # 4. JUMLAH VILLA MILIK OWNER
        # ======================================================

        cursor.execute(
            """
            SELECT
                COUNT(*) AS total_villas
            FROM villas
            WHERE owner_user_id = %s
            """,
            (
                owner_user_id,
            )
        )

        villa_count_result = (
            cursor.fetchone()
        )

        total_villas = int(
            villa_count_result.get(
                "total_villas",
                0
            )
            if villa_count_result
            else 0
        )


        # ======================================================
        # 5. SUMMARY STATISTICS
        # ======================================================
        #
        # HANYA booking yang berasal dari villa
        # milik Owner yang sedang login.
        #
        # bookings
        #     ↓
        # villa_id
        #     ↓
        # villas.id
        #     ↓
        # villas.owner_user_id
        #     ↓
        # Owner dari JWT
        #
        # ======================================================

        cursor.execute(
            """
            SELECT

                COUNT(b.id)
                AS total_bookings,

                IFNULL(
                    SUM(
                        CASE
                            WHEN b.status = 'Lunas'
                            THEN b.total_price
                            ELSE 0
                        END
                    ),
                    0
                )
                AS total_revenue,

                IFNULL(
                    SUM(b.guests),
                    0
                )
                AS total_guests,

                COUNT(
                    CASE
                        WHEN b.check_in >= CURDATE()
                        THEN 1
                    END
                )
                AS upcoming_bookings

            FROM bookings b

            INNER JOIN villas v
                ON b.villa_id = v.id

            WHERE
                v.owner_user_id = %s
            """,
            (
                owner_user_id,
            )
        )

        stats = cursor.fetchone()

        if not stats:

            stats = {
                "total_bookings": 0,
                "total_revenue": 0,
                "total_guests": 0,
                "upcoming_bookings": 0
            }


        # ======================================================
        # 6. UPCOMING BOOKINGS
        # ======================================================

        cursor.execute(
            """
            SELECT

                b.id,

                b.full_name
                AS name,

                v.name
                AS villa,

                b.check_in,

                b.check_out,

                b.guests,

                b.status

            FROM bookings b

            INNER JOIN villas v
                ON b.villa_id = v.id

            WHERE

                v.owner_user_id = %s

                AND b.check_in >= CURDATE()

            ORDER BY
                b.check_in ASC

            LIMIT 5
            """,
            (
                owner_user_id,
            )
        )

        bookings_list = []

        for rb in cursor.fetchall():

            # --------------------------------------------------
            # CHECK IN
            # --------------------------------------------------

            if rb.get("check_in"):

                check_in = (
                    rb["check_in"]
                    .strftime(
                        "%Y-%m-%d"
                    )
                )

            else:

                check_in = ""


            # --------------------------------------------------
            # CHECK OUT
            # --------------------------------------------------

            if rb.get("check_out"):

                check_out = (
                    rb["check_out"]
                    .strftime(
                        "%Y-%m-%d"
                    )
                )

            else:

                check_out = ""


            # --------------------------------------------------
            # STATUS
            # --------------------------------------------------

            status = (
                rb.get("status")
                or "Menunggu Pembayaran"
            )


            bookings_list.append({

                "id":
                    rb.get("id"),

                "name":
                    rb.get("name")
                    or "-",

                "villa":
                    rb.get("villa")
                    or "-",

                "date":
                    f"{check_in} - {check_out}",

                "guests":
                    f"{rb.get('guests', 0)} tamu",

                "status":
                    status

            })


        # ======================================================
        # 7. RECENT ACTIVITIES
        # ======================================================

        cursor.execute(
            """
            SELECT

                b.id,

                b.full_name,

                b.status,

                b.created_at,

                v.name
                AS villa

            FROM bookings b

            INNER JOIN villas v
                ON b.villa_id = v.id

            WHERE
                v.owner_user_id = %s

            ORDER BY
                b.created_at DESC

            LIMIT 4
            """,
            (
                owner_user_id,
            )
        )

        activities_list = []

        for ra in cursor.fetchall():

            full_name = (
                ra.get("full_name")
                or "Tamu"
            )

            status = (
                ra.get("status")
                or ""
            )

            villa_name = (
                ra.get("villa")
                or "Villa"
            )


            # --------------------------------------------------
            # JUDUL AKTIVITAS
            # --------------------------------------------------

            title = (
                f"Pemesanan baru oleh "
                f"{full_name}"
            )


            if status == "Lunas":

                title = (
                    f"Pembayaran lunas "
                    f"({full_name})"
                )

            elif status == "Menunggu Verifikasi":

                title = (
                    f"Pembayaran menunggu "
                    f"verifikasi "
                    f"({full_name})"
                )

            elif status == "Menunggu Pembayaran":

                title = (
                    f"Menunggu pembayaran "
                    f"({full_name})"
                )

            elif status == "Batal":

                title = (
                    f"Booking dibatalkan "
                    f"({full_name})"
                )


            # --------------------------------------------------
            # WAKTU
            # --------------------------------------------------

            if ra.get("created_at"):

                activity_time = (
                    ra["created_at"]
                    .strftime(
                        "%d %b %Y %H:%M"
                    )
                )

            else:

                activity_time = (
                    "Baru saja"
                )


            activities_list.append({

                "id":
                    f"BK-2026-{ra['id']:03d}",

                "title":
                    title,

                "time":
                    activity_time,

                "villa":
                    villa_name

            })


        # ======================================================
        # 8. RESPONSE
        # ======================================================

        return jsonify({

            "status":
                "success",

            "owner_user_id":
                owner_user_id,

            "owner_username":
                owner["username"],

            "total_villas":
                total_villas,

            "stats":
                stats,

            "bookings":
                bookings_list,

            "activities":
                activities_list

        }), 200


    # ======================================================
    # ERROR
    # ======================================================

    except Exception as e:

        print(
            "Owner Dashboard Error:",
            str(e)
        )

        return jsonify({

            "status":
                "error",

            "error":
                str(e)

        }), 500


    # ======================================================
    # CLOSE
    # ======================================================

    finally:

        _close(
            cursor,
            conn
        )


# ==========================================================
# EXPORT BLUEPRINT
# ==========================================================

export = owner_dashboard_bp