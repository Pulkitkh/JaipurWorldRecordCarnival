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

  document.addEventListener("DOMContentLoaded", boot);

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
    if (photos) { photos.dataset.count = items.length; photos.textContent = items.length.toLocaleString("en-IN"); }
    if (years) {
      const span = facets.years.length ? (Math.max(...facets.years) - Math.min(...facets.years) + 1) : 0;
      years.dataset.count = span; years.textContent = span;
    }

    const lightbox = new window.JWRCGallery.Lightbox($("#lightbox"));
    const gallery = new window.JWRCGallery.Gallery($("#mosaic"), {
      status: $("#gal-count"),
      onOpen: (i, view) => lightbox.open(i, view),
    });

    /* ── filter bar, built from derived facets ── */
    const q = { category: "all", year: "all", text: "" };

    const cats = $("#gal-cats");
    cats.innerHTML =
      `<button class="on" data-cat="all">Everything <em>${items.length}</em></button>` +
      facets.cats.map((c) =>
        `<button data-cat="${c.id}">${c.label} <em>${c.count}</em></button>`).join("");

    const yearSel = $("#gal-year");
    yearSel.innerHTML = '<option value="all">All years</option>' +
      facets.years.map((y) => `<option value="${y}">${y}</option>`).join("");

    cats.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      $$("button", cats).forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      q.category = b.dataset.cat;
      apply();
    });
    yearSel.addEventListener("change", () => { q.year = yearSel.value; apply(); });

    let t;
    $("#gal-q").addEventListener("input", (e) => {
      clearTimeout(t);
      t = setTimeout(() => { q.text = e.target.value; apply(); }, 180);
    });

    function apply() {
      gallery.filter(q);
      $("#gal-empty").classList.toggle("on", gallery.view.length === 0);
      buildTimeline(gallery.view);
    }

    gallery.setItems(items);

    /* ── featured rail ── */
    const rail = $("#featured-rail");
    const featured = items.filter((i) => i.featured).slice(0, 12);
    const pool = featured.length ? featured : items.slice(0, 12);
    rail.innerHTML = pool.map((it, i) => `
      <button class="rail-item" data-id="${it.id}" data-cursor="View">
        ${tileMedia(it, 320)}
        <span class="meta"><b>${esc(it.event)}</b><span>${it.year} · ${catLabel(it.category)}</span></span>
      </button>`).join("");
    if (window.JWRCArt) window.JWRCArt.build(rail);
    rail.addEventListener("click", (e) => {
      const b = e.target.closest(".rail-item");
      if (!b) return;
      const idx = pool.findIndex((x) => x.id === b.dataset.id);
      lightbox.open(idx, pool);
    });

    /* ── timeline view ── */
    const timeline = $("#timeline");

    function buildTimeline(view) {
      const byYear = new Map();
      view.forEach((it) => {
        if (!byYear.has(it.year)) byYear.set(it.year, []);
        byYear.get(it.year).push(it);
      });
      const ys = [...byYear.keys()].sort((a, b) => b - a);
      timeline.innerHTML = `<div class="years">` + ys.map((y, k) => {
        const list = byYear.get(y);
        return `<details class="year-band"${k === 0 ? " open" : ""} data-year="${y}">
          <summary>
            <span class="y">${y}</span>
            <span class="lbl">${uniqueEvents(list)}</span>
            <span class="rule"></span>
            <span class="n">${list.length} photographs</span>
            <i>+</i>
          </summary>
          <div class="year-strip" data-year="${y}"></div>
        </details>`;
      }).join("") + `</div>`;

      /* fill a band the first time it opens — nothing loads until asked for */
      $$("details.year-band", timeline).forEach((d) => {
        const fill = () => {
          const strip = $(".year-strip", d);
          if (strip.dataset.filled) return;
          strip.dataset.filled = "1";
          const list = byYear.get(+d.dataset.year);
          const shown = list.slice(0, 14);
          strip.innerHTML = shown.map((it, i) =>
            `<button class="ys" data-id="${it.id}" data-cursor="View">${tileMedia(it, 210)}</button>`).join("")
            + (list.length > shown.length
               ? `<button class="more" data-year="${d.dataset.year}">
                    +${list.length - shown.length} more<br><span style="color:var(--flame)">Open in mosaic</span>
                  </button>` : "");
          if (window.JWRCArt) window.JWRCArt.build(strip);
          strip.addEventListener("click", (e) => {
            const more = e.target.closest(".more");
            if (more) {
              yearSel.value = more.dataset.year; q.year = more.dataset.year;
              showMosaic(); apply();
              return;
            }
            const b = e.target.closest(".ys");
            if (!b) return;
            lightbox.open(list.findIndex((x) => x.id === b.dataset.id), list);
          });
        };
        if (d.open) fill();
        d.addEventListener("toggle", () => { if (d.open) fill(); }, { once: false });
      });
    }

    /* ── view switch ── */
    const bMos = $("#view-mosaic"), bTime = $("#view-time");
    function showMosaic() {
      bMos.classList.add("on"); bTime.classList.remove("on");
      $("#mosaic").hidden = false; timeline.hidden = true;
      gallery.layout();
    }
    function showTimeline() {
      bTime.classList.add("on"); bMos.classList.remove("on");
      $("#mosaic").hidden = true; timeline.hidden = false;
      gallery.unmountAll();
    }
    bMos.addEventListener("click", showMosaic);
    bTime.addEventListener("click", showTimeline);
    buildTimeline(items);

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
