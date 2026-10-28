import os
import sys

# Tambahkan backend ke path agar bisa import db
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'permatawisata_be', 'backend')
sys.path.append(backend_dir)

from db import get_db_connection

def clean_legacy_defaults():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Bersihkan nilai hardcoded legacy di tabel villa_details
        query = """
        UPDATE villa_details 
        SET 
            max_guests = IF(max_guests = '4', '', max_guests),
            room_count = IF(room_count = '1', '', room_count),
            bathroom_count = IF(bathroom_count = '1', '', bathroom_count),
            bathroom_type = IF(bathroom_type = '-', '', bathroom_type),
            hours = IF(hours = '-', '', hours),
            snk = IF(snk = '-', '', snk),
            facilities = IF(facilities = '-', '', facilities)
        """
        
        cursor.execute(query)
        conn.commit()
        print(f"Berhasil membersihkan {cursor.rowcount} unit dari default lama!")
        
    except Exception as e:
        print("Error:", e)
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    clean_legacy_defaults()
