#!/usr/bin/env python3
"""
Walk the whole enquiry path in a real browser, against a real database.

    createdb jwrc
    POSTGRES_URL=postgres://... ADMIN_PASSWORD=... node tools/dev-server.js &
    python3 tools/check-admin.py http://127.0.0.1:3000 the-password

    WARNING: this empties the enquiries table. Point it at a scratch
    database, never at the live one.

Somebody fills in the form on a phone; it is stored, split into columns;
a stranger cannot see it; the right password can; a status change sticks;
and every screen from a 320px phone to a 1920px monitor shows the same
thing without breaking.

Two of the checks here exist because they caught something real:
  · a name written as a script tag must be shown, not run
  · the hidden screens must actually be hidden, which a class selector
    setting display quietly undoes

Exit code 1 on any failure, so it can run in CI.
"""

import asyncio
import os
import subprocess
import sys

from playwright.async_api import async_playwright

B = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3000"
PW = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("ADMIN_PASSWORD", "")
DB = os.environ.get("POSTGRES_URL") or os.environ.get("DATABASE_URL") or ""
FAIL = []

def chk(c, m):
    print(("  ok   " if c else "  FAIL ") + m)
    if not c: FAIL.append(m)

def sql(q):
    return subprocess.run(["psql", DB, "-tAc", q], capture_output=True, text=True).stdout.strip()

HOSTILE = '<img src=x onerror="window.__pwned=1">Ravi'

