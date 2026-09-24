#!/usr/bin/env python3
"""
Check that the structured data on every page still matches the page.

    python3 tools/check-schema.py

Several pages carry JSON-LD so search engines can show their contents
directly — the twenty-five answers on the questions page, the eleven
records on the records page. Google requires that markup to describe
content actually visible on the page: structured data claiming something
the page does not say is grounds for a manual action, not merely a lost
rich result.

Nothing enforces that on its own. Somebody reworks an answer or retitles
a record, the visible text moves, the JSON-LD does not, and the two drift
apart silently and stay that way for a year. Markup is also the one part
of a page nobody ever looks at, so the drift is never noticed by eye. So
this walks both and compares them.

What it checks:

  · every page's JSON-LD parses, and declares the @type it should
  · every FAQ question in the markup is on the page as a real <summary>,
    and every markup answer's words are in that question's panel
  · every record in the ItemList is on the records page, with the same
    title, in the same order, and its anchor exists
  · nothing is listed twice
  · the question count promised in two places is the number on the page

No dependencies beyond the standard library — it is a parser, not a
browser, and the point is that it runs anywhere in under a second.
"""

import html
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = ROOT / "questions.html"
RECORDS = ROOT / "records.html"

FAIL = []


def chk(ok, msg):
    if not ok:
        FAIL.append(msg)
        print("  FAIL " + msg)


def text_of(fragment):
    """Visible text: tags out, entities decoded, whitespace flattened.

    The comparison has to survive the answer being re-wrapped across
    different lines, which happens every time somebody edits a sentence
    in the middle of a paragraph."""
    no_svg = re.sub(r"<svg\b.*?</svg>", " ", fragment, flags=re.S | re.I)
    bare = re.sub(r"<[^>]+>", " ", no_svg)
    return re.sub(r"\s+", " ", html.unescape(bare)).strip()


def main():
    if not PAGE.exists():
        sys.exit(f"{PAGE} does not exist.")
    src = PAGE.read_text()

    # ── the structured data ──
    blocks = re.findall(
        r'<script type="application/ld\+json">(.*?)</script>', src, re.S)
    chk(len(blocks) == 1, f"exactly one JSON-LD block ({len(blocks)})")
    if not blocks:
        return
    try:
        data = json.loads(blocks[0])
    except json.JSONDecodeError as e:
        chk(False, f"the JSON-LD does not parse: {e}")
        return

    chk(data.get("@type") == "FAQPage", f'@type is FAQPage ({data.get("@type")})')
    entries = data.get("mainEntity") or []
    chk(bool(entries), "the JSON-LD lists at least one question")

    # ── the page ──
    on_page = {}
    for block in re.findall(r"<details class=\"qa\">(.*?)</details>", src, re.S):
        m = re.search(r"<summary>(.*?)</summary>", block, re.S)
        if not m:
            continue
        q = text_of(m.group(1))
        chk(q not in on_page, f"question asked twice on the page: {q!r}")
        a = re.search(r'<div class="qa-a">(.*?)</div>\s*$', block, re.S)
        on_page[q] = text_of(a.group(1)) if a else ""

    chk(bool(on_page), "the page has questions on it")
    print(f"  {len(on_page)} questions on the page, "
          f"{len(entries)} in the structured data")

    # ── do they agree? ──
    seen = set()
    for item in entries:
        q = (item.get("name") or "").strip()
        a = ((item.get("acceptedAnswer") or {}).get("text") or "").strip()
        chk(q not in seen, f"question listed twice in the JSON-LD: {q!r}")
        seen.add(q)

        if q not in on_page:
            near = [p for p in on_page if p[:24].lower() == q[:24].lower()]
            chk(False, f"JSON-LD question is not on the page: {q!r}"
                       + (f" — closest is {near[0]!r}" if near else ""))
            continue

        # The answer is allowed to be an abridgement of the visible one —
        # a rich result has room for a sentence, not a section — but every
        # word of it has to actually be on the page.
        if a and a not in on_page[q]:
            chk(False, f"JSON-LD answer is not the page's answer for {q!r}\n"
                       f"        markup: {a[:90]}...\n"
                       f"        page:   {on_page[q][:90]}...")

    # ── the count in the hero ──
    WORDS = {"twelve": 12, "sixteen": 16, "eighteen": 18, "twenty": 20,
             "twenty-one": 21, "twenty-two": 22, "twenty-three": 23,
             "twenty-four": 24, "twenty-five": 25, "twenty-six": 26,
             "twenty-seven": 27, "twenty-eight": 28, "thirty": 30}
    m = re.search(r"<dt>Questions answered</dt><dd>([^<]+)</dd>", src)
    if m:
        said = m.group(1).strip().lower()
        want = WORDS.get(said)
        chk(want is not None, f"the hero count {said!r} is not a word this knows")
        if want is not None:
            chk(want == len(on_page),
                f"the hero says {said} ({want}) but the page has {len(on_page)}")
    else:
        chk(False, "the hero does not state how many questions there are")

    # The same number is promised on the Take part page.
    tp = (ROOT / "take-part.html").read_text()
    m = re.search(r"All ([a-z\-]+) questions and answers", tp)
    if m:
        want = WORDS.get(m.group(1))
        chk(want == len(on_page),
            f"take-part.html promises {m.group(1)} questions, the page has {len(on_page)}")


