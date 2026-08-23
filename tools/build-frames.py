#!/usr/bin/env python3
"""Convert the source PNG frame sequence into web-ready WebP tiers.

Source PNGs (139 MB) are the master and are never modified. Run once:
    python tools/build-frames.py [--force]

Outputs, relative to the project root:
    assets/poster.webp                first frame, high quality, paints instantly
    assets/frames/desktop/f001.webp   all 240 frames, 1280x720
    assets/frames/mobile/f001.webp    every 2nd frame (120), 854x480
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "Canon EOS R5 Mark II"

# (subdir, width, height, quality, keep_every_nth)
TIERS = [
    ("desktop", 1280, 720, 78, 1),
    ("mobile", 854, 480, 72, 2),
]
POSTER_QUALITY = 88

FORCE = "--force" in sys.argv


def source_frames():
    frames = sorted(SRC.glob("ezgif-frame-*.png"))
    if not frames:
        sys.exit(f"No source frames found in {SRC}")
    return frames


def build_tier(frames, name, width, height, quality, step):
    out_dir = ROOT / "assets" / "frames" / name
    out_dir.mkdir(parents=True, exist_ok=True)

    selected = frames[::step]
    total_bytes = 0
    written = 0

    for i, src_path in enumerate(selected, start=1):
        dest = out_dir / f"f{i:03d}.webp"
        if dest.exists() and not FORCE:
            total_bytes += dest.stat().st_size
            continue

        with Image.open(src_path) as im:
            im = im.convert("RGB")
            if im.size != (width, height):
                im = im.resize((width, height), Image.LANCZOS)
            im.save(dest, "WEBP", quality=quality, method=5)

        total_bytes += dest.stat().st_size
        written += 1
        if written % 40 == 0:
            print(f"  {name}: {written} written...")

    mb = total_bytes / 1048576
    print(
        f"{name:8s} {len(selected):3d} frames  "
        f"{width}x{height} q{quality}  "
        f"{mb:5.1f} MB  ({total_bytes / len(selected) / 1024:.0f} KB/frame)"
        f"{'' if written else '  [cached]'}"
    )
    return len(selected), total_bytes


def build_poster(first_frame):
    dest = ROOT / "assets" / "poster.webp"
    if not dest.exists() or FORCE:
        with Image.open(first_frame) as im:
            im.convert("RGB").save(dest, "WEBP", quality=POSTER_QUALITY, method=6)
    print(f"poster   {dest.stat().st_size / 1024:5.1f} KB")


def main():
    frames = source_frames()
    print(f"Source: {len(frames)} PNG frames in {SRC.name}/\n")

    grand_total = 0
    for name, w, h, q, step in TIERS:
        _, size = build_tier(frames, name, w, h, q, step)
        grand_total += size

    build_poster(frames[0])
    print(f"\nTotal shipped frame payload: {grand_total / 1048576:.1f} MB")
    print("(a visitor downloads one tier, not both)")


if __name__ == "__main__":
    main()
