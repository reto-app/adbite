#!/usr/bin/env python3
"""Render what the TV will show, without a TV.

This is a second implementation of the layout in components/MenuPane.brs,
components/AdPane.brs and the pairing and screensaver screens in
components/BoardScene.xml, at the same 1920x1080 and off the same board.json.
It exists because the only other way to see whether text fits is to sideload
it and walk over to the wall, and because a Label that overflows its declared
height is clipped silently rather than erroring -- which is how the pairing
screen shipped once with its help text running through the tip box.

Keep it in step with the channel by hand. If the two disagree, the device is
right and this is wrong.

    tools/preview.py [board.json] [-o dist/preview]
    tools/preview.py --screens-only
"""

import argparse
import hashlib
import json
import pathlib
import urllib.request

from PIL import Image, ImageDraw, ImageFont

BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
BOOK = "/System/Library/Fonts/Supplemental/Arial.ttf"

SZ = dict(
    padX=72, padTop=64, padBottom=56, colGap=58,
    shop=65, tagline=26, slot=24, section=33, item=29, note=22,
    price=31, badge=18, quote=24, cite=21,
    lineItem=36, lineNote=29, gapItem=11, gapTitle=13, gapSection=35,
    sectionPic=134, headH=118, reviewH=62, slotW=260,
)

# The four stock themes, for a board.json written before the server started
# sending a resolved palette. A board with `palette` in it ignores these --
# see PALETTE below and BoardPalette() in components/theme.brs.
THEMES = {
    "chalk":  dict(bg="#14100D", ink="#FFFFFF", dim=0.60, rule=0.18, accent="#FFC72C", ad=0.08),
    "enamel": dict(bg="#F3EAD6", ink="#241D12", dim=0.60, rule=0.18, accent="#8A6A2F", ad=0.08),
    "warm":   dict(bg="#B4502F", ink="#FDF3E7", dim=0.60, rule=0.18, accent="#FFD9A0", ad=0.08),
    "garden": dict(bg="#12372A", ink="#F4F1E4", dim=0.60, rule=0.18, accent="#D9B45C", ad=0.08),
}

# SZ is rewritten per render for a board on a narrower canvas, so the figures
# it is rewritten *from* are kept here. Mirrors loadSizes()/sizeForCanvas().
BASE_SZ = dict(SZ)

BADGES = {"new": "New", "popular": "Popular", "out": "Sold out"}

# Files the board refers to by URL. A Roku downloads them to cachefs: and
# verifies them against the hash the server sent; this does the same thing to
# a directory beside the output, so a run with no network still renders (with
# a grey box where the picture would be) rather than failing.
CACHE = pathlib.Path(__file__).resolve().parent.parent / "out" / "assets"

# Set per render by faces(): the two TTFs the shop's board is set in, or None
# for the system font. Mirrors SetBoardFaces() in components/theme.brs.
FACES = {"display": None, "body": None}


def fetch(url, sha256=None, suffix=""):
    """A downloaded file, cached by its hash the way the device caches it."""
    if not url or not url.startswith("http"):
        return None
    key = sha256 or hashlib.sha256(url.encode()).hexdigest()
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{key[:20]}{suffix or pathlib.Path(url.split('?')[0]).suffix or '.bin'}"
    if path.exists():
        return path
    try:
        # Cloudflare in front of the assets bucket rejects urllib's own agent
        # with a 403. A Roku's roUrlTransfer sends a Roku agent and is fine;
        # this only has to look like something other than a script.
        request = urllib.request.Request(url, headers={"User-Agent": "adbite-preview/1.0"})
        with urllib.request.urlopen(request, timeout=20) as response:
            data = response.read()
    except Exception as problem:  # offline, or the file is gone
        print(f"  ! could not fetch {url}: {problem}")
        return None
    if sha256 and hashlib.sha256(data).hexdigest() != sha256:
        print(f"  ! hash mismatch for {url}; a device would refuse this file")
        return None
    path.write_bytes(data)
    return path


def pictures_in(config):
    """url -> local file, for every picture the board names."""
    out = {}
    for picture in config.get("pictures") or []:
        local = fetch(picture.get("src"), picture.get("sha256"))
        if local:
            out[picture.get("url") or picture.get("src")] = local
    return out


