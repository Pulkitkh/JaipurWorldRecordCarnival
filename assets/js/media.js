/* ============================================================
   JWRC — media library
   ------------------------------------------------------------
   The archive is DATA, never markup. Nothing in about.html knows
   how many photographs exist; it asks this module and renders
   whatever comes back. Hundreds or thousands, the page is identical.

   ── HOW TO ADD REAL PHOTOGRAPHS ────────────────────────────
   Drop a manifest at  media/manifest.json  shaped like:

     { "items": [ { …one record per photograph… } ] }

   If that file exists it is used and every sample below is ignored.
   No code change required. Generate it with any script that can
   read image dimensions — see DOCS.md for a ten-line example.

   ── ONE RECORD ─────────────────────────────────────────────
   {
     id:       "2025-emblem-042",         // unique, stable
     src:      "media/2025/emblem/042.jpg",   // full size
     thumb:    "media/2025/emblem/042-640.jpg", // optional, else src
     widths:   { 640: "...-640.jpg",          // optional responsive set
                 1280: "...-1280.jpg",
                 1920: "...-1920.jpg" },
     w: 1600, h: 1067,                    // REQUIRED — intrinsic pixels.
                                          // Layout is computed from these,
                                          // so nothing ever shifts on load.
     tone:     "#7a3a1e",                 // optional dominant colour, shown
                                          // while the file downloads
     alt:      "Students holding boards above their heads at dawn",
     caption:  "Four minutes and eleven seconds.",
     category: "records",                 // see CATEGORIES below
     year:     2025,
     event:    "Largest human formation of a state emblem",
     tags:     ["guinness", "students"],
     featured: true                       // surfaces in the featured rail
   }
   ============================================================ */
