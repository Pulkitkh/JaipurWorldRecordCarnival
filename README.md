# Jaipur World Record Carnival

Three pages and a small API.

| | |
|---|---|
| `index.html` | the Carnival — what it is, why it gathers people, what it builds |
| `records.html` | the eleven world records, in full |
| `take-part.html` | how to join, and the enquiry form |
| `about.html` | Manmohan Agarwal, founder, and the record archive |
| `admin.html` | the enquiries that came in — password only |

The site itself is static: no build step, no framework, no external requests at
runtime. The four files under `api/` are Node functions Vercel runs on demand;
they are the only part that needs anything installed.

```bash
python3 -m http.server 8000          # the site alone
node tools/dev-server.js             # the site and the API together
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

## The records page

Eleven entries, in three groups — gathered, built, drawn by hand — because
that is the honest division: four of them needed a crowd, four needed a
workshop, three needed one hand and a magnifying glass.

Six of the eleven have photographs. The other five are given a **drawn
plate** instead of a wall of text: a canvas that renders the number itself,
one mark at a time. Where the count is small enough to draw honestly every
mark is one thing — 11,111 miniatures, 366 birthdays laid out as a year with
the 29th of February ringed. Where it is not, the plate states the ratio it
used (*one mark for every thousand trees*) rather than quietly rescaling,
and the screw is drawn against a person at the same scale so the comparison
is arithmetic rather than an impression.

Each plate is built the way a specimen card is: a warm light behind the
field, paper grain over it, a ruled border with corner ticks, and the number
itself set enormous and nearly invisible behind the marks. The Ram plate sets
the actual word — राम — rather than an abstract tick, and the mirror plate
shows five scripts as written beside the same five held to a mirror, which
is the record itself rather than a picture of unreadable type.

They are drawn once, when they scroll into view, and redrawn only when the
box actually changes width — not on every resize event, because a phone
fires those continuously while the address bar slides away. They wait for
the webfonts first: canvas does not re-render type when a font arrives late
the way layout does, so drawing early means drawing in Times forever.

### Putting a real photograph on a record

Five of the eleven records have no photograph and carry a drawn plate
instead. When a real one turns up:

```bash
pip install pillow
python3 tools/add-photo.py ~/Downloads/tree-planting.jpg trees
python3 tools/check-images.py records.html
```

One command per photograph. It resizes into the same WebP widths the rest
of the library uses, writes the manifest entry with that record's own event
and caption, and swaps the plate on `records.html` for the photograph —
or, where the record already has one, lays the new one over its corner as
the second frame. The record is named by its id on the page: `trees`,
`photographs`, `dance`, `birthdays`, `calendar`, `spoon`, `screw`,
`perpetual`, `ram`, `ganesha`, `languages`.

It refuses to overwrite an existing file, and it warns when the record's
own paragraph describes the plate being replaced.

### Two rules worth knowing before editing any page

**One. Never identify a page by matching `.html` in the URL.** `vercel.json`
sets `cleanUrls`, so the deployed addresses have no extension — `/records`,
not `/records.html`. Each page declares itself with `data-page` on `<body>`
and `app.js` reads that; the URL is only a fallback. Getting this wrong is
invisible locally, where a file server only ever serves `/records.html`, and
puts the landing page's menu on every page in production, where its `#gather`
and `#build` links point at sections that do not exist. `tools/check-devices.py`
now serves the site the way Vercel does and fails on any menu link that lands
nowhere.

**Two. Never put `data-anim` on a direct child of a `[data-stag]` container.**
Both are reveal mechanisms in `motion.js`, and both call `gsap.from()`. Run
on the same element, the second one initialises mid-flight, reads the
current opacity of 0 as its destination, and animates the element from
invisible to invisible — permanently. Eight blocks of this page were built
that way and could not be seen at all. `tools/check-devices.py` now fails on
the structure as well as on the symptom.

## Enquiries, and where they go

Somebody fills in the form on **Take part**. It is posted to `/api/enquiry`,
which validates it, splits it into columns and stores it. They are shown a
reference — `JWRC-XXXXXX` — that they can quote on the phone. **admin.html**
lists what has arrived, behind one password.

The answers are stored as real columns, not as one blob of text, so the table
can answer questions afterwards: how many schools wrote in last month, who could
bring the most people, which enquiries nobody has replied to. `db/schema.sql`
has the whole table with a note on each column.

