#!/usr/bin/env python3
"""
Check that every page is readable in both themes.

    python3 tools/check-theme.py            # every page, light and dark
    python3 tools/check-theme.py records

A theme switch is the easiest way there is to make a page unreadable
without noticing: one token remapped, and some panel that used to be sand
under ink is now navy under ink. Eyes are bad at catching this — there is
always one card, on one page, that nobody scrolled to.

So this walks each page in both themes and measures every piece of text
against the ground it actually stands on, compositing translucent layers
the way the browser does. It also checks the control itself: that the
three options are exclusive, that a choice survives a reload, and that a
stored choice is on the document before the first paint rather than
applied a frame late.

Text over a photograph is skipped — its legibility comes from a scrim, not
from a colour pair, and reading a pixel from an image would be guesswork.

    pip install playwright && playwright install chromium
"""

import asyncio
import pathlib
import subprocess
import sys
import time
import signal

from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent

_SERVER = r'''
import http.server, os, sys
ROOT = sys.argv[2]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def translate_path(self, path):
        full = super().translate_path(path)
        if not os.path.exists(full) and not os.path.splitext(full)[1]:
            if os.path.exists(full + ".html"): return full + ".html"
        return full
    def log_message(self, *a): pass
http.server.HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
'''

srv = subprocess.Popen(["python3", "-c", _SERVER, "8231", str(ROOT)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
B = "http://127.0.0.1:8231"

ALL_PAGES = [("/", "landing"), ("/records", "records"),
             ("/take-part", "take part"), ("/about", "about")]
want = [a.replace(".html", "") for a in sys.argv[1:]]
PAGES = [p for p in ALL_PAGES if not want or any(w in p[0] or w in p[1] for w in want)] or ALL_PAGES

FAIL = []


def chk(ok, msg):
    if not ok:
        FAIL.append(msg)
        print("  FAIL " + msg)


# Composite every translucent layer down to an opaque colour, then measure.
# Reading only the nearest background reports a 4% ivory panel as near-white
# when it is really a shade of navy — the same mistake this file's sibling
# made twice before it was written down.
CONTRAST = r"""() => {
  const px = (c) => { const m = (c||'').match(/[\d.]+/g); return m ? m.slice(0,3).map(Number) : null; };
  const al = (c) => { const m = (c||'').match(/[\d.]+/g); return m && m.length > 3 ? +m[3] : 1; };
  const lum = (p) => { const f = v => { v /= 255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); };
    return .2126*f(p[0]) + .7152*f(p[1]) + .0722*f(p[2]); };

  const ground = (el) => {
    const stack = []; let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      // Text on a photograph is a different problem, solved with a scrim
      // rather than a colour pair, and reading a pixel out of an image
      // would be guesswork — so skip it.
      //
      // A gradient is not that. The dark bands paint two low-alpha glows
      // over a solid band colour, and the shorthand still leaves that
      // colour in background-color, so keep measuring against it. Slightly
      // optimistic where a glow lightens the ground, by a couple of
      // percent at these alphas.
      if (cs.backgroundImage && cs.backgroundImage.includes('url(')) return null;
      const p = px(cs.backgroundColor), a = al(cs.backgroundColor);
      const gradient = cs.backgroundImage && cs.backgroundImage !== 'none';
      // A gradient laid over a solid colour is measurable — that colour is
      // still in background-color and the glows only shift it a couple of
      // percent. A gradient with nothing underneath is not: the painted
      // ground exists only in the image, and walking further up would
      // measure the page behind it, which is how this check first claimed
      // that ivory text on a dark plate was ivory on cream.
      if (gradient && (!p || a < 1)) return null;
      if (p && a > 0) { stack.push([p, a]); if (a >= 1) break; }
      n = n.parentElement;
    }
    if (!stack.length) return null;
    let out = [255,255,255];
    for (let i = stack.length - 1; i >= 0; i--) {
      const [c, a] = stack[i];
      out = [0,1,2].map(k => c[k]*a + out[k]*(1-a));
    }
    return out;
  };

  const out = [];
  for (const el of document.querySelectorAll('main *, .nav *, .foot *, .drawer *')) {
    // only elements holding their own text
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity < 0.5) continue;
    const fg = px(cs.color); if (!fg) continue;
    if (al(cs.color) < 0.5) continue;
    const bg = ground(el); if (!bg) continue;

    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 600);
    const need = large ? 3 : 4.5;
    const ratio = (Math.max(lum(fg), lum(bg)) + .05) / (Math.min(lum(fg), lum(bg)) + .05);
    if (ratio < need) {
      out.push((el.className && el.className.baseVal === undefined ? el.className : el.tagName)
        + ' "' + el.textContent.trim().slice(0, 24) + '" ' + ratio.toFixed(2) + ':1 (needs ' + need + ')');
    }
  }
  return [...new Set(out)].slice(0, 6);
}"""


async def walk(pg):
    """Scroll the whole page so every reveal has fired before measuring."""
    h = await pg.evaluate("document.body.scrollHeight")
    y = 0
    while y < h:
        await pg.evaluate(f"window.scrollTo(0,{y})")
        await pg.wait_for_timeout(320)
        y += 700
    await pg.wait_for_timeout(1200)
    await pg.evaluate("window.scrollTo(0,0)")
    await pg.wait_for_timeout(400)


async def main():
    async with async_playwright() as b:
        browser = await b.chromium.launch(executable_path="/opt/pw-browsers/chromium")

        for path, label in PAGES:
            print(f"\n══ {label} ══")
            for theme in ("light", "dark"):
                ctx = await browser.new_context(
                    viewport={"width": 1280, "height": 900},
                    color_scheme=theme)
                pg = await ctx.new_page()
                errs = []
                pg.on("pageerror", lambda e: errs.append(str(e)))
                await pg.goto(B + path)
                await pg.wait_for_timeout(1800)

                applied = await pg.evaluate(
                    "getComputedStyle(document.body).backgroundColor")
                dark_ground = sum(int(v) for v in applied.strip("rgb() ").split(",")[:3]) < 300
                chk(dark_ground == (theme == "dark"),
                    f"{label} · {theme}: body ground is {applied}")

                await walk(pg)
                bad = await pg.evaluate(CONTRAST)
                chk(not bad, f"{label} · {theme}: unreadable text {bad}")
                chk(not errs, f"{label} · {theme}: JS errors {errs[:1]}")
                await ctx.close()

        # ── the control itself ──
        print("\n══ the control ══")
        ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
        pg = await ctx.new_page()
        await pg.goto(B + "/records")
        await pg.wait_for_timeout(1500)

        n = await pg.evaluate("document.querySelectorAll('.theme.in-nav [data-theme-set]').length")
        chk(n == 3, f"three options in the nav ({n})")

        for mode, expect in (("dark", "dark"), ("light", "light"), ("system", None)):
            await pg.evaluate(f"document.querySelector('.theme.in-nav [data-theme-set=\"{mode}\"]').click()")
            await pg.wait_for_timeout(400)
            got = await pg.evaluate("document.documentElement.getAttribute('data-theme')")
            chk(got == expect, f"choosing {mode} sets data-theme to {expect!r} (got {got!r})")
            pressed = await pg.evaluate(
                """() => [...document.querySelectorAll('.theme.in-nav [data-theme-set]')]
                     .filter(b => b.getAttribute('aria-pressed') === 'true')
                     .map(b => b.dataset.themeSet)""")
            chk(pressed == [mode], f"only {mode} reads as pressed ({pressed})")

        # a choice has to survive a reload, and be there before the first paint
        await pg.evaluate("document.querySelector('[data-theme-set=\"dark\"]').click()")
        await pg.wait_for_timeout(300)
        await pg.goto(B + "/take-part", wait_until="commit")
        early = await pg.evaluate("document.documentElement.getAttribute('data-theme')")
        chk(early == "dark", f"the stored theme is on the document before paint ({early!r})")
        await pg.wait_for_timeout(1500)
        chk(await pg.evaluate("document.documentElement.getAttribute('data-theme')") == "dark",
            "and it is still there once the page has loaded")

        # and it must carry to a different page
        await pg.goto(B + "/")
        await pg.wait_for_timeout(1500)
        chk(await pg.evaluate("document.documentElement.getAttribute('data-theme')") == "dark",
            "the choice follows the reader from page to page")

        # the drawer copy, on a phone
        await ctx.close()
        ctx = await browser.new_context(viewport={"width": 390, "height": 844},
                                        has_touch=True, is_mobile=True)
        pg = await ctx.new_page()
        await pg.goto(B + "/records")
        await pg.wait_for_timeout(1600)
        chk(not await pg.locator(".theme.in-nav").is_visible(),
            "the nav control is out of the way on a phone")
        await pg.locator("#burger").click()
        await pg.wait_for_timeout(600)
        chk(await pg.locator(".theme.in-drawer").is_visible(),
            "and the drawer carries it instead")
        small = await pg.evaluate(
            """() => [...document.querySelectorAll('.theme.in-drawer .th-b')]
                 .map(b => Math.round(b.getBoundingClientRect().height))
                 .filter(h => h < 40)""")
        chk(not small, f"its buttons are thumb-sized ({small})")
        await ctx.close()
        await browser.close()

    print("\n" + ("ALL PASS" if not FAIL else f"{len(FAIL)} FAILURES:\n  " + "\n  ".join(FAIL)))
    sys.exit(1 if FAIL else 0)


try:
    asyncio.run(main())
finally:
    srv.send_signal(signal.SIGTERM)
