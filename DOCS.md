# Technical documentation

For a project overview see [`README.md`](README.md).

A complete, working six-page site. No build step, no dependencies, no external
network requests — open `index.html` in a browser and everything runs.

```
python3 -m http.server 8000    # then visit http://localhost:8000
```

## ⚠ Content status — read this first

**Everything in `assets/js/data.js` is invented sample content.** Record titles,
participant counts, dates, venues, quotes and attributed names are illustrative
placeholders written to demonstrate the layouts. A dismissible banner says so on
every page, and the archive repeats it above the grid.

Replace all of it with verified, certified information before this goes live.
Delete the `demobar` block in `assets/js/app.js` at the same time — not before.

The only **real** details on the site are the founder's name, the seven Guinness
World Records, the six certifying bodies, the phone number, the email address and
the tagline. Those came from the business card.

## Design concept

**The jharokha.** Rajasthani palace architecture is built around framed views: you
stand behind a carved window and look out at something larger than yourself. That
is the site's emotional thesis made structural. The cusped arch (`#jw-cusp`,
`#jw-arch` clip paths) frames every image, every icon tile and the section friezes.

The arch is not applied to the brand — it is already *in* the brand. The JWRC logo
has Hawa Mahal jharokhas drawn into its letterforms.

**Signature interaction:** on the homepage impact section, individual dots — one per
person — scatter, then assemble into a *mandana*, the pattern drawn in chalk on a
swept Rajasthani floor. Individual → collective → culture, in one gesture.

## Palette

Sampled from the logo and business card, not invented.

| Token | Value | Source |
|---|---|---|
| `--flame` | `#E8461C` | logo wordmark vermilion |
| `--navy` / `--navy-2` / `--navy-3` | `#1B2334` / `#121828` / `#0B101B` | card ground |
| `--indigo` | `#23406B` | BUILDERS & DEVELOPERS banner |
| `--crimson` | `#B92B2C` | block-print border on the card edge |
| `--teal` | `#2C6E80` | card swoosh / blue pottery |
| `--gold` | `#D9A441` | marigold — CTAs and accents on dark |
| `--ivory` / `--sand` | `#FCF8F0` / `#F4EADA` | warm paper, never pure white |

Type: **Fraunces** (display), **Inter** (body), **Noto Sans Devanagari**.
Self-hosted in `assets/fonts/`.

## Files

```
index.html          The seven-chapter journey homepage
about.html          Story, vision, mission, eight values, timeline, people
why-records.html    Long-form editorial — the founding argument
how-it-works.html   Six stages, ten services, audiences, FAQ
records.html        Filterable archive with record-detail modal
join.html           Four doors + three-step enquiry wizard

assets/css/style.css   Design system, components, responsive, motion prefs
assets/js/art.js       Generative SVG artwork (see below)
assets/js/data.js      ALL demo content lives here
assets/js/app.js       Chrome, scroll choreography, interactive modules
shoot.py               Screenshot harness (Playwright)
```

## The artwork

There is no photography, so every "photograph" is a composed SVG scene built from
Jaipur primitives — the Hawa Mahal facade, crowd rows, kites, marigold petals —
in seven variants (`attempt`, `formation`, `school`, `heritage`, `festival`,
`night`, `green`). A seeded PRNG keeps each one stable across reloads.

**This is a stand-in, not a substitute.** Real crowd photography will lift the site
more than any other single change. The swap is mechanical: replace
`<span class="scene" data-scene="…">` with an `<img>`; the arch framing, hover zoom
and caption treatment all still apply.

Portraits are deliberately face-free silhouettes — an illustrated face reads as a
cartoon and undercuts the tone.

## Motion system

`assets/js/motion.js` owns every animation. One physics model, one easing
language — two custom eases (`jw`, `jwOut`) that everything on the site shares,
so nothing feels borrowed from a different website.

Built on GSAP 3.13 + ScrollTrigger + SplitText + DrawSVG + CustomEase and Lenis,
all vendored into `assets/vendor/` — no CDN, no external requests.

