import os
from urllib.parse import unquote

if __name__ == "__main__":
    os.environ.setdefault("APP_ENV", "development")

from flask import Flask, Response, send_file, jsonify
from flask_cors import CORS
from security import IS_PRODUCTION

# =========================================================
# 1. IMPORT SEMUA BLUEPRINT
# =========================================================
from routes.testimonials import testimonials_bp 
from routes.detailvillas import villas_bp      
from routes.booking_routes import booking_bp 
from routes.payment import payment_bp  
from routes.login import login_bp  
from routes.dashboard import dashboard_bp  
from routes.manage_villas import manage_villas_bp
from routes.owner_dashboard import owner_dashboard_bp
from routes.owner_availability import owner_availability_bp
from routes.owner_change_requests import owner_change_requests_bp
from routes.owner_registration import owner_registration_bp
from routes.reviews import reviews_bp

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

# =========================================================
# KONFIGURASI CORS
# =========================================================
frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGIN", "").split(",")
    if origin.strip()
]
if IS_PRODUCTION:
    if frontend_origins:
        CORS(app, origins=frontend_origins)
else:
    CORS(app)

# =========================================================
# 2. REGISTER BLUEPRINT
# =========================================================
app.register_blueprint(testimonials_bp)
app.register_blueprint(villas_bp)
app.register_blueprint(booking_bp)
app.register_blueprint(payment_bp)
app.register_blueprint(login_bp) 
app.register_blueprint(dashboard_bp)  
app.register_blueprint(manage_villas_bp) 
app.register_blueprint(owner_dashboard_bp)
app.register_blueprint(owner_availability_bp)
app.register_blueprint(owner_change_requests_bp)
app.register_blueprint(owner_registration_bp)
app.register_blueprint(reviews_bp)

# =========================================================
# DEFAULT SVG PLACEHOLDER (RESPONS ANTI STATUS 404 & CORS)
# =========================================================
DEFAULT_SVG_PLACEHOLDER = """<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="100%" height="100%" fill="#e2e8f0"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#94a3b8">Gambar Tidak Tersedia</text>
</svg>"""

# =========================================================
# 3. HELPER PENYAJI FILE GAMBAR OTOMATIS (SMART FALLBACK)
# =========================================================
def _find_and_serve_image(filename):
    try:
        clean_path = filename
        for _ in range(3):
            clean_path = unquote(clean_path)
        clean_path = clean_path.replace('\\', '/').strip('/')

        if clean_path.startswith("media/"):
            clean_path = clean_path[6:]

        possible_bases = [
            os.path.normpath(os.path.join(app.root_path, 'media')),
            os.path.normpath(os.path.join(app.root_path, '..', 'media')),
            os.path.normpath(os.path.join(os.getcwd(), 'media')),
            os.path.normpath(os.path.join(os.getcwd(), 'backend', 'media')),
            os.path.normpath(os.path.join(app.root_path, 'uploads')),
            os.path.normpath(os.path.join(app.root_path, 'public', 'images'))
        ]

        valid_exts = ('.png', '.jpg', '.jpeg', '.webp', '.svg')

        # LANGKAH 1: Cek apakah file fisik persis ada di disk
        for base in possible_bases:
            full_path = os.path.normpath(os.path.join(base, clean_path))
            if os.path.isfile(full_path):
                resp = send_file(full_path)
                resp.headers['Access-Control-Allow-Origin'] = '*'
                return resp

        # LANGKAH 2: Cari foto dalam folder villa_X (misal: utama.png)
        parts = clean_path.split('/')
        villa_folder = None
        for p in parts:
            if p.startswith("villa_"):
                villa_folder = p
                break

        if villa_folder:
            for base in possible_bases:
                cand_dir = os.path.join(base, 'villas', villa_folder)
                if not os.path.isdir(cand_dir):
                    cand_dir = os.path.join(base, villa_folder)

                if os.path.isdir(cand_dir):
                    for pref in ['utama.png', '1.png', 'utama.jpg', '1.jpg', 'utama.jpeg']:
                        pref_path = os.path.join(cand_dir, pref)
                        if os.path.isfile(pref_path):
                            resp = send_file(pref_path)
                            resp.headers['Access-Control-Allow-Origin'] = '*'
                            return resp

                    for root, dirs, files in os.walk(cand_dir):
                        for f in sorted(files):
                            if f.lower().endswith(valid_exts):
                                target = os.path.normpath(os.path.join(root, f))
                                resp = send_file(target)
                                resp.headers['Access-Control-Allow-Origin'] = '*'
                                return resp

        # LANGKAH 3: Cari gambar apapun yang ada di folder media
        for base in possible_bases:
            if os.path.isdir(base):
                for root, dirs, files in os.walk(base):
                    for f in sorted(files):
                        if f.lower().endswith(valid_exts):
                            target = os.path.normpath(os.path.join(root, f))
                            resp = send_file(target)
                            resp.headers['Access-Control-Allow-Origin'] = '*'
                            return resp

    except Exception as e:
        print(f"SERVE IMAGE EXCEPTION ({filename}):", e)

    # LANGKAH 4: Kirim SVG Placeholder dengan status 200 OK + Header CORS
    resp = Response(DEFAULT_SVG_PLACEHOLDER, mimetype='image/svg+xml', status=200)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp


@app.route('/media/<path:filename>')
def serve_media(filename):
    return _find_and_serve_image(filename)


@app.route('/images/<path:filename>')
def serve_images(filename):
    return _find_and_serve_image(filename)


# =========================================================
# 4. ENDPOINT STATISTIK & TEST UTAMA
# =========================================================
@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = cursor = None
    try:
        from db import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        villas_count = 0
        cursor.execute("SELECT COUNT(*) AS total_villas FROM villas")
        villas_res = cursor.fetchone()
        if villas_res and isinstance(villas_res, dict):
            villas_count = villas_res.get('total_villas', 0)
        
        bookings_count = 0
        cursor.execute("SELECT COUNT(*) AS total_bookings FROM bookings")
        bookings_res = cursor.fetchone()
        if bookings_res and isinstance(bookings_res, dict):
            bookings_count = bookings_res.get('total_bookings', 0)
        
        return jsonify({
            "status": "success",
            "total_villas": villas_count,
            "total_bookings": bookings_count
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/')
def index():
    return "Backend Permata Wisata is Running!"

if __name__ == '__main__':
    if IS_PRODUCTION:
        raise RuntimeError("Gunakan WSGI server untuk menjalankan aplikasi di production.")
    app.run(host='0.0.0.0', debug=True, port=5000)