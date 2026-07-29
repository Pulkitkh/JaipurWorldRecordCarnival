"""Capture the JWRC concept pages as full-page PNGs.

Chromium caps a single capture at ~16384px, so tall pages are captured in
bands and stitched. Sticky/fixed chrome is pinned to the document during
capture so it renders once, at the top, in the right place.
"""
import asyncio, os, sys, pathlib
from PIL import Image
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).parent
OUT = HERE / "shots"
OUT.mkdir(exist_ok=True)

PAGES = sys.argv[1:] or [
    "index.html", "gather.html", "why-records.html",
    "what-we-build.html", "moments.html", "join.html",
]

DSF = 2
BAND = 6000          # CSS px per band -> 12000 device px, well under the cap
WIDTH = 1500

CAPTURE_CSS = """
  .nav { position: static !important; }
  #preload { display: none !important; }
  [data-rv],[data-stagger] > *,.reveal-line > span { opacity:1 !important; transform:none !important; }
  body::after {
    position: absolute !important; top: 0; left: 0;
    width: 100%; height: var(--doc-h) !important;
  }
"""


async def shoot(page, f):
    src = HERE / f
    await page.goto(src.as_uri())
    await page.wait_for_timeout(1600)
    await page.evaluate("document.fonts.ready")
    await page.add_style_tag(content=CAPTURE_CSS)
    await page.evaluate(
        "document.documentElement.style.setProperty('--doc-h',"
        " document.body.scrollHeight + 'px')")
    await page.wait_for_timeout(500)

    h = await page.evaluate("document.body.scrollHeight")
    w = await page.evaluate("document.body.scrollWidth")
    dest = OUT / (f.replace(".html", "") + ".png")

    if h <= BAND:
        await page.screenshot(path=str(dest), full_page=True)
    else:
        bands, y = [], 0
        while y < h:
            hh = min(BAND, h - y)
            b = OUT / f".band_{y}.png"
            await page.screenshot(path=str(b), full_page=True,
                                  clip={"x": 0, "y": y, "width": w, "height": hh})
            bands.append(b)
            y += hh
        ims = [Image.open(b) for b in bands]
        canvas = Image.new("RGB", (ims[0].width, sum(i.height for i in ims)), "white")
        oy = 0
        for i in ims:
            canvas.paste(i, (0, oy)); oy += i.height
        canvas.save(dest)
        for b in bands:
            b.unlink()
    print(f"shot {dest.name}  {h}px tall  {dest.stat().st_size // 1024} KB")


async def main():
    async with async_playwright() as p:
        kw = {"executable_path": os.environ["CHROME_PATH"]} if os.environ.get("CHROME_PATH") else {}
        browser = await p.chromium.launch(**kw)
        page = await browser.new_page(viewport={"width": WIDTH, "height": 1000},
                                      device_scale_factor=DSF)
        for f in PAGES:
            if (HERE / f).exists():
                await shoot(page, f)
            else:
                print("skip (missing)", f)
        await browser.close()

asyncio.run(main())
