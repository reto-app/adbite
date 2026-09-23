#!/usr/bin/env python3
"""The ten house spots that run along the foot of the Test Shop board.

They advertise AdBite itself, which is what an auxiliary board carries before
anything has been sold on it: the strip is never empty, and a shop looking at
the screen can see exactly what a booked spot will look like in their own
room.

Ten rather than one because the point of the strip is that it turns over, and
a rotation you cannot see turning reads as a still image. Each spot takes a
different plate colour so you can tell at a glance that the wall advanced —
which is the only way to check the rotation from across a room.

The QR codes are invented. They are drawn to the real format's proportions
(three finder patterns, a timing row, a quiet border) but the modules are
noise, so nothing scans them and nobody is sent anywhere. Point a phone at one
and it will simply fail to read, which is the honest outcome for a test board.

    python3 tools/make-test-ads.py              # -> test-shop/ads/*.png

Size is the banner slot on a portrait board: 1080 wide by adShare of 1920.
"""

import random
import sys
import tempfile
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT.parent / "public" / "brand"
OUT = ROOT / "test-shop" / "ads"

BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
BOOK = "/System/Library/Fonts/Supplemental/Arial.ttf"

# The published portrait banner spec (lib/boards.ts FORMATS), which is what an
# advertiser actually uploads. The device's slot is Int(1920 * 0.18) = 345 tall
# and the poster is scaleToFit, so the five pixels of difference letterbox
# invisibly against the slot's own colour.
WIDTH, HEIGHT = 1080, 340

# Ten plates, dark enough for white lettering to hold at ten feet. The order
# is the rotation order, so neighbours are kept far apart in hue: two greens
# in a row and the strip looks like it stopped.
PLATES = [
    ("teal",     (16, 74, 74)),
    ("clay",     (124, 52, 34)),
    ("indigo",   (34, 40, 96)),
    ("olive",    (58, 74, 30)),
    ("plum",     (79, 30, 66)),
    ("rust",     (140, 74, 22)),
    ("slate",    (38, 54, 70)),
    ("moss",     (26, 71, 47)),
    ("wine",     (98, 26, 44)),
    ("ink",      (26, 26, 30)),
]

# What each plate says. One line, read from the queue, so it is a claim and a
# price rather than a paragraph.
LINES = [
    ("Your ad, on this screen", "from $40 a month"),
    ("Every face in the queue", "sees this strip"),
    ("Local shops, local ads", "adbite.io"),
    ("Book a spot in a minute", "no contract"),
    ("A board that pays for itself", "ask the shop"),
    ("Reach the counter, not a feed", "adbite.io"),
    ("Fifteen seconds, every rotation", "from $40 a month"),
    ("The screen they already read", "adbite.io"),
    ("Advertise where they queue", "book online"),
    ("This space is for rent", "adbite.io"),
]


def mark(name, width, colour=(255, 255, 255)):
    """A traced brand shape (public/brand/adbite-<name>.svg) as an RGBA cutout
    `width` pixels wide. Same QuickLook path as tools/make-art.py: nothing on
    this Mac rasterises those SVGs cleanly except WebKit."""
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
    cutout = Image.new("RGBA", alpha.size, colour + (0,))
    cutout.putalpha(alpha)
    cutout.paste(colour, (0, 0), alpha)
    cutout.putalpha(alpha)
    return cutout


def fake_qr(size, seed, dark=(20, 20, 20), light=(255, 255, 255)):
    """A QR code that is not one.

    Version 3 geometry — 29 modules, three finder patterns, the timing rows —
    with random data modules and no error correction, drawn large and
    downsampled so the module edges stay square. It reads as a QR code from
    across a room and refuses to decode up close, which is what a test board
    should do."""
    modules = 29
    quiet = 2
    span = modules + quiet * 2
    scale = 16
    canvas = Image.new("RGB", (span * scale, span * scale), light)
    draw = ImageDraw.Draw(canvas)
    rng = random.Random(seed)

    def cell(col, row, fill=dark):
        x = (col + quiet) * scale
        y = (row + quiet) * scale
        draw.rectangle([x, y, x + scale - 1, y + scale - 1], fill=fill)

    reserved = set()

    def finder(col, row):
        """The 7x7 eye, plus the one-module separator around it."""
        for r in range(-1, 8):
            for c in range(-1, 8):
                cc, rr = col + c, row + r
                if not (0 <= cc < modules and 0 <= rr < modules):
                    continue
                reserved.add((cc, rr))
                ring = max(abs(c - 3), abs(r - 3))
                if 0 <= c <= 6 and 0 <= r <= 6 and ring != 2:
                    cell(cc, rr)

    finder(0, 0)
    finder(modules - 7, 0)
    finder(0, modules - 7)

    # The timing rows, which are what make the eye read it as a QR code.
    for i in range(8, modules - 8):
        reserved.add((i, 6))
        reserved.add((6, i))
        if i % 2 == 0:
            cell(i, 6)
            cell(6, i)

    # The alignment square a version 3 code carries in its lower right.
    for r in range(-2, 3):
        for c in range(-2, 3):
            cc, rr = modules - 7 + c, modules - 7 + r
            reserved.add((cc, rr))
            if max(abs(c), abs(r)) != 1:
                cell(cc, rr)

    for row in range(modules):
        for col in range(modules):
            if (col, row) in reserved:
                continue
            if rng.random() < 0.46:
                cell(col, row)

    return canvas.resize((size, size), Image.LANCZOS)


