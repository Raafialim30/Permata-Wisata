import API_BASE_URL from "../config";

const MEDIA_PATH = "/media/villas/";

function encodePath(path) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export default function villaImageUrl(villaId, image) {
  const imagePath = String(image || "utama.png").trim();

  if (/^(data:|blob:)/i.test(imagePath)) {
    return imagePath;
  }

  let relativePath = imagePath.replace(/\\/g, "/").replace(/^\/+/, "");

  if (/^https?:\/\//i.test(imagePath)) {
    const imageUrl = new URL(imagePath, window.location.href);
    const mediaIndex = imageUrl.pathname.indexOf(MEDIA_PATH);
    const legacyIndex = imageUrl.pathname.indexOf("/images/villas/");

    if (mediaIndex >= 0) {
      relativePath = imageUrl.pathname.slice(mediaIndex + MEDIA_PATH.length);
    } else if (legacyIndex >= 0) {
      relativePath = imageUrl.pathname.slice(legacyIndex + "/images/villas/".length);
    } else {
      return imagePath;
    }
  } else if (relativePath.startsWith("images/villas/")) {
    relativePath = relativePath.slice("images/villas/".length);
  } else if (relativePath.startsWith("media/villas/")) {
    relativePath = relativePath.slice("media/villas/".length);
  } else if (!relativePath.startsWith("villa_")) {
    relativePath = `villa_${villaId}/${relativePath}`;
  }

  return `${API_BASE_URL}${MEDIA_PATH}${encodePath(relativePath)}`;
}

export function handleVillaImageError(event, villaId) {
  const image = event.currentTarget;
  const fallbacks = [
    villaImageUrl(villaId, "utama.png"),
    villaImageUrl(1, "utama.png"),
  ];
  let fallbackStage = Number(image.dataset.fallbackStage || 0);

  while (fallbackStage < fallbacks.length) {
    const fallbackImage = fallbacks[fallbackStage];
    fallbackStage += 1;
    image.dataset.fallbackStage = String(fallbackStage);

    if (image.src !== new URL(fallbackImage, window.location.href).href) {
      image.src = fallbackImage;
      return;
    }
  }

  image.style.display = "none";
}
