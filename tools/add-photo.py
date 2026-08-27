#!/usr/bin/env python3
"""
Put one real photograph onto the records page.

    python3 tools/add-photo.py <image-file> <record>
    python3 tools/add-photo.py ~/Downloads/tree-planting.jpg trees

<record> is one of the eleven ids used on records.html:

    trees  photographs  dance  birthdays  calendar  spoon
    screw  perpetual    ram    ganesha    languages

Five of those records have no photograph and are carrying a drawn plate
instead. Hand this script a real one and it does the whole job: resizes it
into the WebP widths the rest of the library uses, writes the manifest
entry with that record's own event and caption, and swaps the plate in
records.html for the photograph. Where a record already has a photograph,
the new one is added as the second, smaller frame laid over its corner.

Nothing is overwritten silently — if the file it would write already
exists, it stops and says so.

    pip install pillow
"""

import json
import pathlib
import re
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required.  Run:  pip install pillow")

ROOT = pathlib.Path(__file__).resolve().parent.parent
WIDTHS = [640, 1280, 1920]

# What each record is, in the words the manifest and the page already use.
# The event string is what tools/check-images.py groups by, so it has to
# match the record it belongs to and nothing else.
RECORDS = {
    "trees": dict(
        prefix="trees", category="records",
        event="508,603 trees planted in a single hour",
        alt="Volunteers planting saplings during the Ek Ped Maa Ke Naam drive",
        caption="Ek Ped Maa Ke Naam — 508,603 trees, one hour"),
    "photographs": dict(
        prefix="modi", category="records",
        event="197,610 photographs of Prime Minister Narendra Modi",
        alt="The exhibition of 197,610 photographs at Triton Mall, Jaipur",
        caption="Triton Mall, Jaipur · 17 September 2018"),
    "dance": dict(
        prefix="dance", category="records",
        event="Largest continuous dance performance",
        alt="Three thousand and fifty children dancing in formation",
        caption="3,050 children · 9 minutes 58 seconds"),
    "birthdays": dict(
        prefix="bday", category="records",
        event="One person for every date of the year",
        alt="The gathering of 366 people, one born on each date of the year",
        caption="366 people, one for every date of the year"),
    "calendar": dict(
        prefix="cal", category="records",
        event="World's largest wall calendar",
        alt="The hand-painted wall calendar, 120 feet by 40 feet",
        caption="120 ft × 40 ft, hand-painted"),
    "spoon": dict(
        prefix="spoon", category="records",
        event="World's largest wooden spoon",
        alt="The forty-foot carved wooden spoon",
        caption="Alankar Museum, Jawahar Kala Kendra, Jaipur"),
    "screw": dict(
        prefix="screw", category="records",
        event="World's largest screw",
        alt="The world's largest screw, eleven feet three inches tall",
        caption="11 ft 3 in, threaded the full length"),
    "perpetual": dict(
        prefix="perp", category="records",
        event="Perpetual calendar",
        alt="The perpetual calendar",
        caption="Copyright registered with the Government of India"),
    "ram": dict(
        prefix="ram", category="records",
        event="Ram written 64,691 times on one postcard",
        alt="The postcard carrying the word Ram written 64,691 times",
        caption="64,691 inscriptions · one postcard"),
    "ganesha": dict(
        prefix="ganesha", category="records",
        event="11,111 miniatures of Lord Ganesha on one postcard",
        alt="The postcard carrying 11,111 miniatures of Lord Ganesha",
        caption="11,111 miniatures · one side of one postcard"),
    "languages": dict(
        prefix="mirror", category="records",
        event="Sixty-three world languages written in reverse",
        alt="Sixty-three world languages written in mirror script",
        caption="63 scripts, every character reversed"),
}


def tone(img):
    """The average colour, used as the placeholder behind a loading image
    so the page never flashes a white hole."""
    small = img.convert("RGB").resize((8, 8))
    px = list(small.convert("RGB").getdata()) if not hasattr(small, "get_flattened_data") \
        else list(small.get_flattened_data())
    r = sum(p[0] for p in px) // len(px)
    g = sum(p[1] for p in px) // len(px)
    b = sum(p[2] for p in px) // len(px)
    return f"#{r:02x}{g:02x}{b:02x}"


def next_number(prefix):
    """Keep the numbering going from wherever that prefix left off."""
    used = {0}
    for p in (ROOT / "media" / prefix).glob(f"{prefix}-*.webp"):
        m = re.match(rf"{prefix}-(\d+)", p.name)
        if m:
            used.add(int(m.group(1)))
    return max(used) + 1


