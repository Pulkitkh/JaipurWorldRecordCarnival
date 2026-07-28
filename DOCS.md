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

## Before launch

- [ ] Replace every entry in `data.js` with verified content
- [ ] Remove the demo banner from `app.js`
- [ ] Swap the SVG scenes for real photography
- [ ] Replace the reconstructed logo mark in `app.js` with the official vector
- [ ] Connect the enquiry form to a real destination
- [ ] Add favicons, Open Graph images and a sitemap
- [ ] Confirm names and roles on the team section
