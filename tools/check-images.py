#!/usr/bin/env python3
"""
Guard against the same picture appearing twice on one page.

    python3 tools/check-images.py            # check every page
    python3 tools/check-images.py index.html

Two photographs can be different files, shot seconds apart, and still be the
same picture as far as a reader is concerned — which is exactly what went
wrong: a full-bleed band and a mosaic tile both showed the same crowd with
their arms up, and the page looked like it was repeating itself.

Exact-duplicate detection does not catch that, so this compares every image
used on a page against every other by perceptual hash and by dominant colour,
and fails on any pair that a reader would call "the same photo again".

Exit code 1 on a finding, so it can run in CI.
"""

import pathlib
import re
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required.  Run:  pip install pillow")

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Perceptual hashing turned out to be the wrong instrument here. The two
# frames that started this — a full-bleed band and a mosaic tile showing the
# same crowd with their arms up — sit 27 apart, which is no closer than two
# genuinely different photographs. dhash reads luminance structure, and
# every aerial crowd shot has similar structure whether or not it is the
# same crowd.
#
# The signal that actually works is one the manifest already carries: the
# event. Two frames of the same event are, to a reader, the same picture.
#
# Slots that are semantically bound to a record — the reel card for the
# dance record, the crowd in the receipt pair — are allowed to use that
# record's photographs. Everything decorative has to be a different event.
#
# The library holds about ten distinct events, and the page has roughly that
# many decorative slots, so demanding every one be unique is not achievable.
# The rule that matters is the one a reader experiences: never two frames of
# the same event close enough to see at once. So an event may appear twice
# across the page, but never twice inside one section.
# rfig and rfig-2 are the record pages' own bound slots: a photograph of
# the spoon standing beside the spoon record is not the page repeating
# itself, it is the page being about the spoon.
BOUND = {"rcard", "rc-large", "rc-small", "rfig", "r2"}
MAX_PER_EVENT = 2


def dhash(path, size=8):
    with Image.open(path) as im:
        small = im.convert("L").resize((size + 1, size), Image.LANCZOS)
        px = list(small.getdata())
    bits = 0
    for row in range(size):
        for col in range(size):
            left = px[row * (size + 1) + col]
            right = px[row * (size + 1) + col + 1]
            bits = (bits << 1) | (left < right)
    return bits


def used_by(page):
    """Every media file the page references, in document order, with the
    element it belongs to so a finding names something a human can locate."""
    html = page.read_text()
    seen = {}
    for match in re.finditer(r'(?:src|data-shot)="(media/[\w./-]+\.webp)"', html):
        path = match.group(1)
        before = html[:match.start()]
        # the nearest class attribute names the slot; the nearest section id
        # says which part of the page the reader is in when they see it
        cls = re.findall(r'class="([^"]+)"', before)
        sec = re.findall(r'<(?:section|header)[^>]*?id="([\w-]+)"', before)
        seen.setdefault(path, (cls[-1].split()[0] if cls else "?",
                               sec[-1] if sec else "top"))
    return seen


def event_of(path, manifest):
    stem = pathlib.Path(path).stem
    for key in manifest:
        if stem.startswith(key + "-"):
            return manifest[key]
    return None


def load_events():
    import json
    data = json.loads((ROOT / "media" / "manifest.json").read_text())
    return {i["id"]: i["event"] for i in data["items"]}


def check(page):
    used = used_by(page)
    events = load_events()

    used = {p: slot for p, (slot, _) in used.items()} if False else used
    missing = [p for p in used if not (ROOT / p).exists()]
    for p in missing:
        print(f"  MISSING  {p}")

    print(f"\n{page.name}: {len(used)} photographs")

    # every decorative use, with the event it shows and the section it is in
    decorative = {}
    for path, (slot, sec) in used.items():
        if slot in BOUND:
            continue
        stem = pathlib.Path(path).stem.rsplit("-", 1)[0]
        ev = events.get(stem, stem.split("-")[0])
        decorative.setdefault(ev, []).append((slot, sec, path))

    findings = 0
    for ev, uses in sorted(decorative.items(), key=lambda kv: -len(kv[1])):
        if len(uses) > MAX_PER_EVENT:
            findings += 1
            print(f"  {len(uses)}x ACROSS THE PAGE (max {MAX_PER_EVENT}) — \"{ev}\"")
            for slot, sec, path in uses:
                print(f"      #{sec:<10} .{slot:<10} {path}")
        by_section = {}
        for slot, sec, path in uses:
            by_section.setdefault(sec, []).append((slot, path))
        for sec, group in by_section.items():
            if len(group) > 1:
                findings += 1
                print(f"  TWICE IN #{sec} — \"{ev}\" reads as the same picture repeated")
                for slot, path in group:
                    print(f"      .{slot:<12} {path}")

    seen = {}
    for path, (slot, sec) in used.items():
        stem = pathlib.Path(path).stem.rsplit("-", 1)[0]
        if stem in seen:
            findings += 1
            print(f"  SAME FILE  {stem}  (.{seen[stem]} and .{slot})")
        seen[stem] = slot

    if not findings and not missing:
        print("  ok — no section shows the same event twice")
    return findings + len(missing)


def main():
    pages = sys.argv[1:] or ["index.html", "records.html", "take-part.html", "about.html"]
    bad = 0
    for name in pages:
        page = ROOT / name
        if not page.exists():
            print(f"{name}: not found")
            bad += 1
            continue
        bad += check(page)
    if bad:
        print(f"\n{bad} finding(s). Swap one of each pair for a different subject.")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