def derivatives(src, prefix, number):
    out_dir = ROOT / "media" / prefix
    out_dir.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im = im.convert("RGB")
        w, h = im.size
        widths = sorted({min(x, w) for x in WIDTHS if x <= w} | {min(w, max(WIDTHS))})
        made = {}
        for target in widths:
            name = f"{prefix}-{number:03d}-{target}.webp"
            path = out_dir / name
            if path.exists():
                sys.exit(f"{path} already exists — not overwriting.")
            scaled = im if target == w else im.resize(
                (target, round(h * target / w)), Image.LANCZOS)
            scaled.save(path, "WEBP", quality=82, method=6)
            made[str(target)] = f"media/{prefix}/{name}"
        return made, w, h, tone(im)


def add_manifest(entry):
    path = ROOT / "media" / "manifest.json"
    data = json.loads(path.read_text())
    data["items"].append(entry)
    path.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")


def img_tag(rel, w, h, alt, cls=""):
    c = f' class="{cls}"' if cls else ""
    return (f'<img{c} src="{rel}" width="{w}" height="{h}" loading="lazy"\n'
            f'             decoding="async" alt="{alt}">')


def put_on_page(record, rel, w, h, meta):
    """Swap that record's plate for the photograph, or add the photograph as
    the second frame if the record already has one."""
    page = ROOT / "records.html"
    html = page.read_text()

    start = html.find(f'<article class="rrec', 0)
    while start != -1:
        end = html.index("</article>", start) + len("</article>")
        block = html[start:end]
        if f'id="{record}"' in block:
            break
        start = html.find('<article class="rrec', end)
    else:
        sys.exit(f"No record with id={record} on records.html")
    if start == -1:
        sys.exit(f"No record with id={record} on records.html")

    if 'class="rfig plate"' in block or 'class="rfig plate mirror"' in block:
        # replace the drawn plate with the real thing
        fig_start = block.index("<figure")
        fig_end = block.index("</figure>") + len("</figure>")
        new_fig = ('<figure class="rfig">\n        '
                   + img_tag(rel, w, h, meta["alt"]) + "\n        "
                   + f'<figcaption>{meta["caption"]}</figcaption>\n      </figure>')
        block = block[:fig_start] + new_fig + block[fig_end:]
        what = "replaced the drawn plate"
    elif 'class="r2"' in block:
        sys.exit(f"{record} already has both photographs — nothing to add.")
    else:
        # add it as the second frame, before the caption
        cap = block.index("<figcaption>")
        block = (block[:cap] + img_tag(rel, w, h, meta["alt"], "r2")
                 + "\n        " + block[cap:])
        what = "added as the second photograph"

    page.write_text(html[:start] + block + html[end:])
    return what


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src = pathlib.Path(sys.argv[1]).expanduser()
    record = sys.argv[2].lstrip("#")
    if not src.exists():
        sys.exit(f"{src} does not exist.")
    if record not in RECORDS:
        sys.exit(f"Unknown record '{record}'. One of: {', '.join(RECORDS)}")

    meta = RECORDS[record]
    prefix = meta["prefix"]
    number = next_number(prefix)
    made, w, h, colour = derivatives(src, prefix, number)
    biggest = made[max(made, key=lambda k: int(k))]
    smallest = made[min(made, key=lambda k: int(k))]

    add_manifest({
        "id": f"{prefix}-{number:03d}",
        "src": biggest, "thumb": smallest, "widths": made,
        "w": w, "h": h, "tone": colour,
        "alt": meta["alt"], "caption": meta["caption"],
        "category": meta["category"], "year": 0,
        "event": meta["event"], "tags": [prefix], "featured": False,
    })

    what = put_on_page(record, biggest, w, h, meta)
    if record == "ganesha":
        print("\nNOTE: the paragraph for this record says \"the figures above are one\n"
              "mark each\", which described the drawn plate you have just replaced.\n"
              "That sentence needs rewriting to talk about the photograph.")

    print(f"{src.name}  ->  {biggest}  ({w}x{h})")
    print(f"  widths: {', '.join(sorted(made, key=int))}")
    print(f"  manifest: {prefix}-{number:03d}, event \"{meta['event']}\"")
    print(f"  records.html: {what} for #{record}")
    print("\nNow run:  python3 tools/check-images.py records.html")


if __name__ == "__main__":
    main()
