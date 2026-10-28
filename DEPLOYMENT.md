# Panduan deploy Permata Wisata

Aplikasi terdiri dari frontend React, backend Flask, dan database MySQL. Deploy
frontend dan backend sebagai layanan terpisah, atau arahkan reverse proxy ke
keduanya pada satu domain.

## 1. Siapkan database

1. Buat database MySQL dan impor schema aplikasi yang saat ini digunakan.
2. Jalankan migration `permatawisata_be/migrations/001_owner_registration_requests.sql`
   setelah tabel `users` dan `villas` tersedia.
3. Pastikan kredensial database hanya disimpan sebagai environment variables,
   bukan di source code.

## 2. Deploy backend Flask

Gunakan `permatawisata_be/backend` sebagai working/root directory dan pasang
dependensi dari `requirements.txt`. Atur environment variables berikut di
dashboard hosting:

| Variable | Isi |
| --- | --- |
| `APP_ENV` | `production` |
| `JWT_SECRET` | Secret acak minimal 32 karakter; gunakan nilai rahasia yang sama selama deploy |
| `DB_HOST` | Host MySQL yang dapat dijangkau backend |
| `DB_USER` | User MySQL |
| `DB_PASSWORD` | Password MySQL |
| `DB_NAME` | Nama database MySQL |
| `FRONTEND_ORIGIN` | Origin frontend, misalnya `https://www.example.com` |
| `UPLOAD_FOLDER` | (Disarankan) direktori volume persisten untuk foto villa |

Jika frontend menggunakan domain berbeda, isi `FRONTEND_ORIGIN` dengan origin
frontend yang tepat, tanpa path. Beberapa origin dapat dipisahkan dengan koma.
Backend production memerlukan `JWT_SECRET` yang valid dan seluruh variable
database di atas. Jika konfigurasi tersebut tidak ada atau pool tidak dapat
terhubung ke MySQL, backend sengaja gagal saat startup agar deploy tidak
terlihat sehat sementara API database sebenarnya tidak berfungsi.

Perintah start pada hosting Linux yang menyediakan environment variable `PORT`:

```sh
gunicorn --bind "0.0.0.0:${PORT:-5000}" app:app
```

Pastikan volume `UPLOAD_FOLDER` dapat ditulis oleh proses aplikasi. Salin isi
`permatawisata_fe/public/images/villas` ke direktori tersebut dan pertahankan
struktur subdirektorinya. Penyimpanan lokal container yang tidak persisten akan
menghilangkan foto unggahan saat instance diganti atau redeploy.

## 3. Build dan deploy frontend

Set `REACT_APP_API_BASE_URL` sebagai environment variable pada tahap build ke
URL publik backend, misalnya `https://api.example.com` (tanpa slash di akhir).
Jika reverse proxy menyajikan frontend dan API dari origin yang sama, variable
ini dapat dikosongkan.

Build dari `permatawisata_fe`:

```sh
npm ci
npm run build
```

Publikasikan isi folder `permatawisata_fe/build`. Hosting static harus
mengarahkan URL aplikasi yang bukan file statis kembali ke `/index.html` agar
URL React Router seperti `/villas/1` tetap berfungsi saat dibuka atau direfresh.

## 4. Pemeriksaan setelah deploy

- Buka `/` dan beberapa URL langsung, termasuk `/villas` dan `/login`.
- Pastikan request `/api/villas` berhasil dan origin frontend tidak ditolak CORS.
- Uji login Admin/Owner dan alur booking sampai status pembayaran menunggu verifikasi admin.
- Alur pembayaran saat ini adalah transfer BCA/QRIS manual, bukan payment gateway
  otomatis. Pastikan rekening/QRIS yang dikonfigurasi di halaman pembayaran
  benar-benar milik bisnis dan admin siap memverifikasi pembayaran.
- Uji unggah dan tampilkan gambar villa; pastikan gambar tetap ada setelah restart.
- Pastikan backend menggunakan HTTPS dan kredensial/secret hanya di konfigurasi
  rahasia hosting.

Tes lokal dan build tidak dapat membuktikan koneksi database, domain, HTTPS,
aturan CORS, atau volume hosting tertentu; lakukan pemeriksaan di atas setelah
environment hosting diisi.
