#!/usr/bin/env python3
"""Channel art for the sideloaded package.

Roku wants a focus icon, a side icon and a splash, and it wants them as real
files in the zip. They are drawn here rather than checked in so the brand can
move in one place: black plate, the white traced wordmark, and the white bite out of the
top-right corner that the site uses as its device.
"""

import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

# The plate colour is the brand icon's own (public/brand/adbite-icon.svg).
INK = (13, 13, 13)
WHITE = (255, 255, 255)
DIM = (110, 123, 134)
BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

BRAND = Path(__file__).resolve().parents[2] / "public" / "brand"


def mark(name, width):
    """One of the traced brand shapes (public/brand/adbite-<name>.svg) as a
    white RGBA cutout `width` pixels wide.

    Nothing on this Mac rasterises those SVGs cleanly except WebKit, so they
    go through QuickLook: rendered black on white, then the luminance becomes
    the alpha. macOS-only, like the rest of the toolchain here."""
    svg = (BRAND / f"adbite-{name}.svg").read_text().replace("currentColor", "#000000")
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / f"{name}.svg"
        src.write_text(svg)
        subprocess.run(
            ["qlmanage", "-t", "-s", "2400", "-o", tmp, str(src)],
            check=True, capture_output=True,
        )
        rendered = Image.open(Path(tmp) / f"{name}.svg.png").convert("L")
    alpha = ImageOps.invert(rendered)
    alpha = alpha.crop(alpha.getbbox())
    height = round(alpha.height * width / alpha.width)
    alpha = alpha.resize((width, height), Image.LANCZOS)
    cutout = Image.new("RGBA", alpha.size, WHITE + (0,))
    cutout.putalpha(alpha)
    return cutout


def plate(width, height, wordmark, sub=None, bite=True):
    """Black plate, white wordmark centred, white bite out of the top-right
    corner: the brand icon's own layout, at whatever aspect Roku asks for.
    `wordmark` is the wordmark's width in pixels."""
    image = Image.new("RGBA", (width, height), INK + (255,))

    if bite:
        # The brand icon gives the bite 29% of the plate's width; on a wide
        # splash that is bounded by height instead so it stays a corner.
        size = min(int(width * 0.29), int(height * 0.34 * 363 / 313))
        shape = mark("bite", size)
        image.alpha_composite(shape, (width - shape.width, 0))

    word = mark("wordmark", wordmark)
    x = (width - word.width) // 2
    y = (height - word.height) // 2
    if sub:
        y -= int(word.height * 0.35)
    image.alpha_composite(word, (x, y))

    if sub:
        draw = ImageDraw.Draw(image)
        small = ImageFont.truetype(BOLD, sub)
        box = draw.textbbox((0, 0), "BOARD", font=small)
        sx = (width - (box[2] - box[0])) // 2 - box[0]
        draw.text((sx, y + word.height + int(sub * 0.9)), "BOARD", font=small, fill=DIM)

    return image.convert("RGB")


def star(size=64, points=5):
    """A five-pointed star on transparency, tinted at runtime by the board's
    accent through Poster.blendColor. Drawn rather than typed because U+2605 is
    not in every Roku system font, and a review under five empty boxes is worse
    than no review at all."""
    import math

    scale = 8  # drawn large and downsampled, for a clean edge
    canvas = size * scale
    image = Image.new("L", (canvas, canvas), 0)
    draw = ImageDraw.Draw(image)

    outer = canvas * 0.48
    inner = outer * 0.42
    centre = canvas / 2
    vertices = []
    for i in range(points * 2):
        radius = outer if i % 2 == 0 else inner
        angle = -math.pi / 2 + i * math.pi / points
        vertices.append((centre + radius * math.cos(angle), centre + radius * math.sin(angle)))
    draw.polygon(vertices, fill=255)

    mask = image.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    out.putalpha(mask)
    out.paste((255, 255, 255), (0, 0), mask)
    out.putalpha(mask)
    return out


star().save("images/star.png")
plate(290, 218, 210).save("images/icon_focus_hd.png")
plate(108, 69, 78).save("images/icon_side_hd.png")
plate(1920, 1080, 720, sub=56).save("images/splash_fhd.png")
plate(1280, 720, 480, sub=38).save("images/splash_hd.png")
print("wrote the star, the two icons and both splashes into images/")