| | |
|---|---|
| **Scroll** | Lenis inertial smooth scroll, driven by the GSAP ticker so ScrollTrigger stays in sync |
| **Hero** | Split-line reveal with blur, scroll-linked exit (scale + fade + blur), mouse parallax, canvas particle field with cursor repulsion, drifting aurora mesh |
| **Cursor** | Custom dot + spring-lagged ring in `difference` blend mode, grows and labels itself over interactive elements |
| **Magnetism** | Buttons, chips and arrows pull toward the cursor on an elastic ease |
| **Scrollytelling** | Pinned symbol rows that light one at a time; a pinned horizontal stage rail on What We Build |
| **Scrubbed** | Breather parallax, marquee coupled to scroll velocity (reverses when you scroll up) |
| **Micro** | 3D tilt with tracking glare, odometer counters, clip-path image reveals, SVG draw-on |
| **Navigation** | Scroll-spy chapter rail, page-transition veil, preloader that draws the mandana dot by dot |

Every module is optional — it looks for its own elements and stays silent
otherwise. The whole system is disabled by `prefers-reduced-motion` and by
appending `?nomotion=1` (which the screenshot harness uses).

### Performance — and one rule worth keeping

Measured with a scripted 120-frame scroll of the whole homepage, headless
Chromium on software rendering (SwiftShader):