```
api/enquiry.js              POST — the one public write
api/admin/session.js        POST sign in · GET am I in · DELETE sign out
api/admin/enquiries.js      GET the list · PATCH one status or note
api/admin/export.js         GET everything as a CSV
api/_lib/                   database, auth, request helpers (not routes)
db/schema.sql               the table, with a note on every column
admin.html                  the console
tools/dev-server.js         runs the API locally, without Vercel
```

### Setting it up on Vercel

Nothing here is in the repository — no password, no connection string. Both are
set in the Vercel dashboard, once.

1. **Add a database.** Vercel dashboard → your project → **Storage** → **Create
   Database** → any Postgres (Neon is the default). Connect it to the project.
   Vercel writes `POSTGRES_URL` / `DATABASE_URL` into the environment itself.
2. **Set the password.** **Settings** → **Environment Variables** → add
   `ADMIN_PASSWORD`. Make it long — it is the only thing between a stranger and
   everybody's phone number. Apply it to Production, Preview and Development.
3. **Optionally** add `SESSION_SECRET` (any long random string). Without it one
   is derived from the password, which works; setting it means changing the
   password does not sign you out everywhere.
   The connection is made over TLS with the certificate verified. Neon,
   Supabase and Vercel Postgres all pass. A database behind a private
   authority needs `PGSSL_NO_VERIFY=1` — the console says so if that is what
   went wrong.
4. **Redeploy.** Environment variables are read at boot, so an existing
   deployment will not see them until it is redeployed.
5. Open `/admin` and sign in.

The table creates itself the first time somebody sends the form, so there is no
migration to run. To create it ahead of time:

```bash
psql "$POSTGRES_URL" -f db/schema.sql
```

**To change the password:** edit `ADMIN_PASSWORD` in Vercel and redeploy.
Everyone signed in is signed out.

If the database is ever unreachable, the form does not swallow the enquiry — it
opens WhatsApp with the message already written and says so, and the answers
stay in the form.

### Running it locally

```bash
npm install
createdb jwrc
POSTGRES_URL=postgres://localhost/jwrc ADMIN_PASSWORD=whatever \
  node tools/dev-server.js          # http://localhost:3000, /admin included
```

### Checking it still works

```bash
python3 tools/check-api.py    http://127.0.0.1:3000 whatever   # the endpoints
python3 tools/check-admin.py  http://127.0.0.1:3000 whatever   # the whole path, in a browser
python3 tools/check-devices.py                                 # every page, twelve screens
python3 tools/check-images.py                                  # no photograph twice on a page
```

`check-admin.py` **empties the enquiries table**. Point it at a scratch
database.

### What guards the data

- The password is compared in constant time and never leaves the environment.
  The cookie is a signed expiry, not the password, and is `HttpOnly` and
  `SameSite=Strict` — no script can read it and no other site can cause it to be
  sent.
- Every query is parameterised. The one thing that cannot be a parameter — the
  sort order — is chosen from a fixed list.
- The console never puts a stored value into `innerHTML`. An enquiry whose name
  is a `<script>` tag is displayed as that text.
- An address is stored only as a salted hash, so repeat senders can be spotted
  without holding anybody's IP address.
- A hidden field catches form bots, and five enquiries an hour from one address
  is the ceiling.
- `/admin` and `/api` are disallowed in `robots.txt` and sent with
  `X-Robots-Tag: noindex`.

## Structure

```
index.html              the Carnival
records.html            the eleven records
take-part.html          how to join, and the form
about.html              the founder, and the record archive
admin.html              the enquiries console
assets/css/style.css    design system — tokens, type, components, motion
assets/css/home.css     the Carnival page
assets/css/records.css  the records page
assets/css/take-part.css  the Take part page
assets/css/about.css    portfolio-specific layout
assets/css/admin.css    the console
assets/js/app.js        nav, footer, scroll chrome — every page
assets/js/motion.js     GSAP + Lenis motion system
assets/js/media.js      photo library loader and helpers
assets/js/gallery.js    virtualised, paginated masonry + lightbox
assets/js/about.js      page controller
assets/vendor/          GSAP, Lenis — vendored, no CDN
media/                  web-ready photographs + manifest.json
media-source/           originals (gitignored)
tools/build-media.py    turns originals into the web library
tools/sorter.html       visual tagger for unlabelled photographs
tools/dev-server.js     the site and the API, locally
tools/check-*.py        the guards — see above
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

## If the archive ever shows "Loading…"

That is a stale browser cache: an old copy of one script against a new copy of
another. Hard refresh (Ctrl/Cmd + Shift + R).

It should not be possible now — every stylesheet and script is loaded with a
`?v=` version string, so a deploy can never serve a mismatched pair. Bump the
`VER` value in `index.html` if you ever edit an asset by hand.

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
