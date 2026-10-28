import requests

# Simulasi: admin simpan unit dengan max_guests kosong (seperti dari form yang dikosongkan)
payload_empty = {
    "villa_id": 20,
    "bed_info": "Test Unit",
    "room_type": "Standard Room",
    "price": 0,
    "facilities": "",
    "img": "room_133_1.png",
    "description": "",
    "max_guests": "",       # kosong = harus fallback ke villa-level guests
    "max_age_rule": "",
    "other_facilities": "",
    "snk": "",
    "room_count": "",
    "bathroom_count": "",
    "bathroom_type": "",
    "amenities": "",
    "equipment": "",
    "hours": "",
    "location": ""
}

# Update room 133 dengan data kosong
res = requests.put('http://localhost:5000/api/admin/villa-details/133', json=payload_empty)
print("UPDATE:", res.json())

# Simpan villa 20 dengan guests yang benar (simulasi admin simpan data utama)
villa_payload = {
    "name": "Demoska Jogja Villas",
    "location": "Sleman, Yogyakarta",
    "guests": "20 Orang",   # ini yang admin isi
    "beds": 7,
    "baths": 7,
    "price": 0,
    "rating": 5,
    "status": "available",
    "img": "Demoska Jogja Villas.jpg",
    "whatsapp": "",
    "promo": "0"
}
res2 = requests.put('http://localhost:5000/api/admin/villas/20', json=villa_payload)
print("VILLA UPDATE:", res2.json())

# Cek hasilnya
res3 = requests.get('http://localhost:5000/api/villas/20')
data = res3.json()
print("\nHASIL API villa 20:")
print("  Villa guests:", data.get('guests'))
for r in data.get('rooms', []):
    print(f"  Room {r['id_detail']} max_guests: {r['max_guests']}")
