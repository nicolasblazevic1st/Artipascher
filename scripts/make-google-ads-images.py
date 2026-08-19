"""Génère les visuels Google Ads (paysage + carré) à partir des photos démo."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public"
LOGO = OUT / "ads-logo-1200.png"
PEINTURE = ROOT / "public/demo/projets/demo-peinture.jpg"
TOITURE = ROOT / "public/demo/projets/demo-toiture.jpg"

TEAL = (13, 148, 136)
TEAL_DARK = (15, 118, 110)
WHITE = (255, 255, 255)
YELLOW = (252, 211, 77)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(f"C:/Windows/Fonts/{name}", size)


def cover_crop(src: Image.Image, width: int, height: int) -> Image.Image:
    img = src.convert("RGB")
    scale = max(width / img.width, height / img.height)
    resized = img.resize((int(img.width * scale), int(img.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - width) // 2
    top = max(0, (resized.height - height) // 3)
    return resized.crop((left, top, left + width, top + height))


def paste_logo(base: Image.Image, size: int, xy: tuple[int, int]) -> None:
    logo = Image.open(LOGO).convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
    base.paste(logo, xy, logo)


def draw_bar(
    canvas: Image.Image,
    *,
    height: int,
    logo_size: int,
    title: str,
    subtitle: str,
    title_size: int,
    subtitle_size: int,
) -> None:
    draw = ImageDraw.Draw(canvas, "RGBA")
    w, h = canvas.size
    y0 = h - height
    draw.rectangle((0, y0, w, h), fill=(*TEAL_DARK, 235))
    draw.rectangle((0, y0, 8, h), fill=(*YELLOW, 255))
    pad = 20
    paste_logo(canvas, logo_size, (pad, y0 + (height - logo_size) // 2))
    tx = pad + logo_size + 18
    ty = y0 + (height - title_size - subtitle_size - 8) // 2
    draw.text((tx, ty), title, font=font(title_size, bold=True), fill=WHITE)
    draw.text((tx, ty + title_size + 4), subtitle, font=font(subtitle_size), fill=(204, 251, 241))


def make_landscape() -> None:
    photo = Image.open(PEINTURE)
    canvas = cover_crop(photo, 1200, 628).convert("RGBA")
    draw_bar(
        canvas,
        height=132,
        logo_size=92,
        title="Nord Artisan Pro",
        subtitle="Artisans vérifiés  ·  Nord 59 / 62",
        title_size=36,
        subtitle_size=22,
    )
    canvas.convert("RGB").save(OUT / "ads-landscape-1200x628.jpg", "JPEG", quality=92)


def make_square() -> None:
    photo = Image.open(TOITURE)
    canvas = cover_crop(photo, 1200, 1200).convert("RGBA")
    draw_bar(
        canvas,
        height=180,
        logo_size=128,
        title="Nord Artisan Pro",
        subtitle="Artisans vérifiés  ·  Nord 59 / 62",
        title_size=44,
        subtitle_size=26,
    )
    canvas.convert("RGB").save(OUT / "ads-square-1200.jpg", "JPEG", quality=92)


if __name__ == "__main__":
    make_landscape()
    make_square()
    print("OK", OUT / "ads-landscape-1200x628.jpg")
    print("OK", OUT / "ads-square-1200.jpg")
    print("OK", LOGO)
