import requests

# 1. Update room 118 with empty max_guests
payload = {
    "villa_id": 14,
    "bed_info": "Facilities",
    "room_type": "Standard Room",
    "price": 0,
    "max_guests": ""
}
res = requests.put('http://localhost:5000/api/admin/villa-details/118', json=payload)
print("UPDATE RESP:", res.json())

# 2. Check current data
res = requests.get('http://localhost:5000/api/villas/14')
data = res.json()
print("VILLA GUESTS:", data.get('guests'))
for r in data.get('rooms', []):
    print(f"ROOM {r['id_detail']} max_guests:", r['max_guests'])
