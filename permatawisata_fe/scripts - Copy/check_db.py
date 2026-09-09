import os
import sys

# Tambahkan backend ke path agar bisa import db
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'permatawisata_be', 'backend')
sys.path.append(backend_dir)

from db import get_db_connection

def check():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, max_guests, room_count, bathroom_count FROM villa_details WHERE villa_id = 20")
    for row in cursor.fetchall():
        print(row)

if __name__ == "__main__":
    check()