| | median frame | fps |
|---|---|---|
| Plain text page (the renderer's ceiling) | 16.7 ms | 60 |
| This site, motion disabled | 16.7 ms | 60 |
| This site, full motion — **first build** | 149.9 ms | **7** |
| This site, full motion — **after fixes** | 16.7 ms | **60** |

The first build was genuinely broken, not merely slow in headless: the same
renderer hit 60 fps on a plain page, so there was nowhere to hide.

**The rule: under smooth scroll, every frame is a scroll frame.** Anything that
repaints full-viewport stops running occasionally and starts running at 60Hz.
Three things were doing exactly that and together cost ~85% of the frame budget:

1. `filter: blur(70px)` on three animated full-bleed aurora layers — rewritten as
   one composited layer of soft radial gradients, animated by transform only.
2. `mix-blend-mode: multiply` on the fixed full-screen paper grain — the blend
   forced a full-screen composite every frame. Now plain opacity.
3. `backdrop-filter` on the sticky nav and the filter bar — re-blurring a
   full-width strip on every frame. Now a solid gradient, visually identical
   over a dark ground.

`backdrop-filter` survives in exactly one place — the record modal — because
scrolling is locked while it is open, so it never repaints per frame.

If you add effects later, check them against that table before shipping.

`app.js` keeps only the non-motion work: chrome, data rendering, filters, the
modal, the slider and the form wizard.

## What actually works

Preloader · scroll-progress bar · sticky nav that compacts · mobile drawer ·
reveal-on-scroll with stagger · masked headline reveals · hero parallax and float ·
animated counters · the mandana dot assembly · marquee ticker · records filtering
by certifying body and cause · record-detail modal (click, Enter/Space, Escape,
backdrop) · autoplaying stories slider with arrows and dots · FAQ accordion ·
three-step enquiry wizard with per-field validation and a success state ·
back-to-top · full responsive down to 390px · `prefers-reduced-motion` respected
throughout.

The enquiry form is front-end only — it validates and shows a success state but
sends nothing. Wire it to an inbox, form service or CRM before launch.

## Regenerating screenshots

```bash
pip install playwright pillow
CHROME_PATH=/path/to/chrome python3 shoot.py
```

Tall pages exceed Chromium's ~16384px capture limit, so `shoot.py` captures in
bands and stitches them.

## The About page (portfolio) and its archive

`about.html` is Manmohan Agrawal's portfolio. It is **self-contained**: it loads
`assets/css/about.css`, `assets/js/media.js`, `assets/js/gallery.js` and
`assets/js/about.js`, all of which exist only for this page. It adds nothing to
the shared stylesheet or to `app.js`, so no other page can be affected by it.

### Adding the real photographs

Nothing on the page is written around a fixed number of images. Create
`media/manifest.json` and it is used automatically — no code change:

```bash
# one-off: pip install pillow
python3 - <<'EOF'
import json, pathlib
from PIL import Image
items = []
for f in sorted(pathlib.Path("media").rglob("*.jpg")):
    w, h = Image.open(f).size
    year = int(f.parts[1]) if f.parts[1].isdigit() else 2025
    items.append({
        "id": f.stem, "src": str(f), "w": w, "h": h,
        "alt": f.stem.replace("-", " "),
        "category": "records",          # records | events | media | certificates | people | personal
        "year": year,
        "event": f.parent.name.replace("-", " ").title(),
        "tags": [], "featured": False,
    })
pathlib.Path("media/manifest.json").write_text(json.dumps({"items": items}, indent=1))
print(len(items), "photographs indexed")
EOF
```

`w` and `h` are the only required fields beyond `id` and `src`. Layout is computed
from them, so the grid is correct **before** a single byte of image data arrives —
there is no reflow and no cumulative layout shift, ever.

Optional per record: `thumb`, `widths` (a responsive set, emitted as `srcset`),
`tone` (dominant colour shown while the file downloads), `caption`, `featured`.

Categories, years and the search index are **derived** from the data. Add a new
year or category to the manifest and the filter bar grows by itself.

### Why the grid is virtualised

`loading="lazy"` solves bandwidth. It does not solve DOM weight — a thousand
`<img>` elements is a thousand layout boxes and compositor layers whether or not
the pixels have arrived. The engine therefore mounts only the tiles intersecting
the viewport plus 1.5 screens of buffer, recycles nodes through a pool, and
releases image sources on unmount so memory stays flat.

Measured by scripted scroll of the full archive, headless on software rendering:

| Library size | Tiles in the DOM | Total DOM nodes | fps |
|---|---|---|---|
| 284 photographs | 29 | 22,075 | 60 |
| 1,000 photographs | 29 | 22,075 | 60 |
| 5,000 photographs | 39 | 26,476 | 60 |

Cost is bounded by viewport size, not library size. (The node totals above are
inflated by the generated stand-in artwork — each scene is a few hundred SVG
shapes. Real photographs are one `<img>` each, so those figures will *fall*
substantially once the actual files are in place.)

Stress-test any size from the console: set `__SCALE__ = 5000` and reload.

### Two views over the same data

**Mosaic** — the virtualised masonry, for browsing everything at once.
**Timeline** — one collapsible band per year, each filled only when opened, for
reading the archive as a career. Both are driven by the same filter state.

The lightbox supports arrow keys, Escape, swipe, neighbour preloading and
deep links (`about.html#photo=<id>` opens that photograph directly).

### Not yet linked in the navigation

`about.html` is deliberately **not** in the shared nav, because adding it would
mean editing `app.js`, which renders the nav on every page. To link it, add one
line to the `NAV` array in `assets/js/app.js`:

```js
["about.html", "The Founder"],
```

## Site metadata

Favicons (`favicon.svg` + `.ico` fallback), `apple-touch-icon.png`, PWA icons and
`site.webmanifest`, canonical URLs, Open Graph and Twitter card tags on every
page, `robots.txt`, `sitemap.xml`, and Organization JSON-LD on the homepage.

`og-image.png` is rendered from the site's own stylesheet and artwork engine, so
the share card can never drift from the design. To regenerate it after a copy or
palette change, rebuild the template described in the repository history and
screenshot it at 1200×630.

Icon and manifest paths are **relative**, so the site works when served from a
subpath (GitHub Pages project sites) as well as from a domain root. Canonical and
`og:` URLs are absolute and point at `jaipurworldrecordcarnival.in` — change those
if the domain changes.

## Before launch

- [ ] Replace every entry in `data.js` with verified content
- [ ] Remove the demo banner from `app.js`
- [ ] Swap the SVG scenes for real photography
- [ ] Replace the reconstructed logo mark in `app.js` with the official vector
- [ ] Connect the enquiry form to a real destination
- [ ] Confirm names and roles on the team section
- [x] Favicons, share card, manifest, sitemap and structured data
