from flask import Flask
from flask_cors import CORS

# 1. Import semua blueprint dari folder routes
from routes.testimonials import testimonials_bp 
from routes.detailvillas import villas_bp      
from routes.booking_routes import booking_bp 
from routes.payment import payment_bp  
from routes.login import login_bp  
from routes.dashboard import dashboard_bp  
from routes.manage_villas import manage_villas_bp
from routes.owner_dashboard import owner_dashboard_bp
from routes.owner_availability import owner_availability_bp # <-- TAMBAHKAN INI
from routes.owner_change_requests import owner_change_requests_bp
from routes.reviews import reviews_bp


app = Flask(__name__)

# Mengaktifkan CORS agar React bisa lancar mengakses Flask
CORS(app)

# 2. Daftarkan SEMUA Blueprint ke aplikasi Flask
app.register_blueprint(testimonials_bp)
app.register_blueprint(villas_bp)
app.register_blueprint(booking_bp)
app.register_blueprint(payment_bp)
app.register_blueprint(login_bp) 
app.register_blueprint(dashboard_bp)  
app.register_blueprint(manage_villas_bp) 
app.register_blueprint(owner_dashboard_bp)
app.register_blueprint(owner_availability_bp) # <-- TAMBAHKAN INI
app.register_blueprint(owner_change_requests_bp)
app.register_blueprint(reviews_bp)

@app.route('/')
def index():
    return "Backend Permata Wisata is Running!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)