"""Downscale and recompress a capture screenshot in place.

Run as:  python3 capture/shrink.py <file> <maxWidth> <quality>
Kept as a file (rather than python3 -c) so sys.path[0] is this directory,
which holds only our own code, while the user site-packages that PIL lives
in stay importable.
"""
import sys
from PIL import Image

path, max_w, quality = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
im = Image.open(path).convert("RGB")
if im.width > max_w:
    im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
im.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
