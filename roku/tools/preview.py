#!/usr/bin/env python3
"""Render what the TV will show, without a TV.

This is a second implementation of the layout in components/MenuPane.brs and
components/AdPane.brs, at the same 1920x1080 and off the same board.json. It
exists because the only other way to see whether a menu fits is to sideload it
and walk over to the wall, and because the fit-to-height pass is the one piece
of this channel that silently does the wrong thing rather than erroring.

Keep it in step with MenuPane.brs by hand. If the two disagree, the device is
right and this is wrong.

    tools/preview.py [board.json] [-o dist/preview]
"""

import argparse
import json
import pathlib

from PIL import Image, ImageDraw, ImageFont

BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
BOOK = "/System/Library/Fonts/Supplemental/Arial.ttf"

SZ = dict(
    padX=72, padTop=64, padBottom=56, colGap=58,
    shop=65, tagline=26, slot=24, section=33, item=29, note=22,
    price=31, badge=18, quote=24, cite=21,
    lineItem=36, lineNote=29, gapItem=11, gapTitle=13, gapSection=35,
    headH=118, reviewH=62,
)

THEMES = {
    "chalk":  dict(bg="#14100D", ink="#FFFFFF", dim=0.58, rule=0.16, accent="#FFC72C", ad=0.07),
    "enamel": dict(bg="#F3EAD6", ink="#241D12", dim=0.60, rule=0.16, accent="#8A6A2F", ad=0.06),
    "warm":   dict(bg="#B4502F", ink="#FDF3E7", dim=0.68, rule=0.24, accent="#FFD9A0", ad=0.10),
    "garden": dict(bg="#12372A", ink="#F4F1E4", dim=0.62, rule=0.18, accent="#D9B45C", ad=0.08),
}

BADGES = {"new": "New", "popular": "Popular", "out": "Sold out"}


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


def section_height(section, scale):
    height = int(SZ["section"] * scale) + int(SZ["gapTitle"] * scale)
    for entry in drawable_items(section):
        height += int(SZ["lineItem"] * scale)
        if (entry.get("note") or "").strip():
            height += int(SZ["lineNote"] * scale)
        height += int(SZ["gapItem"] * scale)
    return height + int(SZ["gapSection"] * scale)


def balance_point(heights):
    """First section of the right column: the break that evens the two out."""
    total = sum(heights)
    best, best_tallest, running = 1, total, 0
    for index, height in enumerate(heights):
        running += height
        tallest = max(running, total - running)
        if tallest < best_tallest:
            best_tallest, best = tallest, index + 1
    return best


def split(heights):
    if not heights:
        return []
    cut = balance_point(heights)
    return [0 if i < cut else 1 for i in range(len(heights))]


def tallest_column(sections, scale):
    heights = [section_height(s, scale) for s in sections]
    if not heights:
        return 0
    columns = split(heights)
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


def fit_scale(draw, sections, available, col_width, price_chars):
    """Shrink a long menu to fit and grow a short one to fill."""
    floor_scale = 0.62
    ceiling_scale = min(1.75, max(floor_scale, width_ceiling(draw, sections, col_width, price_chars)))
    scale = 1.0
    for _ in range(8):
        tallest = tallest_column(sections, scale)
        if tallest <= 0:
            return 1.0
        wanted = min(ceiling_scale, max(floor_scale, scale * ((available / tallest) * 0.98)))
        if abs(wanted - scale) < 0.01:
            return wanted
        scale = wanted
    return scale


def render(config, slot_id, out_path):
    board = config["board"]
    theme = THEMES.get(board.get("theme"), THEMES["chalk"])
    bg, ink, accent = rgb(theme["bg"]), rgb(theme["ink"]), rgb(theme["accent"])
    dim = over(ink, bg, theme["dim"])
    rule = over(ink, bg, theme["rule"])

    share = min(0.5, max(0.0, board.get("adShare", 0)))
    placement = config.get("adLayout", "rail")

    image = Image.new("RGB", (1920, 1080), bg)
    draw = ImageDraw.Draw(image)

    if share == 0:
        W, H = 1920, 1080
    elif placement == "banner":
        W, H = 1920, 1080 - int(1080 * share)
        slot_box = (0, H, 1920, 1080)
    else:
        W, H = 1920 - int(1920 * share), 1080
        slot_box = (W, 0, 1920, 1080)

    # ---- the ad slot ----
    if share > 0:
        x0, y0, x1, y1 = slot_box
        panel = Image.new("RGB", (x1 - x0, y1 - y0), over(ink, bg, theme["ad"]))
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

    # ---- header ----
    draw.text((SZ["padX"], SZ["padTop"] - 4), board.get("shopName") or "Your shop",
              font=font(SZ["shop"], True), fill=ink)
    windows = {w["id"]: w.get("label", w["id"]) for w in config.get("slotWindows", [])}
    label = windows.get(slot_id, slot_id).upper()
    f = font(SZ["slot"], True)
    draw.text((W - SZ["padX"] - draw.textlength(label, font=f), SZ["padTop"] + 30),
              label, font=f, fill=accent)
    if board.get("tagline"):
        draw.text((SZ["padX"], SZ["padTop"] + SZ["shop"] + 12), board["tagline"],
                  font=font(SZ["tagline"], False), fill=dim)
    top_rule = SZ["padTop"] + SZ["headH"] + 14
    draw.rectangle([SZ["padX"], top_rule, W - SZ["padX"], top_rule + 2], fill=rule)

    # ---- the menu ----
    sections = sections_for(board, slot_id)
    col_width = (W - 2 * SZ["padX"] + SZ["colGap"]) / 2 - SZ["colGap"]
    reviews = [r for r in (board.get("reviews", {}).get("items", []) if board.get("reviews", {}).get("on") else [])
               if (r.get("quote") or "").strip()]
    top = SZ["padTop"] + SZ["headH"] + 31
    bottom = H - SZ["padBottom"] - (SZ["reviewH"] if reviews else 0)
    price_chars = max([len(entry.get("price") or "")
                       for section in sections
                       for entry in drawable_items(section)] + [1])
    scale = fit_scale(draw, sections, bottom - top, col_width, price_chars)

    # A menu that still will not fit at the floor takes the review bar's strip.
    if reviews and tallest_column(sections, scale) > bottom - top:
        reviews = []
        bottom = H - SZ["padBottom"]
        scale = fit_scale(draw, sections, bottom - top, col_width, price_chars)

    heights = [section_height(s, scale) for s in sections]
    columns = split(heights)
    slack = (bottom - top) - tallest_column(sections, scale)
    if slack > 0:
        top += slack / 2
    y = [top, top]
    for section, height, column in zip(sections, heights, columns):
        x = SZ["padX"] + (col_width + SZ["colGap"] if column else 0)
        cursor = y[column]
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
                          fill=dim if sold else bg)

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
    overflow = tallest_column(sections, scale) - (bottom - top)
    return scale, overflow


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("board", nargs="?", default="board.json")
    parser.add_argument("-o", "--out", default="dist/preview")
    args = parser.parse_args()

    config = json.loads(pathlib.Path(args.board).read_text())
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    for window in config.get("slotWindows", []):
        path = out / f"{window['id']}.png"
        scale, overflow = render(config, window["id"], path)
        note = f"scale {scale:.2f}"
        if overflow > 0:
            note += f", CLIPPED by {round(overflow)}px"
        print(f"  {path}  ({note})")


if __name__ == "__main__":
    main()