def faces(config):
    """The two TTFs this board is set in, downloaded and verified."""
    files = config.get("fontFiles") or {}
    for role in ("display", "body"):
        face = files.get(role) or {}
        weight = face.get("bold" if role == "display" else "regular")
        FACES[role] = fetch((weight or {}).get("src"), (weight or {}).get("sha256"), ".ttf") if weight else None


def star_polygon(draw, x, y, size, fill, points=5):
    """The same five-pointed star images/star.png carries to the device."""
    import math

    outer, centre = size * 0.48, size / 2
    inner = outer * 0.42
    vertices = []
    for i in range(points * 2):
        radius = outer if i % 2 == 0 else inner
        angle = -math.pi / 2 + i * math.pi / points
        vertices.append((x + centre + radius * math.cos(angle), y + centre + radius * math.sin(angle)))
    draw.polygon(vertices, fill=fill)


def ellipsize(draw, text, f, width):
    """Roku truncates a Label that will not fit; PIL has to be told to."""
    if width <= 0 or draw.textlength(text, font=f) <= width:
        return text
    while text and draw.textlength(text + "...", font=f) > width:
        text = text[:-1]
    return text + "..."


def rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def over(color, base, alpha):
    return tuple(round(c * alpha + b * (1 - alpha)) for c, b in zip(color, base))


def font(size, bold):
    """Bold is the board's display face, regular is its body face -- the same
    split BoardFont() makes on the device and --bd-display/--bd-body make in
    the web preview. A face that did not download falls back to the system
    font, which is what a TV would do too."""
    chosen = FACES["display" if bold else "body"]
    try:
        return ImageFont.truetype(str(chosen) if chosen else (BOLD if bold else BOOK), max(1, int(size)))
    except OSError:
        return ImageFont.truetype(BOLD if bold else BOOK, max(1, int(size)))


def drawable_items(section):
    return [i for i in section.get("items", []) if (i.get("name") or "").strip()]


def sections_for(board, slot_id):
    out = []
    for section in board.get("slots", {}).get(slot_id, []):
        if drawable_items(section):
            out.append(section)
    return out


def price_column_width(chars, scale):
    """Measured off the board's own prices, not a fixed reserve."""
    return max(int(52 * scale), int(chars * SZ["price"] * scale * 0.62) + int(16 * scale))


def section_picture_height(section, scale, art):
    if not art.get(section.get("image") or ""):
        return 0
    return int(SZ["sectionPic"] * scale) + int(SZ["gapTitle"] * scale)


def section_height(section, scale, art=None):
    height = int(SZ["section"] * scale) + int(SZ["gapTitle"] * scale)
    height += section_picture_height(section, scale, art or {})
    for entry in drawable_items(section):
        height += int(SZ["lineItem"] * scale)
        if (entry.get("note") or "").strip():
            height += int(SZ["lineNote"] * scale)
        height += int(SZ["gapItem"] * scale)
    return height + int(SZ["gapSection"] * scale)


def balance_point(heights, columns=2):
    """First section of the right column: the break that evens the two out."""
    if columns == 1:
        return len(heights)
    total = sum(heights)
    best, best_tallest, running = 1, total, 0
    for index, height in enumerate(heights):
        running += height
        tallest = max(running, total - running)
        if tallest < best_tallest:
            best_tallest, best = tallest, index + 1
    return best


def split(heights, columns=2):
    if not heights:
        return []
    cut = balance_point(heights, columns)
    return [0 if i < cut else 1 for i in range(len(heights))]


def tallest_column(sections, scale, art=None, columns=2):
    heights = [section_height(s, scale, art) for s in sections]
    if not heights:
        return 0
    columns = split(heights, columns)
    first = sum(h for h, c in zip(heights, columns) if c == 0)
    second = sum(h for h, c in zip(heights, columns) if c == 1)
    return max(first, second)


def width_ceiling(draw, sections, col_width, price_chars):
    """Largest scale at which every row still fits across its column."""
    gap = 16
    reserve = price_chars * SZ["price"] * 0.62 + 16 + gap
    ruler = font(SZ["item"], True)

    ceiling = 99.0
    for section in sections:
        for entry in drawable_items(section):
            needed = draw.textlength(entry.get("name", ""), font=ruler) + reserve
            badge = entry.get("badge", "none")
            if badge in BADGES:
                needed += len(BADGES[badge]) * SZ["badge"] * 0.70 + 24 + gap
            if needed > 0:
                ceiling = min(ceiling, col_width / needed)
    return 1.0 if ceiling == 99.0 else ceiling


