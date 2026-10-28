import villaImageUrl, { handleVillaImageError } from "./villaImageUrl";

test("uses the villa media route for legacy image paths", () => {
  expect(
    villaImageUrl(70, "/images/villas/villa_70/utama.png")
  ).toBe("/media/villas/villa_70/utama.png");
});

test("falls back to the shared villa image when the villa image is missing", () => {
  const image = {
    src: "http://localhost/media/villas/villa_70/utama.png",
    dataset: { fallbackStage: "0" },
    style: { display: "" },
  };

  handleVillaImageError({ currentTarget: image }, 70);

  expect(image.src).toBe("/media/villas/villa_1/utama.png");
  expect(image.style.display).toBe("");
});

test("hides an image after every fallback image fails", () => {
  const image = {
    src: "http://localhost/media/villas/villa_1/utama.png",
    dataset: { fallbackStage: "2" },
    style: { display: "" },
  };

  handleVillaImageError({ currentTarget: image }, 70);

  expect(image.style.display).toBe("none");
});
