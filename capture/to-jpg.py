"""Convert a dropped screenshot to a capture-sized JPEG.

Usage: python3 capture/to-jpg.py <src> <dest>
"""
import sys
from PIL import Image

src, dest = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
if im.width > 1800:
    im = im.resize((1800, round(im.height * 1800 / im.width)), Image.LANCZOS)
im.save(dest, "JPEG", quality=82, optimize=True, progressive=True)
print("converted", dest)