def spot(index):
    name, plate = PLATES[index]
    headline, foot = LINES[index]

    image = Image.new("RGB", (WIDTH, HEIGHT), plate)
    draw = ImageDraw.Draw(image)

    # A hairline of the plate lightened, top and bottom, so the spot reads as
    # a card sitting in the strip rather than as the strip itself.
    edge = tuple(min(255, channel + 42) for channel in plate)
    draw.rectangle([0, 0, WIDTH, 4], fill=edge)

    pad = 30

    # The QR sits on its own white tile at the right: a code printed straight
    # onto a dark plate is a code no camera will find.
    qr_size = HEIGHT - pad * 2 - 26
    tile = qr_size + 18
    tile_x = WIDTH - pad - tile
    tile_y = (HEIGHT - tile) // 2
    draw.rounded_rectangle(
        [tile_x, tile_y, tile_x + tile, tile_y + tile], radius=10, fill=(255, 255, 255)
    )
    image.paste(fake_qr(qr_size, seed=index * 7717), (tile_x + 9, tile_y + 9))

    scan = ImageFont.truetype(BOLD, 16)
    label = "SCAN TO BOOK"
    box = draw.textbbox((0, 0), label, font=scan)
    draw.text(
        (tile_x + (tile - (box[2] - box[0])) // 2 - box[0], tile_y + tile + 7),
        label,
        font=scan,
        fill=(255, 255, 255),
    )

    # The wordmark leads, because the spot is an advertisement for AdBite and
    # the name is the thing being advertised.
    word = mark("wordmark", 210)
    image.paste(word, (pad, pad + 4), word)

    # The headline is fitted to the space the QR tile leaves rather than set
    # at a fixed size: these lines are written to be read, not to be trimmed,
    # and a spot whose claim runs under the code is a spot that says nothing.
    room = tile_x - pad - 30
    lines, big = fit(draw, headline, room, ceiling=40, floor=26)

    top = pad + word.height + 20
    leading = int(big.size * 1.18)
    for line in lines:
        draw.text((pad, top), line, font=big, fill=(255, 255, 255))
        top += leading

    small = ImageFont.truetype(BOOK, 24)
    draw.text((pad, top + 6), foot, font=small, fill=edge_text(plate))

    # No bite device on the plate: at this size it sits next to the white QR
    # tile as a second pale shape in the same corner, and reads as a smudge
    # rather than as the mark. The wordmark carries the brand here.

    return image, name


def fit(draw, text, room, ceiling, floor):
    """The largest size at which `text` fits `room`, on one line if it can and
    two if it cannot. Returns the lines and the font."""
    for size in range(ceiling, floor - 1, -2):
        font = ImageFont.truetype(BOLD, size)
        if draw.textlength(text, font=font) <= room:
            return [text], font

    # Two lines, split at whichever space leaves the halves most even.
    words = text.split()
    best, score = None, None
    for i in range(1, len(words)):
        head, tail = " ".join(words[:i]), " ".join(words[i:])
        gap = abs(len(head) - len(tail))
        if score is None or gap < score:
            best, score = (head, tail), gap

    for size in range(ceiling, floor - 1, -2):
        font = ImageFont.truetype(BOLD, size)
        if max(draw.textlength(line, font=font) for line in best) <= room:
            return list(best), font
    return list(best), ImageFont.truetype(BOLD, floor)


def edge_text(plate):
    """A dimmed white that still holds on a dark plate."""
    return tuple(int(channel + (255 - channel) * 0.74) for channel in plate)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for index in range(len(PLATES)):
        image, name = spot(index)
        path = OUT / f"adbite-{index + 1:02d}-{name}.png"
        image.save(path)
        print(f"  {path.relative_to(ROOT)}  {image.width}x{image.height}")


if __name__ == "__main__":
    sys.exit(main())
