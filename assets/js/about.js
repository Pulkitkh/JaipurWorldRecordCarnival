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

  document.addEventListener("DOMContentLoaded", () => {
    try { counters(); } catch (e) { console.error("[counters]", e); }
    boot().catch((e) => {
      console.error("[archive] failed to build:", e);
      const s = $("#gal-count");
      if (s) s.textContent = "Archive unavailable";
    });
  });

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
    const pager = $("#gal-pager");
    if (pager) pager.addEventListener("click", (e) => {
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
    const search = $("#gal-q");
    if (search) search.addEventListener("input", (e) => {
      clearTimeout(t);
      t = setTimeout(() => { q.text = e.target.value; apply(); }, 180);
    });

    function apply() {
      gallery.filter(q);
      $("#gal-empty").classList.toggle("on", gallery.matched.length === 0);
    }

    gallery.setItems(items);

    exhibit(items);

    /* ── Featured carousel ─────────────────────────────────
       A slow, seamless drift rather than a slideshow: the track is
       duplicated once and translated continuously, so it loops with no
       jump and no empty edge. Cards lift as they cross the centre.
       It pauses on hover, on focus, and whenever it is off-screen. */
    const rail = $("#featured-rail");
    if (!rail) return;

    const featured = items.filter((i) => i.featured);
    const pool = featured.length >= 4 ? featured : items.slice(0, 10);

    const card = (it) => `
      <button class="rail-item" data-id="${it.id}" data-cursor="View"
              aria-label="${esc(it.event)}">
        ${tileMedia(it, 420)}
        <span class="meta">
          <b>${esc(it.event)}</b>
          <span>${esc(it.caption || catLabel(it.category))}</span>
        </span>
      </button>`;

    // two passes of the same set: the second is what the first scrolls into
    rail.innerHTML = pool.map(card).join("") + pool.map(card).join("");
    rail.setAttribute("aria-label", "Selected work");

    rail.addEventListener("click", (e) => {
      const b = e.target.closest(".rail-item");
      if (!b) return;
      const idx = pool.findIndex((x) => x.id === b.dataset.id);
      if (idx > -1) lightbox.open(idx, pool);
    });

    marquee(rail);

    function marquee(track) {
      if (REDUCED) { track.classList.add("is-static"); return; }
      let x = 0, last = performance.now(), raf = 0;
      let paused = false, visible = true;
      const SPEED = 26;                                   // px per second
      const half = () => track.scrollWidth / 2;

      function frame(now) {
        const dt = Math.min(64, now - last) / 1000;
        last = now;
        if (!paused && visible) {
          x -= SPEED * dt;
          if (-x >= half()) x += half();                  // seamless wrap
          track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
          depth(track);
        }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);

      const hold = () => { paused = true; };
      const release = () => { paused = false; last = performance.now(); };
      track.addEventListener("pointerenter", hold);
      track.addEventListener("pointerleave", release);
      track.addEventListener("focusin", hold);
      track.addEventListener("focusout", release);

      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        last = performance.now();
      }, { threshold: 0 }).observe(track.parentElement || track);
    }

    /* Cards nearest the centre of the viewport sit forward. Cheap: one
       read of the track rect, then pure arithmetic per card. */
    function depth(track) {
      const mid = innerWidth / 2;
      const kids = track.children;
      for (let i = 0; i < kids.length; i++) {
        const el = kids[i];
        const r = el.getBoundingClientRect();
        if (r.right < -200 || r.left > innerWidth + 200) continue;
        const d = Math.abs((r.left + r.width / 2) - mid) / (innerWidth / 2);
        const k = Math.max(0, 1 - d);
        el.style.setProperty("--lift", (k * k * 14).toFixed(2) + "px");
        el.style.setProperty("--scale", (1 + k * k * 0.045).toFixed(4));
        el.style.setProperty("--glow", (k * k).toFixed(3));
      }
    }

    /* ── deep link: /about.html#photo=<id> opens that photograph ── */
    const hash = decodeURIComponent(location.hash.replace("#photo=", ""));
    if (hash) {
      const idx = items.findIndex((x) => x.id === hash);
      if (idx > -1) setTimeout(() => lightbox.open(idx, items), 600);
    }

    /* ── The record exhibit ────────────────────────────────
       The ledger is the index; the panel beside it is the proof. As a
       row reaches the reading line the panel turns over to that record —
       its photograph if the archive holds one, otherwise a plate of the
       number itself. Hovering or focusing a row jumps straight to it.

       Five of the eleven records have photographs. The other six are not
       a failure state: a record with no picture yet still has a figure,
       and the figure is the thing that was certified. */
    function exhibit(all) {
      const panel = $(".exhibit-panel");
      const rows = $$(".rec-row");
      if (!panel || !rows.length) return;

      const stage = $(".ex-stage", panel);
      const shot = $(".ex-shot", panel);
      const img = $("img", shot);
      const plate = $(".ex-plate", panel);
      const numEl = $(".ex-num", plate);
      const unitEl = $(".ex-unit", plate);
      const idxEl = $(".ex-idx", panel);
      const txtEl = $(".ex-txt", panel);

      /* one photograph per record, chosen once: the featured frame for
         that event if there is one, else its first picture */
      const shotFor = {};
      for (const it of all) {
        const key = it.id.split("-")[0];
        if (!shotFor[key] || (it.featured && !shotFor[key].featured)) shotFor[key] = it;
      }

      let active = -1;
      function show(i) {
        if (i === active || !rows[i]) return;
        active = i;
        const row = rows[i];
        rows.forEach((r, n) => r.classList.toggle("is-on", n === i));

        const rec = row.dataset.rec;
        const pic = rec && shotFor[rec];
        idxEl.textContent = row.dataset.i;
        txtEl.textContent = $("h3", row) ? $("h3", row).textContent.trim() : "";

        if (pic) {
          const url = window.JWRCMedia.srcFor(pic, 430, DPR);
          if (url && img.getAttribute("src") !== url) {
            img.src = url;
            img.alt = pic.alt || "";
          }
          stage.classList.add("mode-shot");
          stage.classList.remove("mode-plate");
        } else {
          const b = $(".rec-n b", row), em = $(".rec-n em", row);
          numEl.textContent = b ? b.textContent.trim() : "";
          unitEl.textContent = em ? em.textContent.trim() : "";
          stage.classList.add("mode-plate");
          stage.classList.remove("mode-shot");
        }
      }

      /* the reading line is a third of the way down the viewport: the row
         crossing it is the one the eye is on */
      const io = new IntersectionObserver((entries) => {
        let best = null;
        for (const en of entries) if (en.isIntersecting) {
          if (!best || en.intersectionRatio > best.intersectionRatio) best = en;
        }
        if (best) show(rows.indexOf(best.target));
      }, { rootMargin: "-30% 0px -45% 0px", threshold: [0, 0.5, 1] });
      rows.forEach((r) => io.observe(r));

      /* pointing at a row is a stronger signal than scrolling past it */
      rows.forEach((r, i) => {
        r.addEventListener("pointerenter", () => show(i));
        r.addEventListener("focusin", () => show(i));
        r.tabIndex = 0;
      });

      show(0);
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
