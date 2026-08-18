# Jaipur World Record Carnival

Three pages and a small API.

| | |
|---|---|
| `index.html` | the Carnival — what it is, why it gathers people, what it builds |
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
take-part.html          how to join, and the form
about.html              the founder, and the record archive
admin.html              the enquiries console
assets/css/style.css    design system — tokens, type, components, motion
assets/css/home.css     the Carnival page
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
