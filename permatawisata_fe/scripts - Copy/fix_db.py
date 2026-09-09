import os
import shutil
import mysql.connector

def run_fix():
    print("Mulai sinkronisasi database dan file...")
    
    # Koneksi ke database
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        database='permata_wisata'
    )
    cursor = conn.cursor(dictionary=True)

    # 1. Cari semua villa dengan ID > 1000
    cursor.execute("SELECT id FROM villas WHERE id > 1000 ORDER BY id ASC")
    bad_villas = cursor.fetchall()
    
    if bad_villas:
        # Cari ID terakhir yang valid (<= 1000)
        cursor.execute("SELECT MAX(id) as max_id FROM villas WHERE id <= 1000")
        res = cursor.fetchone()
        next_valid_id = res['max_id'] + 1 if res['max_id'] else 1

        print(f"Menemukan {len(bad_villas)} villa dengan ID acak. Akan diubah mulai dari {next_valid_id}")

        cursor.execute("SET FOREIGN_KEY_CHECKS=0")

        for villa in bad_villas:
            old_id = villa['id']
            new_id = next_valid_id
            
            print(f"Mengubah ID villa dari {old_id} menjadi {new_id}...")
            
            # Update tabel villa_details
            cursor.execute("UPDATE villa_details SET villa_id = %s WHERE villa_id = %s", (new_id, old_id))
            
            # Update tabel bookings (meski kosong, untuk keamanan)
            cursor.execute("UPDATE bookings SET villa_id = %s WHERE villa_id = %s", (new_id, old_id))
            
            # Update tabel villas (kita perlu hapus dan insert karena id adalah PK, atau UPDATE jika foreign key ON UPDATE CASCADE)
            # Biasanya foreign key cascade bisa langsung UPDATE. Mari kita coba UPDATE.
            try:
                cursor.execute("UPDATE villas SET id = %s WHERE id = %s", (new_id, old_id))
            except Exception as e:
                print(f"Error update PK, mencoba alternatif: {e}")
            
            # Rename folder gambar villa (jika ada)
            base_dir = os.path.dirname(os.path.abspath(__file__))
            villas_img_dir = os.path.join(base_dir, 'public', 'images', 'villas')
            old_folder = os.path.join(villas_img_dir, f"villa_{old_id}")
            new_folder = os.path.join(villas_img_dir, f"villa_{new_id}")
            
            if os.path.exists(old_folder):
                os.rename(old_folder, new_folder)
                print(f"Folder diubah: villa_{old_id} -> villa_{new_id}")
            
            next_valid_id += 1

        # Reset AUTO_INCREMENT
        cursor.execute(f"ALTER TABLE villas AUTO_INCREMENT = {next_valid_id}")
        cursor.execute("SET FOREIGN_KEY_CHECKS=1")
        print(f"AUTO_INCREMENT direset ke {next_valid_id}")
        conn.commit()
    else:
        print("Tidak ada villa dengan ID acak yang perlu diperbaiki.")

    # 2. Migrasi gambar kamar ke subfolder
    print("Memulai migrasi gambar kamar ke subfolder...")
    cursor.execute("SELECT id, villa_id, img FROM villa_details")
    rooms = cursor.fetchall()
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    villas_img_dir = os.path.join(base_dir, 'public', 'images', 'villas')
    
    for room in rooms:
        villa_id = room['villa_id']
        room_id = room['id']
        old_room_img_name = room['img']
        
        room_dir = os.path.join(villas_img_dir, f"villa_{villa_id}", "rooms")
        new_sub_dir = os.path.join(room_dir, f"room_{room_id}")
        
        if not os.path.exists(room_dir):
            continue
            
        # Pindahkan semua gambar di 'rooms/' yang memiliki prefix 'room_{room_id}_' atau tepat sama dengan nama gambar utama
        # Buat subfolder jika belum ada
        
        moved_count = 0
        prefix = f"room_{room_id}_"
        for filename in os.listdir(room_dir):
            file_path = os.path.join(room_dir, filename)
            
            if os.path.isfile(file_path):
                # Cek jika file milik kamar ini (berdasarkan prefix atau kesamaan nama dengan database)
                if filename.startswith(prefix) or filename == old_room_img_name:
                    os.makedirs(new_sub_dir, exist_ok=True)
                    
                    # Nama file baru di subfolder (hapus prefix jika ada, agar namanya bebas)
                    new_filename = filename
                    if filename.startswith(prefix):
                        new_filename = filename[len(prefix):]
                        if not new_filename:
                            new_filename = "image_1.png"
                    
                    new_file_path = os.path.join(new_sub_dir, new_filename)
                    shutil.move(file_path, new_file_path)
                    moved_count += 1
                    
                    # Update database column 'img' jika yang dipindah adalah gambar utama atau jika gambar utama saat ini adalah default yang punya prefix
                    if filename == old_room_img_name or filename == f"room_{room_id}_1.png":
                        cursor.execute("UPDATE villa_details SET img = %s WHERE id = %s", (new_filename, room_id))
        
        if moved_count > 0:
            print(f"Dipindah {moved_count} gambar kamar {room_id} (villa {villa_id}) ke subfoldernya.")

    conn.commit()
    cursor.close()
    conn.close()
    print("Selesai semua proses perbaikan dan migrasi!")

if __name__ == '__main__':
    run_fix()