async def main():
    sql("truncate enquiries;")
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium")

        # ---------- 1. a person sends the form ----------
        print("\nthe form on take-part")
        pg = await b.new_page(viewport={"width": 390, "height": 844})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(f"{B}/take-part.html")
        await pg.wait_for_timeout(2500)

        btn = pg.locator('button[data-send="site"]')
        chk(await btn.count() == 1, "the primary send button exists")
        box = await btn.bounding_box()
        chk(box and box["height"] >= 44, f"and it is thumb-sized on a phone ({box and round(box['height'])}px)")

        hp = pg.locator('input[name="website"]')
        chk(await hp.count() == 1, "the honeypot field is in the form")
        hb = await hp.bounding_box()
        chk(hb and hb["x"] + hb["width"] < 0, f"and it sits off the side of the page ({hb and round(hb['x'])})")
        chk(await hp.get_attribute("tabindex") == "-1", "no keyboard reaches it")

        await pg.fill("#q-name", HOSTILE)
        await pg.fill("#q-phone", "+91 98290 44444")
        await pg.fill("#q-email", "ravi@example.com")
        await pg.fill("#q-org", "Jaipur Cycling Club")
        await pg.check('input[name="as"][value="An individual"]')
        await pg.fill("#q-people", "maybe 300")
        await pg.fill("#q-note", "We could ride together for the road-safety cause.")
        await btn.click()
        await pg.wait_for_timeout(1800)

        status = (await pg.locator("#q-status").inner_text()).strip()
        chk("reference" in status.lower(), f"the sender is thanked and given a reference ({status[:70]})")
        ref = await pg.locator(".form-ref").inner_text() if await pg.locator(".form-ref").count() else ""
        chk(ref.startswith("JWRC-"), f"the reference is shown ({ref})")
        chk(await pg.input_value("#q-name") == "", "the form is cleared afterwards")
        chk(not errs, f"no JS errors ({errs[:2]})")

        row = sql("select name||'|'||phone_digits||'|'||coalesce(email,'')||'|'||writing_as||'|'||coalesce(people::text,'')||'|'||status from enquiries;")
        chk("919829044444|ravi@example.com|An individual|300|new" in row, f"it landed in the database, split into columns ({row[:110]})")

        # a second one, so the console has something to filter
        await pg.goto(f"{B}/take-part.html")
        await pg.wait_for_timeout(2000)
        await pg.fill("#q-name", "Sunita Devi")
        await pg.fill("#q-phone", "9829055555")
        await pg.fill("#q-org", "Rajkiya Balika Vidyalaya")
        await pg.check('input[name="as"][value="A school or college"]')
        await pg.fill("#q-people", "800")
        await pg.fill("#q-note", "Our girls would like to attempt the yoga record.")
        await pg.locator('button[data-send="site"]').click()
        await pg.wait_for_timeout(1500)
        chk(sql("select count(*) from enquiries;") == "2", "a second enquiry is stored too")
        await pg.close()

        # ---------- 2. the console will not open without the password ----------
        print("\nthe console door")
        pg = await b.new_page(viewport={"width": 1280, "height": 900})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(f"{B}/admin")
        await pg.wait_for_timeout(900)
        chk(await pg.locator("#gate").is_visible(), "a stranger meets the sign-in form")
        chk(not await pg.locator("#app").is_visible(), "and not the enquiries")
        leaked = await pg.evaluate("document.body.innerText")
        chk("Sunita" not in leaked and "Jaipur Cycling" not in leaked,
            "nothing from the database is on the page before signing in")

        await pg.fill("#pw", "wrong password")
        await pg.click("#signin-go")
        await pg.wait_for_timeout(800)
        chk("not right" in (await pg.locator("#gate-msg").inner_text()).lower(),
            "a wrong password says so")
        chk(not await pg.locator("#app").is_visible(), "and still shows nothing")

        # ---------- 3. signed in ----------
        print("\nsigned in")
        await pg.fill("#pw", PW)
        await pg.click("#signin-go")
        await pg.wait_for_timeout(1500)
        chk(await pg.locator("#app").is_visible(), "the console opens")
        chk(not await pg.locator("#gate").is_visible(), "and the sign-in card is gone, not merely behind it")
        chk(not await pg.locator("#boot").is_visible(), "so is the loading screen")
        n = await pg.locator(".ad-row").count()
        chk(n == 2, f"both enquiries are listed ({n})")

        chk(await pg.evaluate("window.__pwned === undefined"),
            "a name written as a script tag did not run")
        names = await pg.locator(".ad-row h2").all_inner_texts()
        chk(HOSTILE in names, f"it is shown as the text it is ({names})")

        stats = await pg.locator(".ad-stat b").all_inner_texts()
        chk(stats[0] == "2", f"the totals are right ({stats})")
        chk(stats[3] == "1,100", f"the people offered are added up ({stats[3]})")

        # a status change survives a reload
        await pg.locator(".ad-row select").first.select_option("contacted")
        await pg.wait_for_timeout(900)
        chk("Marked contacted" in await pg.locator(".ad-row .ad-saved").first.inner_text(),
            "changing a status is confirmed")
        await pg.fill(".ad-row textarea", "Rang him, sending dates.")
        await pg.locator("#q").focus()
        await pg.wait_for_timeout(900)
        await pg.reload()
        await pg.wait_for_timeout(1500)
        chk(await pg.locator(".ad-row select").first.input_value() == "contacted",
            "and it is still there after a reload")
        chk(await pg.locator(".ad-row textarea").first.input_value() == "Rang him, sending dates.",
            "so is the note")

        # search
        await pg.fill("#q", "vidyalaya")
        await pg.wait_for_timeout(900)
        chk(await pg.locator(".ad-row").count() == 1, "search narrows the list")
        await pg.fill("#q", "")
        await pg.wait_for_timeout(900)

        # status pills
        await pg.locator('.ad-pill:has-text("Contacted")').click()
        await pg.wait_for_timeout(800)
        chk(await pg.locator(".ad-row").count() == 1, "the status pills filter")
        await pg.locator('.ad-pill:has-text("Everything")').click()
        await pg.wait_for_timeout(800)
        chk(await pg.locator(".ad-row").count() == 2, "and clear again")
        chk(not await pg.locator("#pager").is_visible(),
            "there is no pager while everything fits on one page")
        chk(not errs, f"no JS errors in the console ({errs[:2]})")

        # ---------- 4. signing out ----------
        print("\nsigning out")
        await pg.click("#signout")
        await pg.wait_for_timeout(800)
        chk(await pg.locator("#gate").is_visible(), "signing out returns to the door")
        await pg.reload()
        await pg.wait_for_timeout(1200)
        chk(await pg.locator("#gate").is_visible(), "and it stays shut on reload")
        await pg.close()

        # ---------- 5. every screen size ----------
        print("\nthe console on every screen")
        for w, h, label, touch in ((320, 568, "iPhone SE", True), (390, 844, "iPhone 15", True),
                                   (768, 1024, "iPad", True), (1024, 768, "small laptop", False),
                                   (1440, 900, "desktop", False), (1920, 1080, "large desktop", False)):
            pg = await b.new_page(viewport={"width": w, "height": h},
                                  has_touch=touch, is_mobile=touch,
                                  device_scale_factor=3 if touch else 1)
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(f"{B}/admin")
            await pg.wait_for_timeout(700)
            gate_w = await pg.evaluate("document.documentElement.scrollWidth")
            chk(gate_w <= w + 1, f"{label} {w}px — sign-in does not overflow ({gate_w})")
            await pg.fill("#pw", PW)
            await pg.click("#signin-go")
            await pg.wait_for_timeout(1500)
            sw = await pg.evaluate("document.documentElement.scrollWidth")
            chk(sw <= w + 1, f"{label} {w}px — the list does not overflow ({sw})")
            out = await pg.evaluate("""(w) => [...document.querySelectorAll('#app *')]
                .filter(el => { const r = el.getBoundingClientRect();
                                return r.width > 0 && (r.right > w + 1 || r.left < -1); })
                .map(el => el.className && el.className.baseVal === undefined ? el.className : el.tagName)
                .slice(0, 4)""", w)
            chk(not out, f"{label} {w}px — nothing sits outside the frame ({out})")
            small = await pg.evaluate("""() => [...document.querySelectorAll('#app button, #app select, #app a')]
                .filter(el => el.getBoundingClientRect().height > 0
                           && el.getBoundingClientRect().height < 40)
                .map(el => (el.className || el.tagName) + ':' + Math.round(el.getBoundingClientRect().height))
                .slice(0, 4)""")
            if touch:
                coarse = await pg.evaluate("matchMedia('(pointer: coarse)').matches")
                chk(coarse, f"{label} {w}px — the browser reports a touch screen")
                chk(not small, f"{label} {w}px — every control is thumb-sized ({small})")
            chk(not errs, f"{label} {w}px — no JS errors ({errs[:1]})")
            await pg.close()

        await b.close()

    print("\n" + ("ALL PASS" if not FAIL else f"{len(FAIL)} FAILURES:\n  " + "\n  ".join(FAIL)))
    raise SystemExit(1 if FAIL else 0)


if not DB or not PW:
    sys.exit("Set POSTGRES_URL and pass the admin password. See the docstring.")

asyncio.run(main())
