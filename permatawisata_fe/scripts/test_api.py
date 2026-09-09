import requests

# 1. Check current data
res = requests.get('http://localhost:5000/api/villas/14')
data = res.json()
print("VILLA GUESTS:", data.get('guests'))
for r in data.get('rooms', []):
    print(f"ROOM {r['id_detail']} max_guests:", r['max_guests'])