def fit_scale(draw, sections, available, col_width, price_chars, art=None, columns=2):
    """Shrink a long menu to fit and grow a short one to fill."""
    floor_scale = 0.62
    ceiling_scale = min(1.75, max(floor_scale, width_ceiling(draw, sections, col_width, price_chars)))
    scale = 1.0
    for _ in range(8):
        tallest = tallest_column(sections, scale, art, columns)
        if tallest <= 0:
            return 1.0
        wanted = min(ceiling_scale, max(floor_scale, scale * ((available / tallest) * 0.98)))
        if abs(wanted - scale) < 0.01:
            return wanted
        scale = wanted
    return scale


def paste(image, path, box, fit):
    """A picture drawn into a box, cropped to fill or fitted whole -- the two
    loadDisplayMode values MenuPane.brs uses ("scaleToZoom", "scaleToFit")."""
    x, y, w, h = int(box[0]), int(box[1]), int(box[2]), int(box[3])
    if w < 1 or h < 1:
        return
    try:
        picture = Image.open(path).convert("RGB")
    except Exception:
        return
    pw, ph = picture.size
    factor = max(w / pw, h / ph) if fit == "cover" else min(w / pw, h / ph)
    size = (max(1, round(pw * factor)), max(1, round(ph * factor)))
    picture = picture.resize(size, Image.LANCZOS)
    # Cropped to the box, because a Poster clips to its own width and height
    # and pasting the whole resized image spills it over the menu beside it.
    if fit == "cover":
        left = max(0, (size[0] - w) // 2)
        top = max(0, (size[1] - h) // 2)
        picture = picture.crop((left, top, left + min(w, size[0]), top + min(h, size[1])))
        size = picture.size
    image.paste(picture, (x + (w - size[0]) // 2, y + (h - size[1]) // 2))


def palette_of(config):
    """The colours as the server resolved them, which is what the device
    draws with. Mirrors BoardPalette() in components/theme.brs, including the
    fall back to a stock theme for a board written before the field existed."""
    sent = config.get("palette")
    keys = ("bg", "ink", "accent", "dim", "rule", "ad", "onAccent")
    if isinstance(sent, dict) and all(isinstance(sent.get(k), str) for k in keys):
        return {k: rgb(sent[k].removeprefix("0x")[:6]) for k in keys}

    theme = THEMES.get((config.get("board") or {}).get("theme"), THEMES["chalk"])
    bg, ink = rgb(theme["bg"]), rgb(theme["ink"])
    return {
        "bg": bg, "ink": ink, "accent": rgb(theme["accent"]),
        "dim": over(ink, bg, theme["dim"]),
        "rule": over(ink, bg, theme["rule"]),
        "ad": over(ink, bg, theme["ad"]),
        "onAccent": bg,
    }


def render(config, slot_id, out_path):
    board = config["board"]
    faces(config)
    art = pictures_in(config)
    palette = palette_of(config)
    bg, ink, accent = palette["bg"], palette["ink"], palette["accent"]
    dim, rule = palette["dim"], palette["rule"]

    share = min(0.5, max(0.0, board.get("adShare", 0)))
    placement = config.get("adLayout", "rail")

    # A TV hung on its end is laid out on a 1080x1920 canvas and the whole
    # picture is rotated into the 1920x1080 frame -- CanvasFor() and
    # PortraitTransform() in components/theme.brs. Drawn here the way the
    # person standing in front of it sees it, which is the only way a fit
    # pass on a portrait board means anything.
    portrait = (board.get("orientation") or "landscape") == "portrait"
    canvas_w, canvas_h = (1080, 1920) if portrait else (1920, 1080)

    # Everything below is sized off the width of the board, the way `cqw` is
    # in the web preview, so a narrower canvas shrinks the whole table.
    if canvas_w < 1920:
        ratio = canvas_w / 1920
        for key in SZ:
            SZ[key] = int(BASE_SZ[key] * ratio)
    else:
        SZ.update(BASE_SZ)

    image = Image.new("RGB", (canvas_w, canvas_h), bg)
    draw = ImageDraw.Draw(image)

    if share == 0:
        W, H = canvas_w, canvas_h
    elif placement == "banner":
        W, H = canvas_w, canvas_h - int(canvas_h * share)
        slot_box = (0, H, canvas_w, canvas_h)
    else:
        W, H = canvas_w - int(canvas_w * share), canvas_h
        slot_box = (W, 0, canvas_w, canvas_h)

    # ---- the ad slot ----
    if share > 0:
        x0, y0, x1, y1 = slot_box
        panel = Image.new("RGB", (x1 - x0, y1 - y0), palette["ad"])
        hatch = ImageDraw.Draw(panel)
        offset = -(y1 - y0)
        while offset < (x1 - x0) + (y1 - y0):
            hatch.line([(offset, y1 - y0), (offset + (y1 - y0), 0)], fill=rule, width=2)
            offset += 29
        image.paste(panel, (x0, y0))
        label = "Ad space"
        f = font(29, True)
        w = draw.textlength(label, font=f)
        draw.text(((x0 + x1 - w) / 2, (y0 + y1) / 2 - 42), label, font=f, fill=ink)
        pct = f"{round(share * 100)}% of the screen"
        f = font(21, False)
        w = draw.textlength(pct, font=f)
        draw.text(((x0 + x1 - w) / 2, (y0 + y1) / 2 + 4), pct, font=f, fill=dim)

    # ---- a board the shop placed by hand ----
    # Before the header, because the header is part of the automatic layout:
    # a placed board draws its own name band as a block. MenuPane.brs returns
    # at the same point, before drawHeader(). No fit pass and no column
    # balancing either -- the shop said where everything goes.
    if (board.get("layouts") or {}).get(slot_id):
        draw_placed(image, draw, config, board, slot_id, art, palette, W, H)
        image.save(out_path)
        return 1.0, 0

    # ---- header ----
    head_x = SZ["padX"]
    logo = art.get(board.get("logo") or "")
    if logo:
        size = SZ["shop"] + 8
        paste(image, logo, (SZ["padX"], SZ["padTop"], size, size), "contain")
        head_x = SZ["padX"] + size + 20
    draw.text((head_x, SZ["padTop"] - 4), board.get("shopName") or "Your shop",
              font=font(SZ["shop"], True), fill=ink)
    windows = {w["id"]: w.get("label", w["id"]) for w in config.get("slotWindows", [])}
    label = windows.get(slot_id, slot_id).upper()
    f = font(SZ["slot"], True)
    draw.text((W - SZ["padX"] - draw.textlength(label, font=f), SZ["padTop"] + 30),
              label, font=f, fill=accent)
    if board.get("tagline"):
        draw.text((head_x, SZ["padTop"] + SZ["shop"] + 12), board["tagline"],
                  font=font(SZ["tagline"], False), fill=dim)
    top_rule = SZ["padTop"] + SZ["headH"] + 14
    draw.rectangle([SZ["padX"], top_rule, W - SZ["padX"], top_rule + 2], fill=rule)

    # ---- the menu ----
    sections = sections_for(board, slot_id)
    columns = 1 if canvas_w < 1400 else 2
    col_width = (W - 2 * SZ["padX"] + SZ["colGap"]) / 2 - SZ["colGap"] if columns == 2 else W - 2 * SZ["padX"]
    reviews = [r for r in (board.get("reviews", {}).get("items", []) if board.get("reviews", {}).get("on") else [])
               if (r.get("quote") or "").strip()]
    top = SZ["padTop"] + SZ["headH"] + 31
    bottom = H - SZ["padBottom"] - (SZ["reviewH"] if reviews else 0)
    price_chars = max([len(entry.get("price") or "")
                       for section in sections
                       for entry in drawable_items(section)] + [1])
    scale = fit_scale(draw, sections, bottom - top, col_width, price_chars, art, columns)

    # A menu that still will not fit at the floor takes the review bar's strip.
    if reviews and tallest_column(sections, scale, art, columns) > bottom - top:
        reviews = []
        bottom = H - SZ["padBottom"]
        scale = fit_scale(draw, sections, bottom - top, col_width, price_chars, art, columns)

    heights = [section_height(s, scale, art) for s in sections]
    lanes = split(heights, columns)
    slack = (bottom - top) - tallest_column(sections, scale, art, columns)
    if slack > 0:
        top += slack / 2
    y = [top, top]
    for section, height, column in zip(sections, heights, lanes):
        x = SZ["padX"] + (col_width + SZ["colGap"] if column else 0)
        cursor = y[column]
        picture_h = section_picture_height(section, scale, art)
        if picture_h:
            paste(image, art[section["image"]], (x, cursor, col_width, int(SZ["sectionPic"] * scale)), "cover")
            cursor += picture_h
        draw.text((x, cursor), (section.get("title") or "").upper(),
                  font=font(SZ["section"] * scale, True), fill=accent)
        cursor += int(SZ["section"] * scale) + int(SZ["gapTitle"] * scale)

        price_width = price_column_width(price_chars, scale)
        name_width = col_width - price_width - int(16 * scale)
        line_item = int(SZ["lineItem"] * scale)

        for entry in drawable_items(section):
            sold = entry.get("badge") == "out"
            shade = over(ink, bg, 0.4) if sold else ink
            badge = entry.get("badge", "none")

            f = font(SZ["item"] * scale, True)
            name = entry.get("name", "")
            text_width = draw.textlength(name, font=f)

            pill_left = None
            if badge in BADGES:
                text = BADGES[badge].upper()
                size = int(SZ["badge"] * scale)
                pill_w = int(len(text) * size * 0.70) + int(24 * scale)
                gap = int(16 * scale)
                pill_left = text_width + gap
                if pill_left + pill_w > name_width:
                    pill_left = name_width - pill_w
                    name = ellipsize(draw, name, f, name_width - pill_w - gap)
            elif text_width > name_width:
                name = ellipsize(draw, name, f, name_width)

            draw.text((x, cursor + (line_item - f.size) / 2 - 2), name, font=f, fill=shade)

            if pill_left is not None:
                pill_h = int(size * 1.7)
                left = x + max(0, pill_left)
                pill_y = cursor + (line_item - pill_h) / 2
                draw.rectangle([left, pill_y, left + pill_w, pill_y + pill_h],
                               fill=rule if sold else accent)
                bf = font(size, True)
                draw.text((left + (pill_w - draw.textlength(text, font=bf)) / 2,
                           pill_y + (pill_h - size) / 2 - 2), text, font=bf,
                          fill=dim if sold else palette["onAccent"])

            pf = font(SZ["price"] * scale, True)
            price = entry.get("price", "")
            draw.text((x + col_width - draw.textlength(price, font=pf),
                       cursor + (line_item - pf.size) / 2 - 2), price, font=pf, fill=shade)
            cursor += line_item

            if (entry.get("note") or "").strip():
                draw.text((x, cursor), entry["note"], font=font(SZ["note"] * scale, False),
                          fill=over(ink, bg, 0.4) if sold else dim)
                cursor += int(SZ["lineNote"] * scale)
            cursor += int(SZ["gapItem"] * scale)
        y[column] += height

    # ---- the review foot ----
    if reviews:
        review = reviews[0]
        base = bottom + 6
        draw.rectangle([SZ["padX"], base, W - SZ["padX"], base + 2], fill=rule)
        count = max(1, min(5, int(review.get("stars", 5))))
        for index in range(count):
            star_polygon(draw, SZ["padX"] + index * 27, base + 18, 24, accent)
        draw.text((SZ["padX"] + 150, base + 16), f"“{review['quote']}”",
                  font=font(SZ["quote"], False), fill=ink)
        cite = review.get("author", "")
        if review.get("source"):
            cite += f" · {review['source']}"
        f = font(SZ["cite"], False)
        draw.text((W - SZ["padX"] - draw.textlength(cite, font=f), base + 18), cite, font=f, fill=dim)

    image.save(out_path)
    overflow = tallest_column(sections, scale, art, columns) - (bottom - top)
    return scale, overflow


# ---- a board placed by hand ------------------------------------------------
#
# Mirrors drawPlaced() and friends in components/MenuPane.brs. The blocks are
# rectangles in grid cells; the grid comes down in config["grid"] so
# lib/layout.ts stays the one place those numbers live.


def draw_placed(image, draw, config, board, slot_id, art, palette, W, H):
    grid = config.get("grid") or {"cols": 24, "rows": 14}
    cols, rows = max(1, int(grid.get("cols", 24))), max(1, int(grid.get("rows", 14)))
    box_x, box_y = SZ["padX"], SZ["padTop"]
    box_w = W - 2 * SZ["padX"]
    box_h = H - SZ["padTop"] - SZ["padBottom"]
    if box_w < 1 or box_h < 1:
        return

    cell_w, cell_h = box_w / cols, box_h / rows
    sections = {s.get("id"): s for s in sections_for(board, slot_id)}
    price_chars = max([len(e.get("price") or "")
                       for s in sections.values() for e in drawable_items(s)] + [1])

    for block in board.get("layouts", {}).get(slot_id) or []:
        x = box_x + float(block.get("x", 0)) * cell_w
        y = box_y + float(block.get("y", 0)) * cell_h
        w = float(block.get("w", 1)) * cell_w
        h = float(block.get("h", 1)) * cell_h
        if w < 1 or h < 1:
            continue
        scale = min(3.0, max(0.4, float(block.get("scale", 1) or 1)))

        def one(target, target_draw, at_x, at_y):
            kind = block.get("kind")
            if kind == "head":
                placed_head(target, target_draw, config, board, slot_id, art, palette,
                            at_x, at_y, w, h, scale)
            elif kind == "section":
                placed_section(target, target_draw, sections.get(block.get("sectionId")), art, palette,
                               at_x, at_y, w, h, scale, price_chars)
            elif kind == "text":
                placed_text(target_draw, block, palette, at_x, at_y, w, h, scale)
            elif kind in ("image", "logo"):
                src = block.get("src") or (board.get("logo") if kind == "logo" else None)
                local = art.get(src or "")
                if local:
                    fit = "contain" if (block.get("fit") == "contain" or kind == "logo") else "cover"
                    paste(target, local, (at_x, at_y, w, h), fit)
            elif kind == "reviews":
                placed_reviews(target_draw, board, palette, at_x, at_y, w, h)

        # A turned block is drawn square into a transparent tile of its own and
        # the tile is spun about the middle of the rectangle, which is what
        # MenuPane does with a rotated Group and what the browser does with
        # `transform: rotate()`. Degrees are clockwise on the board, and PIL
        # turns anticlockwise for a positive angle.
        turn = float(block.get("rotate", 0) or 0)
        if turn:
            tile = Image.new("RGBA", (max(1, int(w) + 2), max(1, int(h) + 2)), (0, 0, 0, 0))
            one(tile, ImageDraw.Draw(tile), 0, 0)
            spun = tile.rotate(-turn, expand=True, resample=Image.BICUBIC)
            image.paste(spun, (int(x + w / 2 - spun.width / 2), int(y + h / 2 - spun.height / 2)), spun)
        else:
            one(image, draw, x, y)


def placed_head(image, draw, config, board, slot_id, art, palette, x, y, w, h, scale):
    left = 0
    logo = art.get(board.get("logo") or "")
    if logo:
        size = min(h * 0.6, w * 0.25)
        if size > 8:
            paste(image, logo, (x, y, size, size), "contain")
            left = size + int(18 * scale)

    name_size = int(SZ["shop"] * scale)
    slot_w = min(int(SZ["slotW"] * scale), int(w * 0.3))

    f = font(name_size, True)
    draw.text((x + left, y), ellipsize(draw, board.get("shopName") or "Your shop", f, w - left - slot_w),
              font=f, fill=palette["ink"])

    windows = {entry["id"]: entry.get("label", entry["id"]) for entry in config.get("slotWindows", [])}
    label = windows.get(slot_id, slot_id).upper()
    sf = font(int(SZ["slot"] * scale), True)
    draw.text((x + w - draw.textlength(label, font=sf), y + name_size - sf.size),
              label, font=sf, fill=palette["accent"])

    if board.get("tagline"):
        tf = font(int(SZ["tagline"] * scale), False)
        draw.text((x + left, y + name_size + int(12 * scale)),
                  ellipsize(draw, board["tagline"], tf, w - left), font=tf, fill=palette["dim"])

    draw.rectangle([x, y + h - 2, x + w, y + h], fill=palette["rule"])


def placed_section(image, draw, section, art, palette, x, y, w, h, scale, price_chars):
    if not section:
        return
    cursor = 0.0

    picture = art.get(section.get("image") or "")
    if picture:
        picture_h = h * 0.32
        if picture_h > 8:
            paste(image, picture, (x, y, w, picture_h), "cover")
            cursor = picture_h + int(14 * scale)

    title_size = int(SZ["section"] * scale)
    tf = font(title_size, True)
    draw.text((x, y + cursor), ellipsize(draw, (section.get("title") or "").upper(), tf, w),
              font=tf, fill=palette["accent"])
    cursor += title_size + int(SZ["gapTitle"] * scale)

    price_width = price_column_width(price_chars, scale)
    name_width = w - price_width - int(16 * scale)
    line_item = int(SZ["lineItem"] * scale)

    for entry in drawable_items(section):
        row_h = line_item + (int(SZ["lineNote"] * scale) if (entry.get("note") or "").strip() else 0)
        row_h += int(SZ["gapItem"] * scale)
        # The row that would hang out of the bottom, and every row after it, is
        # not drawn -- what overflow:hidden does in the web preview, near enough.
        if cursor + row_h > h:
            break

        sold = entry.get("badge") == "out"
        shade = over(palette["ink"], palette["bg"], 0.4) if sold else palette["ink"]
        f = font(int(SZ["item"] * scale), True)
        draw.text((x, y + cursor + (line_item - f.size) / 2 - 2),
                  ellipsize(draw, entry.get("name", ""), f, name_width), font=f, fill=shade)

        pf = font(int(SZ["price"] * scale), True)
        price = entry.get("price", "")
        draw.text((x + w - draw.textlength(price, font=pf), y + cursor + (line_item - pf.size) / 2 - 2),
                  price, font=pf, fill=shade)
        cursor += line_item

        if (entry.get("note") or "").strip():
            nf = font(int(SZ["note"] * scale), False)
            draw.text((x, y + cursor), ellipsize(draw, entry["note"], nf, name_width),
                      font=nf, fill=palette["dim"])
            cursor += int(SZ["lineNote"] * scale)
        cursor += int(SZ["gapItem"] * scale)


def placed_text(draw, block, palette, x, y, w, h, scale):
    text = block.get("text") or ""
    if not text:
        return
    tone = block.get("tone", "ink")
    fill = {"dim": palette["dim"], "accent": palette["accent"]}.get(tone, palette["ink"])
    f = font(int(SZ["item"] * scale * 1.1), tone == "accent")
    lines = wrapped(draw, text, f, w)
    line_h = f.size * LINE_HEIGHT
    top = y + (h - line_h * len(lines)) / 2
    for index, line in enumerate(lines):
        width = draw.textlength(line, font=f)
        offset = {"center": (w - width) / 2, "right": w - width}.get(block.get("align", "left"), 0)
        draw.text((x + offset, top + index * line_h), line, font=f, fill=fill)


def placed_reviews(draw, board, palette, x, y, w, h):
    reviews = [r for r in ((board.get("reviews") or {}).get("items") or [])
               if (board.get("reviews") or {}).get("on") and (r.get("quote") or "").strip()]
    if not reviews:
        return
    review = reviews[0]
    star = max(12, min(30, h * 0.42))
    stars_w = star * 5.6
    cite_w = w * 0.26

    count = max(1, min(5, int(review.get("stars", 5))))
    for index in range(count):
        star_polygon(draw, x + index * (star + 3), y + (h - star) / 2, star, palette["accent"])

    qf = font(SZ["quote"], False)
    draw.text((x + stars_w, y + (h - qf.size) / 2),
              ellipsize(draw, f"“{review['quote']}”", qf, w - stars_w - cite_w),
              font=qf, fill=palette["ink"])

    cite = review.get("author", "")
    if review.get("source"):
        cite += f" · {review['source']}"
    cf = font(SZ["cite"], False)
    draw.text((x + w - draw.textlength(cite, font=cf), y + (h - cf.size) / 2),
              cite, font=cf, fill=palette["dim"])


# ---- the screens that are not a menu ---------------------------------------
#
# Mirrors components/BoardScene.xml for geometry and BoardScene.brs for the
# copy and font sizes. These are plain screens with no fitting pass, which is
# exactly why they need checking: a Label with a fixed height and wrap on
# silently cuts off whatever does not fit, and nobody notices until a shop is
# standing in front of it.

SCREEN_W, SCREEN_H = 1920, 1080

PAIR_TITLE = "Pair this screen"
PAIR_HELP = ("On your computer or phone, sign in at adbite.site/dashboard, open Your TVs, "
             "and type this code. The board appears here within a minute."
             "\n\nPress OK to see a sample board first.")
PAIR_TIP = ("Before you walk away: turn this TV's screensaver off."
            "\nSettings  >  Screen saver  >  Wait time  >  Disabled")
TIP_TITLE = "One thing before you go"
TIP_BODY = ("This TV will blank its own screen after a few minutes and cover your board. "
            "Turn the screensaver off and it stays up:"
            "\n\nSettings  >  Screen saver  >  Wait time  >  Disabled")
TIP_FOOT = "Press OK when that is done"

LINE_HEIGHT = 1.28


def wrapped(draw, text, f, width):
    """The lines a Roku Label with wrap="true" would break this into."""
    lines = []
    for paragraph in text.split("\n"):
        if not paragraph:
            lines.append("")
            continue
        line = ""
        for word in paragraph.split():
            candidate = f"{line} {word}".strip()
            if draw.textlength(candidate, font=f) <= width:
                line = candidate
            else:
                lines.append(line)
                line = word
        lines.append(line)
    return lines


def block(draw, text, f, x, y, width, fill, centre=True):
    """Draw wrapped text and return the height it actually took."""
    lines = wrapped(draw, text, f, width)
    for index, line in enumerate(lines):
        offset = (width - draw.textlength(line, font=f)) / 2 if centre else 0
        draw.text((x + offset, y + index * f.size * LINE_HEIGHT), line, font=f, fill=fill)
    return len(lines) * f.size * LINE_HEIGHT


def render_pairing(out_path, code="JRQJMF", version="1.0.0", model="Roku TV"):
    """The screen a TV shows until a shop claims it."""
    image = Image.new("RGB", (SCREEN_W, SCREEN_H), rgb("#0D0D0D"))
    draw = ImageDraw.Draw(image)
    overflow = 0

    mark = pathlib.Path(__file__).resolve().parents[1] / "images" / "icon_focus_hd.png"
    if mark.exists():
        image.paste(Image.open(mark).convert("RGB"), (96, 84))

    block(draw, PAIR_TITLE, font(56, True), 0, 300, SCREEN_W, rgb("#FFFFFF"))
    block(draw, " ".join(code), font(180, True), 0, 380, SCREEN_W, rgb("#8FD0F6"))

    used = block(draw, PAIR_HELP, font(34, False), 300, 618, 1320, rgb("#C9D1D9"))
    overflow = max(overflow, used - 192)

    draw.rectangle([400, 826, 400 + 1120, 826 + 132], fill=rgb("#1B1B1B"))
    used = block(draw, PAIR_TIP, font(30, True), 430, 848, 1060, rgb("#FFCF42"))
    overflow = max(overflow, used - 92)

    block(draw, f"AdBite Board {version}  ·  {model}", font(26, False), 0, 1000, SCREEN_W, rgb("#6B7480"))
    image.save(out_path)
    return overflow


def render_tip(out_path):
    """The card shown once, over the board, the first time a screen pairs."""
    image = Image.new("RGB", (SCREEN_W, SCREEN_H), rgb("#14100D"))
    draw = ImageDraw.Draw(image)
    draw.rectangle([0, 0, SCREEN_W, SCREEN_H], fill=rgb("#0A0908"))
    draw.rectangle([300, 290, 300 + 1320, 290 + 500], fill=rgb("#14100D"))

    block(draw, TIP_TITLE, font(52, True), 300, 340, 1320, rgb("#FFFFFF"))
    used = block(draw, TIP_BODY, font(34, False), 360, 430, 1200, rgb("#C9D1D9"))
    block(draw, TIP_FOOT, font(26, False), 300, 716, 1320, rgb("#6B7480"))
    image.save(out_path)
    return used - 260


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("board", nargs="?", default="board.json")
    parser.add_argument("-o", "--out", default="dist/preview")
    parser.add_argument("--screens-only", action="store_true",
                        help="just the pairing and screensaver screens")
    args = parser.parse_args()

    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    if not args.screens_only:
        config = json.loads(pathlib.Path(args.board).read_text())
        for window in config.get("slotWindows", []):
            path = out / f"{window['id']}.png"
            scale, overflow = render(config, window["id"], path)
            note = f"scale {scale:.2f}"
            if overflow > 0:
                note += f", CLIPPED by {round(overflow)}px"
            print(f"  {path}  ({note})")

    for name, renderer in (("pairing", render_pairing), ("screensaver-card", render_tip)):
        path = out / f"{name}.png"
        spill = renderer(path)
        note = "fits" if spill <= 0 else f"CLIPPED by {round(spill)}px"
        print(f"  {path}  ({note})")


if __name__ == "__main__":
    main()