(function (w) {
  "use strict";

  const CATEGORIES = [
    { id: "records",      label: "World Records" },
    { id: "events",       label: "Events" },
    { id: "media",        label: "Press & Media" },
    { id: "certificates", label: "Certificates" },
    { id: "people",       label: "People" },
    { id: "personal",     label: "Milestones" },
  ];

  /* ── Sample library ────────────────────────────────────────
     Generated rather than hand-written so the page can be proven
     against a realistic volume. Replace with media/manifest.json.  */

  const EVENTS = [
    { y: 2025, cat: "records", e: "Largest human formation of a state emblem", tag: "guinness" },
    { y: 2025, cat: "events",  e: "Republic Day mass assembly",                tag: "civic" },
    { y: 2024, cat: "records", e: "Most people planting saplings simultaneously", tag: "limca" },
    { y: 2024, cat: "records", e: "Largest folk dance ensemble performing Ghoomar", tag: "asia-book" },
    { y: 2024, cat: "records", e: "Most people taking a pledge on road safety", tag: "india-book" },
    { y: 2024, cat: "media",   e: "National press coverage",                   tag: "press" },
    { y: 2023, cat: "records", e: "Largest simultaneous health screening camp", tag: "golden-book" },
    { y: 2023, cat: "records", e: "Most people block-printing a continuous cloth", tag: "unique-book" },
    { y: 2023, cat: "records", e: "Largest gathering reading simultaneously",   tag: "india-book" },
    { y: 2023, cat: "events",  e: "School leadership workshops",               tag: "schools" },
    { y: 2022, cat: "records", e: "Human chain for water conservation",         tag: "asia-book" },
    { y: 2022, cat: "media",   e: "Television features and interviews",         tag: "press" },
    { y: 2021, cat: "events",  e: "Community relief drives",                    tag: "community" },
    { y: 2020, cat: "personal", e: "Early attempts and first certifications",   tag: "milestone" },
    { y: 2019, cat: "personal", e: "Where it began",                            tag: "milestone" },
  ];

  const SHAPES = [                       // realistic mixed aspect ratios
    [1600, 1067], [1600, 1067], [1600, 1067],   // 3:2 landscape, most common
    [1067, 1600], [1200, 1500],                  // portrait
    [1600, 900], [2000, 900],                    // wide / panorama
    [1400, 1400],                                // square
  ];

  const TONES = ["#7a3a1e", "#2b4a6b", "#8e4a2a", "#1f3b4d", "#a35a2c",
                 "#3a3357", "#6d2f38", "#2f5340", "#93683a", "#4a2b3d"];

  const CAPTIONS = [
    "The markers were painted before six.",
    "Nobody remembers who started the cheering.",
    "The count, taken twice, out loud.",
    "Volunteers briefing their sections.",
    "The adjudicator, waiting.",
    "Somebody's mother had made two hundred parathas.",
    "Four minutes and eleven seconds.",
    "The moment it was confirmed.",
    "Stewards, an hour before anyone arrived.",
    "Afterwards, when nobody wanted to leave.",
  ];

  function sampleLibrary(count) {
    const out = [];
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < count; i++) {
      const ev = EVENTS[Math.floor(rnd() * EVENTS.length)];
      const [w0, h0] = SHAPES[Math.floor(rnd() * SHAPES.length)];
      out.push({
        id: `sample-${ev.y}-${i}`,
        src: null,                       // no file yet — a scene is drawn instead
        w: w0, h: h0,
        tone: TONES[Math.floor(rnd() * TONES.length)],
        alt: `${ev.e}, ${ev.y}`,
        caption: CAPTIONS[Math.floor(rnd() * CAPTIONS.length)],
        category: ev.cat,
        year: ev.y,
        event: ev.e,
        tags: [ev.tag],
        featured: i % 23 === 0,
      });
    }
    return out;
  }

  /* Deliberately large, so the architecture can be judged at realistic volume.
     window.__SCALE__ lets you stress-test any size from the console without a
     code change, e.g.  __SCALE__ = 5000  before reload. */
  const SAMPLE_COUNT = (typeof window !== "undefined" && window.__SCALE__) || 284;

  /* ── Loader ──────────────────────────────────────────────── */

  async function load() {
    try {
      const res = await fetch("media/manifest.json", { cache: "no-cache" });
      if (res.ok) {
        const data = await res.json();
        const items = (data.items || data).filter(valid);
        if (items.length) return { items, isSample: false };
      }
    } catch (_) { /* no manifest yet — fall through to samples */ }
    return { items: sampleLibrary(SAMPLE_COUNT), isSample: true };
  }

  function valid(it) {
    if (!it || !it.w || !it.h) {
      console.warn("[media] skipped a record without intrinsic w/h:", it);
      return false;
    }
    return true;
  }

  /* Pick the right file for the rendered size. Falls back gracefully
     when a record has no responsive set. */
  function srcFor(item, cssWidth, dpr) {
    if (!item.src) return null;
    const need = Math.ceil(cssWidth * (dpr || 1));
    if (item.widths) {
      const keys = Object.keys(item.widths).map(Number).sort((a, b) => a - b);
      const hit = keys.find((k) => k >= need);
      return item.widths[hit || keys[keys.length - 1]];
    }
    return need <= 700 && item.thumb ? item.thumb : item.src;
  }

  function srcsetFor(item) {
    if (!item.widths) return null;
    return Object.entries(item.widths)
      .map(([k, v]) => `${v} ${k}w`).join(", ");
  }

  /* Facets are derived, never declared — add a year or a category to the
     data and the filter bar grows by itself. */
  function facets(items) {
    const years = [...new Set(items.map((i) => i.year))].sort((a, b) => b - a);
    const cats = CATEGORIES.filter((c) => items.some((i) => i.category === c.id))
      .map((c) => ({ ...c, count: items.filter((i) => i.category === c.id).length }));
    const events = [...new Set(items.map((i) => i.event))].sort();
    return { years, cats, events };
  }

  /* Stable hash of a record id. Used only to pick stand-in artwork, so each
     photograph gets a different scene instead of every tile in a year band
     looking identical. Deterministic, so it never reshuffles between loads. */
  function hash(id) {
    let h = 2166136261;
    const s = String(id);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }

  const SCENES = ["attempt", "formation", "school", "heritage", "festival", "night", "green"];

  /* Markup for a stand-in scene, when a record has no file yet. */
  function artFor(item) {
    const h = hash(item.id);
    return { scene: SCENES[h % SCENES.length], seed: h % 9973 };
  }

  w.JWRCMedia = { load, facets, srcFor, srcsetFor, hash, artFor, CATEGORIES, SAMPLE_COUNT };
})(window);
