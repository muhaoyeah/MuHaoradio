from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "source-images" / "home-hero-originals"
OUT_DIR = ROOT / "public" / "assets" / "home-hero"

TARGET_SIZE = 2048


IMAGES = [
    {
        "src": "original-01.jpg",
        "out": "hero-01.jpg",
        "crop": (0, 80, 1440, 1520),
        "brightness": 1.03,
        "contrast": 1.05,
        "color": 1.04,
        "sharpness": 1.08,
        "denoise": 0.05,
    },
    {
        "src": "original-02.jpg",
        "out": "hero-02.jpg",
        "crop": (0, 380, 1440, 1820),
        "brightness": 1.00,
        "contrast": 1.04,
        "color": 1.02,
        "sharpness": 1.08,
        "denoise": 0.03,
    },
    {
        "src": "original-03.jpg",
        "out": "hero-03.jpg",
        "crop": (0, 0, 1440, 1440),
        "brightness": 1.08,
        "contrast": 1.07,
        "color": 1.03,
        "sharpness": 1.14,
        "denoise": 0.12,
    },
    {
        "src": "original-04.jpg",
        "out": "hero-04.jpg",
        "crop": (0, 90, 1440, 1530),
        "brightness": 1.03,
        "contrast": 1.04,
        "color": 1.03,
        "sharpness": 1.10,
        "denoise": 0.06,
    },
    {
        "src": "original-05.jpg",
        "out": "hero-05.jpg",
        "crop": (0, 80, 1440, 1520),
        "brightness": 1.10,
        "contrast": 1.07,
        "color": 1.02,
        "sharpness": 1.14,
        "denoise": 0.14,
    },
    {
        "src": "original-06.jpg",
        "out": "hero-06.jpg",
        "crop": (0, 0, 1440, 1440),
        "brightness": 1.04,
        "contrast": 1.06,
        "color": 1.03,
        "sharpness": 1.10,
        "denoise": 0.06,
    },
]


def blend_denoise(image: Image.Image, amount: float) -> Image.Image:
    if amount <= 0:
        return image
    smoothed = image.filter(ImageFilter.MedianFilter(size=3))
    return Image.blend(image, smoothed, amount)


def process_one(spec: dict[str, object]) -> Path:
    source_path = SOURCE_DIR / str(spec["src"])
    output_path = OUT_DIR / str(spec["out"])

    image = Image.open(source_path)
    image = ImageOps.exif_transpose(image).convert("RGB")
    image = image.crop(spec["crop"])
    image = image.resize((TARGET_SIZE, TARGET_SIZE), Image.Resampling.LANCZOS)

    image = blend_denoise(image, float(spec["denoise"]))
    image = ImageEnhance.Brightness(image).enhance(float(spec["brightness"]))
    image = ImageEnhance.Contrast(image).enhance(float(spec["contrast"]))
    image = ImageEnhance.Color(image).enhance(float(spec["color"]))
    image = ImageEnhance.Sharpness(image).enhance(float(spec["sharpness"]))
    image = image.filter(ImageFilter.UnsharpMask(radius=1.1, percent=85, threshold=3))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    image.save(output_path, "JPEG", quality=91, optimize=True, progressive=True)
    return output_path


def main() -> None:
    for spec in IMAGES:
        output = process_one(spec)
        print(output)


if __name__ == "__main__":
    main()
