#!/usr/bin/env python3
"""Convert the source PNG frame sequences into web-ready WebP tiers.

Source PNGs are the master and are never modified. Run once:
    python tools/build-frames.py [--force] [--only NAME]

Outputs, relative to the project root:
    assets/poster-<seq>.webp                  first frame, high quality
    assets/frames/<seq>/desktop/f001.webp     full-rate tier
    assets/frames/<seq>/mobile/f001.webp      halved, smaller tier
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

# (subdir, width, height, quality, keep_every_nth)
STANDARD_TIERS = [
    ("desktop", 1280, 720, 78, 1),
    ("mobile", 854, 480, 72, 2),
]

SEQUENCES = [
    # The exploded-view teardown that drives the hero.
    {"name": "teardown", "src": "Canon EOS R5 Mark II", "tiers": STANDARD_TIERS},
    # The push-in through the optics that lands on the bare sensor. Darker and
    # smoother footage, so it compresses to roughly 60% of the teardown's bytes
    # at the same quality. Kept at full frame rate because the travel through
    # the front element (frames 61-100) steps visibly if decimated.
    {"name": "lens", "src": "Cannon into the lens", "tiers": STANDARD_TIERS},
]

POSTER_QUALITY = 88

FORCE = "--force" in sys.argv
ONLY = None
if "--only" in sys.argv:
    ONLY = sys.argv[sys.argv.index("--only") + 1]


def source_frames(src_name):
    src = ROOT / src_name
    if not src.is_dir():
        return None, src
    return sorted(src.glob("ezgif-frame-*.png")), src


def build_tier(frames, seq_name, tier_name, width, height, quality, step):
    out_dir = ROOT / "assets" / "frames" / seq_name / tier_name
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
        if written % 60 == 0:
            print(f"    {written} written...")

    mb = total_bytes / 1048576
    per = total_bytes / len(selected) / 1024
    print(
        f"  {tier_name:8s} {len(selected):3d} frames  {width}x{height} q{quality}  "
        f"{mb:5.2f} MB  ({per:.0f} KB/frame)"
        f"{'' if written else '  [cached]'}"
    )
    return total_bytes


def build_poster(seq_name, first_frame):
    dest = ROOT / "assets" / f"poster-{seq_name}.webp"
    if not dest.exists() or FORCE:
        with Image.open(first_frame) as im:
            im.convert("RGB").save(dest, "WEBP", quality=POSTER_QUALITY, method=6)
    print(f"  poster   {dest.stat().st_size / 1024:5.1f} KB  -> {dest.name}")


def main():
    grand = {}
    missing = []

    for seq in SEQUENCES:
        if ONLY and seq["name"] != ONLY:
            continue

        frames, src = source_frames(seq["src"])
        if frames is None:
            missing.append((seq["name"], src))
            continue
        if not frames:
            missing.append((seq["name"], src))
            continue

        print(f"\n{seq['name']}  <-  {seq['src']}/  ({len(frames)} PNG frames)")
        total = 0
        for tier_name, w, h, q, step in seq["tiers"]:
            total += build_tier(frames, seq["name"], tier_name, w, h, q, step)
        build_poster(seq["name"], frames[0])
        grand[seq["name"]] = total

    print("\n" + "-" * 58)
    for name, total in grand.items():
        print(f"{name:10s} both tiers: {total / 1048576:5.2f} MB")

    if missing:
        print("\nSkipped (source folder absent — see .gitignore):")
        for name, src in missing:
            print(f"  {name}: {src}")

    print(
        "\nA visitor downloads one tier per sequence, and the lens sequence is\n"
        "lazy-gated, so it costs nothing until they scroll to it."
    )


if __name__ == "__main__":
    main()