def records():
    """The eleven records, as the markup lists them and as the page shows them.

    A record being retitled is the likely drift here: the heading is
    prose and gets edited, the ItemList entry is a string in a script
    block at the top of the file and does not."""
    src = RECORDS.read_text()

    blocks = re.findall(
        r'<script type="application/ld\+json">(.*?)</script>', src, re.S)
    chk(len(blocks) == 1, f"records.html has exactly one JSON-LD block ({len(blocks)})")
    if not blocks:
        return
    try:
        data = json.loads(blocks[0])
    except json.JSONDecodeError as e:
        chk(False, f"records.html JSON-LD does not parse: {e}")
        return

    lst = (data.get("mainEntity") or {})
    chk(lst.get("@type") == "ItemList", f'records mainEntity is an ItemList ({lst.get("@type")})')
    entries = lst.get("itemListElement") or []

    # what the page actually shows, in document order
    on_page = []
    ids = set(re.findall(r'id="([^"]+)"', src))
    for m in re.finditer(
            r'<article class="rrec[^"]*"[^>]*id="([a-z]+)"(.*?)</article>', src, re.S):
        h3 = re.search(r"<h3[^>]*>(.*?)</h3>", m.group(2), re.S)
        if h3:
            on_page.append((m.group(1), text_of(h3.group(1))))

    chk(bool(on_page), "records.html has records on it")
    print(f"  {len(on_page)} records on the page, {len(entries)} in the structured data")

    chk(lst.get("numberOfItems") == len(on_page),
        f'numberOfItems says {lst.get("numberOfItems")}, the page has {len(on_page)}')
    chk(len(entries) == len(on_page),
        f"the ItemList has {len(entries)} entries, the page has {len(on_page)} records")

    titles = {t: rid for rid, t in on_page}
    order = [t for _, t in on_page]
    for i, item in enumerate(entries):
        name = (item.get("name") or "").strip()
        url = item.get("url") or ""
        pos = item.get("position")

        chk(pos == i + 1, f"ItemList position {pos!r} out of order at index {i}")

        if name not in titles:
            chk(False, f"ItemList names a record the page does not show: {name!r}")
            continue
        # The order matters: an ItemList is a ranked list, and a reader
        # who follows one into the page should land where they expected.
        chk(i < len(order) and order[i] == name,
            f"ItemList order differs from the page at {i + 1}: "
            f"markup {name!r}, page {order[i] if i < len(order) else '-'!r}")

        frag = url.partition("#")[2]
        chk(frag in ids, f"ItemList url for {name!r} points at #{frag}, which is not on the page")


main()
records()
print("\n" + ("ALL PASS" if not FAIL else f"{len(FAIL)} FAILURES:\n  " + "\n  ".join(FAIL)))
sys.exit(1 if FAIL else 0)
