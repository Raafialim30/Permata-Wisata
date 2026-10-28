import sys
import os

os.environ.setdefault("APP_ENV", "development")

# Menambahkan path backend agar import di app.py (seperti from routes...) berfungsi
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app import app

if __name__ == "__main__":
    if os.environ.get("APP_ENV", "").strip().lower() in {"prod", "production"}:
        raise RuntimeError("Gunakan WSGI server untuk menjalankan aplikasi di production.")
    print("FLASK NYALA")
    app.run(host='0.0.0.0', debug=True, port=5000)