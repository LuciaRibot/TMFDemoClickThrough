"""Build a contact sheet of captured shots with the hotspot drawn on each.

Lets the whole capture be eyeballed at once: wrong framing and a hotspot
pointing at the wrong control both show up immediately.

Usage: python3 capture/contact-sheet.py <steps.json> <shotsDir> <out.png> [from] [to]
"""
import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont

steps_file, shots_dir, out = sys.argv[1], sys.argv[2], sys.argv[3]
lo = int(sys.argv[4]) if len(sys.argv) > 4 else 0
hi = int(sys.argv[5]) if len(sys.argv) > 5 else 10**9

steps = [s for s in json.load(open(steps_file)) if lo <= s["id"] <= hi]
COLS, TW = 4, 460


def font(sz, bold=False):
    for p in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
    ):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, sz)
            except Exception:
                pass
    return ImageFont.load_default()


cells = []
for s in steps:
    p = os.path.join(shots_dir, os.path.basename(s.get("shot") or ""))
    if not s.get("shot") or not os.path.exists(p):
        im = Image.new("RGB", (TW, int(TW * 0.625)), (240, 240, 244))
        ImageDraw.Draw(im).text((12, 12), f"{s['id']} MISSING SHOT", font=font(16, True), fill=(200, 0, 0))
        cells.append((s, im))
        continue
    im = Image.open(p).convert("RGB")
    t = s.get("target")
    if t:
        d = ImageDraw.Draw(im, "RGBA")
        x = t["x"] / 100 * im.width
        y = t["y"] / 100 * im.height
        w = max(t["w"] / 100 * im.width, 6)
        h = max(t["h"] / 100 * im.height, 6)
        d.rectangle([x - 3, y - 3, x + w + 3, y + h + 3], outline=(232, 39, 44), width=6)
        d.rectangle([x, y, x + w, y + h], fill=(232, 39, 44, 40))
    im.thumbnail((TW, 10**6), Image.LANCZOS)
    cells.append((s, im))

if not cells:
    print("no cells")
    sys.exit(0)

CH = max(im.height for _, im in cells) + 56
rows = (len(cells) + COLS - 1) // COLS
sheet = Image.new("RGB", (COLS * TW + (COLS + 1) * 12, rows * CH + 12), (26, 28, 32))
d = ImageDraw.Draw(sheet)
for i, (s, im) in enumerate(cells):
    cx = 12 + (i % COLS) * (TW + 12)
    cy = 12 + (i // COLS) * CH
    sheet.paste(im, (cx, cy))
    tag = f"{s['id']}  {s['title']}"
    d.text((cx + 2, cy + im.height + 6), tag[:58], font=font(16, True), fill=(255, 255, 255))
    meta = f"{s.get('action','none')} · {'HOTSPOT' if s.get('target') else 'caption'} · {s.get('persona','')}"
    d.text((cx + 2, cy + im.height + 28), meta, font=font(14), fill=(150, 210, 255) if s.get("target") else (255, 180, 120))
sheet.save(out)
print(f"wrote {out}  ({len(cells)} cells)")
