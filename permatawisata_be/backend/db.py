import mysql.connector
from mysql.connector import pooling

import os

# Konfigurasi database dengan env variables fallback ke default lokal
db_config = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "permata_wisata"),
    "connection_timeout": 10
}

# Inisialisasi Connection Pool dengan fallback aman
_pool = None

try:
    _pool = pooling.MySQLConnectionPool(
        pool_name="permata_pool",
        pool_size=10,
        **db_config
    )
    print("[DB] Connection Pool berhasil dibuat (10 koneksi).")
except Exception as e:
    print(f"[DB] Warning: Gagal membuat Connection Pool: {e}")
    print("[DB] Akan menggunakan koneksi langsung sebagai fallback.")
    _pool = None


def get_db_connection():
    """
    Ambil koneksi dari pool jika tersedia.
    Jika pool tidak tersedia, buat koneksi langsung (fallback).
    """
    if _pool:
        try:
            return _pool.get_connection()
        except Exception as e:
            print(f"[DB] Pool error, pakai koneksi langsung: {e}")

    # Fallback: koneksi langsung (mode lama yang selalu bisa bekerja)
    return mysql.connector.connect(**db_config)