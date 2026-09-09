import requests

res = requests.get('http://localhost:5000/api/villas/20')
data = res.json()
print("VILLA GUESTS:", data.get('guests'))
for r in data.get('rooms', []):
    print(f"ROOM {r['id_detail']} max_guests:", r['max_guests'])
