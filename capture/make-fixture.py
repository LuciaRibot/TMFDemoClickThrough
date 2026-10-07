"""Render a plausible 'Payroll variation form' as a one-page PDF.

Used as the file Sofia uploads when she fulfils Daniel's document request, so
the click-through shows a real document rather than a placeholder.
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1240, 1754  # A4 at 150dpi
img = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(img)


def font(size, bold=False):
    for p in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


RED = (232, 39, 44)
INK = (34, 34, 34)
GREY = (120, 120, 128)

d.rectangle([0, 0, W, 120], fill=RED)
d.text((60, 42), "MERIDIAN", font=font(34, True), fill="white")
d.text((230, 50), "Iberia S.L.", font=font(24), fill=(255, 220, 220))

y = 190
d.text((60, y), "PAYROLL VARIATION FORM", font=font(34, True), fill=INK); y += 54
d.text((60, y), "Meridian Iberia S.L.  ·  Spain  ·  CIF B88214402", font=font(20), fill=GREY); y += 60
d.line([60, y, W - 60, y], fill=(220, 220, 224), width=2); y += 40

rows = [
    ("Reference", "PVF-2026-0417"),
    ("Pay period affected", "September 2026"),
    ("Employees affected", "4"),
    ("Variation type", "Shift allowance correction"),
    ("Total gross adjustment", "EUR 3,480.00"),
    ("Effective date", "01 September 2026"),
    ("Authorised by", "Sofia Almeida  ·  Finance Director"),
    ("Works council notified", "Yes  ·  12 August 2026"),
]
for label, value in rows:
    d.text((60, y), label.upper(), font=font(15, True), fill=GREY)
    d.text((440, y - 4), value, font=font(21), fill=INK)
    y += 54

y += 24
d.line([60, y, W - 60, y], fill=(220, 220, 224), width=2); y += 36
d.text((60, y), "Reason for variation", font=font(19, True), fill=INK); y += 34
for line in [
    "The July and August shift allowance was applied at the 2025 collective",
    "agreement rate. This form authorises the corrected rate from 01 September",
    "2026 and the back-payment of the difference for the four affected staff.",
]:
    d.text((60, y), line, font=font(19), fill=INK); y += 32

y += 40
d.rectangle([60, y, W - 60, y + 150], outline=(220, 220, 224), width=2)
d.text((84, y + 24), "SIGNED", font=font(15, True), fill=GREY)
d.text((84, y + 56), "Sofia Almeida", font=font(26, True), fill=(40, 60, 120))
d.text((84, y + 100), "Finance Director  ·  07 October 2026", font=font(17), fill=GREY)

d.text((60, H - 70), "Supplied to TMF Group via the Unified Client Portal", font=font(15), fill=GREY)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures", "payroll-variation-form-iberia.pdf")
os.makedirs(os.path.dirname(out), exist_ok=True)
img.save(out, "PDF", resolution=150.0)
print("wrote", out)
