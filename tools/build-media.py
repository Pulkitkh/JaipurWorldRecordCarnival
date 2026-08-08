#!/usr/bin/env python3
"""
Build the website's photo library from a folder of originals.

    pip install pillow
    python3 tools/build-media.py

Reads   media-source/   (your originals — never published, never committed)
Writes  media/          (web-ready images at three widths)
        media/manifest.json

Run it again whenever you add photographs. Files already processed are skipped,
so a second run only handles the new ones.

────────────────────────────────────────────────────────────────────────────
IF YOUR PHOTOGRAPHS ARE NOT SORTED

Just tip all of them into media-source/ and run this. Everything is processed
and marked "Unsorted"; you then assign records visually with tools/sorter.html,
which is far faster than making folders by hand.

HOW TO ORGANISE THE ORIGINALS (optional — only if they are already in folders)

Put them in folders. The script reads the folder names:

    media-source/records/2025/508603-trees-planted-in-one-hour/DSC_0148.jpg
                  │        │     │
                  │        │     └─ event name  → "508603 Trees Planted In One Hour"
                  │        └─────── year        → 2025
                  └──────────────── category    → records

Any of the three can be left out:
  • no year folder  → taken from the photo's EXIF capture date
  • no category     → defaults to "records"
  • no event folder → the year becomes the event name

Valid categories: records · events · media · certificates · people · personal
────────────────────────────────────────────────────────────────────────────
"""

import json
import pathlib
import re
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is required.  Run:  pip install pillow")

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "media-source"
OUT = ROOT / "media"
WIDTHS = [640, 1280, 1920]
QUALITY = 82
CATEGORIES = {"records", "events", "media", "certificates", "people", "personal"}
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".tif", ".tiff"}


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def titlecase(text):
    words = re.sub(r"[-_]+", " ", text).split()
    small = {"a", "an", "and", "of", "on", "in", "the", "for", "to", "at"}
    return " ".join(
        w if (i and w.lower() in small) else w[:1].upper() + w[1:]
        for i, w in enumerate(words)
    )


def exif_year(img):
    try:
        exif = img.getexif()
        for tag in (36867, 36868, 306):          # DateTimeOriginal, Digitized, DateTime
            v = exif.get(tag)
            if v and str(v)[:4].isdigit():
                return int(str(v)[:4])
    except Exception:
        pass
    return None


def dominant_tone(img):
    small = img.convert("RGB").resize((1, 1), Image.LANCZOS)
    r, g, b = small.getpixel((0, 0))
    # nudge toward the site's darker ground so it reads as a placeholder, not a flash
    r, g, b = (int(c * 0.72) for c in (r, g, b))
    return f"#{r:02x}{g:02x}{b:02x}"


def describe(path):
    """Pull category / year / event out of the folder names, forgivingly."""
    parts = [p for p in path.relative_to(SRC).parts[:-1]]
    category, year, event = None, None, None
    for p in parts:
        low = p.lower()
        if low in CATEGORIES:
            category = low
        elif re.fullmatch(r"(19|20)\d{2}", p):
            year = int(p)
        else:
            event = p
    return category, year, event


def main():
    if not SRC.exists():
        sys.exit(
            f"No originals found.\n"
            f"Create {SRC.relative_to(ROOT)}/ and put the photographs in it,\n"
            f"then run this again. See the notes at the top of this file."
        )

    files = sorted(p for p in SRC.rglob("*") if p.suffix.lower() in EXTS)
    if not files:
        sys.exit(f"{SRC.relative_to(ROOT)}/ exists but has no images in it.")

    OUT.mkdir(exist_ok=True)
    items, made, skipped, failed = [], 0, 0, 0

    for i, path in enumerate(files, 1):
        category, year, event = describe(path)
        try:
            with Image.open(path) as img:
                img = ImageOps.exif_transpose(img)      # honour camera rotation
                year = year or exif_year(img) or 0
                tone = dominant_tone(img)
                w0, h0 = img.size

                stem = slug(f"{year or 'undated'}-{event or 'archive'}-{path.stem}")[:70]
                folder = OUT / (str(year) if year else "undated") / slug(event or "archive")
                folder.mkdir(parents=True, exist_ok=True)

                widths = {}
                for target in WIDTHS:
                    if target > w0 and target != WIDTHS[0]:
                        continue                        # never upscale
                    dest = folder / f"{stem}-{target}.webp"
                    widths[target] = str(dest.relative_to(ROOT)).replace("\\", "/")
                    if dest.exists():
                        skipped += 1
                        continue
                    scaled = img.copy()
                    scaled.thumbnail((target, target * 4), Image.LANCZOS)
                    scaled.convert("RGB").save(dest, "WEBP", quality=QUALITY, method=5)
                    made += 1
        except Exception as e:                          # a corrupt file must not stop the run
            print(f"  ! skipped {path.name}: {e}")
            failed += 1
            continue

        largest = widths[max(widths)]
        items.append({
            "id": stem,
            "src": largest,
            "thumb": widths[min(widths)],
            "widths": widths,
            "w": w0, "h": h0,
            "tone": tone,
            "alt": titlecase(event or "Jaipur World Record Carnival"),
            "caption": "",
            "category": category or "records",
            "year": year,
            # "Unsorted" is the marker tools/sorter.html looks for
            "event": titlecase(event) if event else "Unsorted",
            "tags": [],
            "featured": False,
        })

        if i % 25 == 0 or i == len(files):
            print(f"  {i}/{len(files)} processed…")

    items.sort(key=lambda x: (-(x["year"] or 0), x["event"], x["id"]))
    (OUT / "manifest.json").write_text(json.dumps({"items": items}, indent=1))

    total_mb = sum(f.stat().st_size for f in OUT.rglob("*.webp")) / 1e6
    print(f"\n  {len(items)} photographs indexed")
    print(f"  {made} files written, {skipped} already present, {failed} unreadable")
    print(f"  {total_mb:.1f} MB total in media/")
    print(f"  manifest: {(OUT / 'manifest.json').relative_to(ROOT)}")
    untagged = sum(1 for i in items if i["event"] == "Unsorted")
    print("\n  Reload about.html — the archive switches to the real photographs.")
    if untagged:
        print(f"\n  {untagged} photographs have no record assigned yet.")
        print("  Serve the folder and open tools/sorter.html to tag them:")
        print("    python3 -m http.server 8000")
        print("    open http://localhost:8000/tools/sorter.html")


if __name__ == "__main__":
    main()
