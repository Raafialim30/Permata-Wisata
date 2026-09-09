import sys
import os

# Menambahkan path backend agar import di app.py (seperti from routes...) berfungsi
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app import app

if __name__ == "__main__":
    print("FLASK NYALA")
    app.run(host='0.0.0.0', debug=True, port=5000)