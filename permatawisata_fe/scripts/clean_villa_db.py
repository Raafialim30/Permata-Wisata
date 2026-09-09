import os
import sys

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'permatawisata_be', 'backend')
sys.path.append(backend_dir)

from db import get_db_connection

def clean_villa_defaults():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Cek dulu data villa yang bermasalah
        cursor.execute("""
            SELECT id, name, guests, beds, baths, bed_type, room_count, bathroom_type, hours 
            FROM villas 
            WHERE guests = '-' OR guests = '4' OR guests = '' 
               OR beds = '-' OR baths = '-' OR bed_type = '-'
               OR room_count = '-' OR bathroom_type = '-' OR hours = '-'
        """)
        villas = cursor.fetchall()
        print(f"Villa yang memiliki nilai default/dash ({len(villas)} villa):")
        for v in villas:
            print(f"  ID {v['id']}: {v['name']} | guests={v['guests']!r} | beds={v['beds']!r} | baths={v['baths']!r} | room_count={v['room_count']!r}")

        # Bersihkan nilai '-' di tabel villas
        cursor.execute("""
            UPDATE villas SET
                guests        = IF(guests        IN ('-', ''), NULL, guests),
                beds          = IF(beds          IN ('-', ''), NULL, beds),
                baths         = IF(baths         IN ('-', ''), NULL, baths),
                bed_type      = IF(bed_type      IN ('-', ''), NULL, bed_type),
                room_count    = IF(room_count    IN ('-', '1', ''), NULL, room_count),
                bathroom_type = IF(bathroom_type IN ('-', ''), NULL, bathroom_type),
                hours         = IF(hours         IN ('-', ''), NULL, hours)
        """)
        conn.commit()
        print(f"\nBerhasil membersihkan {cursor.rowcount} baris di tabel villas!")

        # Verifikasi villa 20
        cursor.execute("SELECT id, guests, room_count, baths FROM villas WHERE id = 20")
        print("\nVilla 20 setelah cleanup:", cursor.fetchone())

    except Exception as e:
        print("Error:", e)
        import traceback; traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    clean_villa_defaults()
