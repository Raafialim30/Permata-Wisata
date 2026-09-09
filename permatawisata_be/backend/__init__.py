from flask import Flask
from flask_cors import CORS   # 🔥 TAMBAHAN

from backend.routes.villa_routes import villa_bp

def create_app():
    app = Flask(__name__)

    CORS(app)  # 🔥 INI KUNCINYA

    app.register_blueprint(villa_bp, url_prefix="/api/villas")

    return app