# Manmohan Agarwal — portfolio

A single-page portfolio for Manmohan Agarwal, founder of the Jaipur World Record
Carnival. Static: no build step, no framework, no external requests at runtime.

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

## Deploying

The site is plain files, so any static host works. Configuration for the two
easiest is already in the repository — **no build command, no output directory**.

| Host | What to do |
|---|---|
| **Vercel** | Import the repo. Framework preset: **Other**. Leave build and output empty. `vercel.json` sets caching and security headers. |
| **Netlify** | Import the repo. Build command empty, publish directory `.`. `netlify.toml` does the rest. |
| **GitHub Pages** | Settings → Pages → deploy from `main`, folder `/`. Paths are relative, so a project subpath works. |
| **Cloudflare Pages** | Framework preset: **None**. Build output directory `/`. |

After deploying, update the absolute URLs if the domain differs from
`jaipurworldrecordcarnival.in` — `canonical`, `og:url` and `sitemap.xml`.

## Structure

```
index.html              the whole site
assets/css/style.css    design system — tokens, type, components, motion
assets/css/about.css    portfolio-specific layout
assets/js/app.js        nav, footer, scroll chrome
assets/js/motion.js     GSAP + Lenis motion system
assets/js/media.js      photo library loader and helpers
assets/js/gallery.js    virtualised, paginated masonry + lightbox
assets/js/about.js      page controller
assets/vendor/          GSAP, Lenis — vendored, no CDN
media/                  web-ready photographs + manifest.json
media-source/           originals (gitignored)
tools/build-media.py    turns originals into the web library
tools/sorter.html       visual tagger for unlabelled photographs
```

## The archive

77 photographs, grouped by record. Filter by kind, search by name, 24 to a page.

The grid is **virtualised**: only tiles near the viewport exist in the DOM, and
they recycle as you scroll, so cost is bounded by screen size rather than by
library size. Layout is computed from each photograph's intrinsic dimensions, so
nothing shifts as images load.

### Adding more photographs

```bash
pip install pillow
cp /path/to/new/photos/* media-source/
python3 tools/build-media.py          # resizes, converts to WebP, writes the manifest
python3 -m http.server 8000
open http://localhost:8000/tools/sorter.html   # tag them, then Export
```

`tools/sorter.html` shows one photograph at a time with the records bound to
number keys. Shift-click the filmstrip to select a range and tag it in one
keypress. Export replaces `media/manifest.json`.

## Content notes

Everything on the page is real and sourced from the material supplied.

- The **Limca certificate** in the archive is the authority on the 197,610-photograph
  exhibition: *largest photo exhibition on a single personality*, Triton Mall,
  Jaipur, **17 September 2018**. It is a **Limca** record, not Guinness — the page
  says so.
- Photographs carry no dates, so the archive has **no year filter**. If dates are
  supplied later, set `year` in the manifest and the facet can be restored.
- The hero portrait is cropped from a certificate photograph. Replace
  `media/portrait/manmohan-agarwal-*.webp` with a proper portrait when one exists.
