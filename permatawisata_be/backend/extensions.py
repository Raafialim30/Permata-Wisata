"""
Extensions / shared Flask components
Project: Permata Wisata
"""

from flask_cors import CORS


# =========================================================
# CORS
# =========================================================
# Objek CORS dibuat di sini agar dapat digunakan kembali
# apabila dibutuhkan oleh file Flask lainnya.
cors = CORS()