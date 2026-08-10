/* ============================================================
   JWRC — About page controller
   Wires the media library to the archive engine. Knows nothing
   about how many photographs exist.
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DPR = Math.min(devicePixelRatio || 1, 2);

  document.addEventListener("DOMContentLoaded", () => { counters(); boot(); });

  /* ── Counters ───────────────────────────────────────────────
     Page-scoped on purpose. The shared motion system formats with
     en-IN grouping (5,08,603); this page quotes the figures the way
     they are written everywhere else in the record books (508,603),
     so it owns its own formatter. Each element is observed
     individually, so a figure far down the ledger still animates
     when it is finally reached. */
  function counters() {
    const els = $$("[data-num]");
    if (!els.length) return;
    const fmt = (n) => n.toLocaleString("en-US");
    const run = (el) => {
      const target = parseFloat(el.dataset.num);
      const suffix = el.dataset.suffix || "";
      if (!isFinite(target)) return;
      if (REDUCED) { el.textContent = fmt(target) + suffix; return; }
      const dur = 1900, t0 = performance.now();
      (function frame(t) {
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.round(target * e)) + suffix;
        if (p < 1) requestAnimationFrame(frame);
      })(t0);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        run(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.35, rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
  }

  async function boot() {
    const { items, isSample } = await window.JWRCMedia.load();
    const facets = window.JWRCMedia.facets(items);

    if (isSample) {
      console.info(
        `[archive] ${items.length} sample photographs in use. Drop media/manifest.json ` +
        `in place to switch to the real library — no code change needed.`);
    }

    /* headline numbers come from the data, never hardcoded */
    const photos = $("#stat-photos"), years = $("#stat-years");
    if (photos) { photos.textContent = items.length.toLocaleString("en-US"); }
    if (years) {
      const dated = facets.years.filter((y) => y > 0);
      const span = dated.length ? (Math.max(...dated) - Math.min(...dated) + 1) : 0;
      years.textContent = span;
    }

    const lightbox = new window.JWRCGallery.Lightbox($("#lightbox"));
    const gallery = new window.JWRCGallery.Gallery($("#mosaic"), {
      status: $("#gal-count"),
      pager: $("#gal-pager"),
      perPage: 24,
      onOpen: (i, view) => lightbox.open(i, view),
    });
    $("#gal-pager").addEventListener("click", (e) => {
      const b = e.target.closest("[data-go]");
      if (b && !b.disabled) gallery.goTo(+b.dataset.go);
    });

    /* ── filter bar, built from derived facets ── */
    const q = { category: "all", text: "" };

    const cats = $("#gal-cats");
    cats.innerHTML =
      `<button class="on" data-cat="all">Everything <em>${items.length}</em></button>` +
      facets.cats.map((c) =>
        `<button data-cat="${c.id}">${c.label} <em>${c.count}</em></button>`).join("");


    cats.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      $$("button", cats).forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      q.category = b.dataset.cat;
      apply();
    });

    let t;
    $("#gal-q").addEventListener("input", (e) => {
      clearTimeout(t);
      t = setTimeout(() => { q.text = e.target.value; apply(); }, 180);
    });

    function apply() {
      gallery.filter(q);
      $("#gal-empty").classList.toggle("on", gallery.matched.length === 0);
    }

    gallery.setItems(items);

    /* ── featured rail ── */
    const rail = $("#featured-rail");
    const featured = items.filter((i) => i.featured).slice(0, 12);
    const pool = featured.length ? featured : items.slice(0, 12);
    rail.innerHTML = pool.map((it, i) => `
      <button class="rail-item" data-id="${it.id}" data-cursor="View">
        ${tileMedia(it, 320)}
        <span class="meta"><b>${esc(it.event)}</b><span>${it.year || "Undated"} · ${catLabel(it.category)}</span></span>
      </button>`).join("");
    if (window.JWRCArt) window.JWRCArt.build(rail);
    rail.addEventListener("click", (e) => {
      const b = e.target.closest(".rail-item");
      if (!b) return;
      const idx = pool.findIndex((x) => x.id === b.dataset.id);
      lightbox.open(idx, pool);
    });

    /* ── deep link: /about.html#photo=<id> opens that photograph ── */
    const hash = decodeURIComponent(location.hash.replace("#photo=", ""));
    if (hash) {
      const idx = items.findIndex((x) => x.id === hash);
      if (idx > -1) setTimeout(() => lightbox.open(idx, items), 600);
    }

    /* helpers -------------------------------------------------- */
    function tileMedia(it, px) {
      const url = window.JWRCMedia.srcFor(it, px, DPR);
      if (url) {
        const set = window.JWRCMedia.srcsetFor(it);
        return `<img src="${url}"${set ? ` srcset="${set}" sizes="${px}px"` : ""}
                 alt="${esc(it.alt)}" loading="lazy" decoding="async">`;
      }
      const art = window.JWRCMedia.artFor(it);
      return `<span class="scene" data-scene="${art.scene}" data-seed="${art.seed}"></span>`;
    }
    function uniqueEvents(list) {
      const n = new Set(list.map((i) => i.event)).size;
      return n === 1 ? "1 event" : `${n} events`;
    }
    function catLabel(id) {
      const c = window.JWRCMedia.CATEGORIES.find((x) => x.id === id);
      return c ? c.label : id;
    }
    function esc(s) {
      return String(s || "").replace(/[&<>"]/g, (m) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
    }
  }
})();
