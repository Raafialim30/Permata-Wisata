import API_BASE_URL from "../config";

const PLACEHOLDER_SVG =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22300%22%20viewBox%3D%220%200%20400%20300%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23e2e8f0%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%20fill%3D%22%2394a3b8%22%3EGambar%20Tidak%20Tersedia%3C%2Ftext%3E%3C%2Fsvg%3E";

export default function villaImageUrl(villaId, image) {
  if (!image) {
    if (villaId) {
      return `${API_BASE_URL}/media/villas/villa_${villaId}/utama.png`;
    }
    return PLACEHOLDER_SVG;
  }

  let rawPath = String(image).trim();

  // 1. URL lengkap (data URI, blob, atau http/https)
  if (/^(data:|blob:|https?:\/\/)/i.test(rawPath)) {
    return rawPath;
  }

  // 2. Normalisasi backslash dan bersihkan slash ganda di depan
  let clean = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");

  // 3. Konversi legacy frontend path ("images/...") ke "media/..."
  if (clean.startsWith("images/villas/")) {
    clean = clean.replace(/^images\/villas\//, "media/villas/");
  } else if (clean.startsWith("images/")) {
    clean = clean.replace(/^images\//, "media/");
  }

  // 4. Hapus duplikasi "media/" jika ada bertumpuk di depan string
  if (clean.startsWith("media/")) {
    clean = clean.replace(/^media\//, "");
  }

  // 5. Jika path berawalan "villas/" (contoh dari scanner backend: "villas/villa 2/rooms/room_13/1.png")
  if (clean.startsWith("villas/")) {
    return `${API_BASE_URL}/media/${clean}`;
  }

  // 6. Jika path berawalan "villa_" atau "villa "
  if (/^villa[_\s]/i.test(clean)) {
    return `${API_BASE_URL}/media/villas/${clean}`;
  }

  // 7. Jika berupa path kamar relatif atau nama file biasa (misal: "rooms/room_1/1.jpg" atau "utama.png")
  if (villaId) {
    return `${API_BASE_URL}/media/villas/villa_${villaId}/${clean}`;
  }

  return `${API_BASE_URL}/media/${clean}`;
}

export function handleVillaImageError(event) {
  const image = event.currentTarget;
  image.onerror = null;
  image.src = PLACEHOLDER_SVG;
}