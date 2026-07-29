# Jaipur World Record Carnival

A movement built on one belief: that extraordinary things happen when ordinary
people decide to do them together.

> **The Jaipur World Record Carnival website is not built to explain what we do.
> It is built to make people understand why we exist.** Through immersive
> storytelling, thoughtful design, and the subtle essence of Rajasthan's culture
> and heritage, every visitor should feel emotionally connected to our vision,
> inspired by our purpose, and excited to become part of a movement that
> celebrates collective achievement, community, and the belief that extraordinary
> things happen when people come together.

*Every design decision on this site answers to the paragraph above.*

---

## The three rules it enforces

**1. Records are never the opening line.** Records are how the vision is achieved,
not the vision itself. The homepage does not use the word until Chapter Three — by
which point the visitor already understands *why* before *what*.

**2. Rajasthan is the identity, not the topic.** The site never announces the
state. There is no "Welcome to Rajasthan", no chapter explaining Mandana or blue
pottery. The warmth, the arches, the palette, the block-print borders and the
crowds do that work silently. A visitor should *feel* it without ever being told.
Devanagari appears exactly twice on the whole site, both times as a welcome
rather than as decoration.

**3. The conversion is a feeling, not a button.** Not *Apply Now*, not *Register*.
The only conversion that counts is "I believe in what these people are building."

## The homepage is an interactive documentary

Seven chapters, not seven sections. Every scroll reveals another piece of the
story.

| | |
|---|---|
| **One** | Welcome — ordinary people, extraordinary things, together |
| **Two** | Why We Gather — connection, purpose, celebration |
| **Three** | Why Records — a record is not a number, it is a symbol |
| **Four** | What We Build — now, finally, the practical part |
| **Five** | Stories — moments, not testimonials |
| **Six** | Where This Goes — the vision, and the generation after |
| **Seven** | Join the Journey — every great story begins with one decision |

> **“Find your passion, and it’s no longer work.”**

## What's here

```
JaipurWorldRecordCarnival/
├── index.html            Homepage — the seven-chapter documentary
├── gather.html           Why We Gather — story, vision, mission, values, people
├── why-records.html      Why Records Matter — the founding argument
├── what-we-build.html    Six stages, ten services, audiences, FAQ
├── moments.html          Filterable archive with story detail
├── join.html             Four ways in + three-step enquiry wizard
├── assets/               CSS, JS, self-hosted fonts
├── shoot.py              Screenshot harness
├── shots/                Rendered page screenshots
├── design-concepts/      Earlier static design mockups (reference only)
└── DOCS.md               Full technical documentation
```

## Running it

No build step, no dependencies, no external network requests.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Or simply open `index.html` in a browser.

## Before publishing

All record entries, participant figures and quotes are **illustrative demo
content** pending verified information. See the checklist at the end of
[`DOCS.md`](DOCS.md).


