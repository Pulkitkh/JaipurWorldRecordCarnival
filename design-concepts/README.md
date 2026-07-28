# JWRC — website design concept (superseded)

> Earlier static mockups, kept for reference. The working site lives one
> directory up.

Static, no-build HTML/CSS mockups of five main pages for the Jaipur World Record
Carnival site. Built for design review, not for launch.

## Concept

**The Jharokha.** Rajasthani palace architecture is built around framed views —
you stand behind a carved window and look out at something larger than yourself.
That is the site's emotional thesis made structural: the cusped arch is the
primary shape (image masks, icon tiles, section frieze), taken directly from the
Hawa Mahal jharokhas already drawn into the JWRC logo.

**Signature interaction:** participation renders as individual dots that assemble
into a traditional *mandana* floor pattern — individual → collective → culture.
Used on the homepage impact section (see `index.html`, `#crowd-svg`).

## Palette

Derived from the logo and business card, not invented.

| Token | Value | Source |
|---|---|---|
| `--flame` | `#E8461C` | logo wordmark vermilion |
| `--navy` / `--navy-2` / `--navy-3` | `#1B2334` / `#121828` / `#0C111D` | card ground |
| `--indigo` | `#23406B` | card banner blue |
| `--crimson` | `#B92B2C` | block-print border on the card edge |
| `--teal` | `#2C6E80` | card swoosh / blue pottery |
| `--gold` | `#D9A441` | marigold — CTAs and accents on dark |
| `--ivory` / `--sand` | `#FCF8F0` / `#F3E8D6` | warm paper, never pure white |

Type: **Fraunces** (display), **Inter** (body), **Noto Sans Devanagari**.
Self-hosted in `assets/fonts/` — no external requests.

## Pages

| File | Role |
|---|---|
| `index.html` | The seven-chapter journey homepage |
| `why-records-matter.html` | Long-form editorial — the founding argument |
| `how-it-happens.html` | Six-stage process, the ten services, audiences, FAQ |
| `records.html` | The archive / museum wing |
| `join.html` | Four doors: participate, volunteer, partner, start something |

## Content status — read before reusing any of this

- **Real, from the business card:** founder name, 7× Guinness World Record holder,
  the six record bodies, phone, email, tagline, RAHDA / RERA roles.
- **Placeholder, must be replaced:** every entry on `records.html`, the two
  em-dash figures in the homepage impact section, and all photography.
- The mockups carry a visible `Concept mockup` bar and inline `Placeholder` chips
  so nothing here can be mistaken for verified fact. **Remove them only once real
  content replaces the placeholders — never before.**

Photography is the single biggest quality lever and the one thing CSS cannot
substitute. Every image slot is an arch-masked gradient stand-in with a caption
describing the shot the layout needs.

## Regenerating the screenshots

```bash
pip install playwright pillow
CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome python3 shoot.py
```

Output lands in `shots/`. Tall pages exceed Chromium's ~16384px capture limit, so
`shoot.py` captures in bands and stitches them.
