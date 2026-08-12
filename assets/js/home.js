/* ============================================================
   JWRC — landing page motion
   The hero crowd, the counters, the drawn glyphs and the reel.
   Everything here is additive: with JavaScript off the page is
   complete and readable, and every effect is skipped under
   prefers-reduced-motion.
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", () => {
    each(crowd, counters, glyphs, steps, reel);
  });

  /* run each piece independently: one failure must not take the page down */
  function each(...fns) {
    for (const fn of fns) {
      try { fn(); } catch (e) { console.error("[home]", fn.name, e); }
    }
  }

  /* ── The crowd ──────────────────────────────────────────────
     Every dot is a person. They arrive scattered, drift toward the
     formation they were assigned, and keep breathing once they get
     there — a crowd standing still is still moving.

     Drawn on a canvas rather than as DOM nodes because there are ~380
     of them: 380 elements would cost a layout pass per frame, one
     canvas costs a single paint. Density scales with viewport area, so
     a phone draws a fraction of what a desktop does. */
  function crowd() {
    const cvs = $("#crowd-canvas");
    if (!cvs) return;
    const ctx = cvs.getContext("2d", { alpha: true });
    if (!ctx) return;

    const DPR = Math.min(devicePixelRatio || 1, 2);
    let w = 0, h = 0, pts = [], raf = 0, running = true, t0 = performance.now();

    function build() {
      const box = cvs.parentElement.getBoundingClientRect();
      w = Math.max(1, box.width); h = Math.max(1, box.height);
      cvs.width = Math.round(w * DPR); cvs.height = Math.round(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      // one dot per ~2,600px² of hero, clamped so neither extreme is silly
      const n = Math.round(Math.min(460, Math.max(90, (w * h) / 2600)));
      const cols = Math.ceil(Math.sqrt(n * (w / h)));
      const rows = Math.ceil(n / cols);
      const gx = w / (cols + 1), gy = h / (rows + 1);

      pts = [];
      for (let i = 0; i < n; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        // the formation: a loose grid, jittered so it reads as people
        // standing on markers rather than as a printed lattice
        const tx = gx * (c + 1) + (Math.random() - .5) * gx * .5;
        const ty = gy * (r + 1) + (Math.random() - .5) * gy * .5;
        pts.push({
          x: Math.random() * w, y: Math.random() * h,   // where they arrive
          tx, ty,                                       // where they belong
          ph: Math.random() * Math.PI * 2,              // breathing offset
          sp: .012 + Math.random() * .022,              // how fast they settle
          r: .9 + Math.random() * 1.5,
          warm: Math.random() < .18,                    // a few carry the flame
        });
      }
    }

    function frame(now) {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += (p.tx - p.x) * p.sp;
        p.y += (p.ty - p.y) * p.sp;
        // once settled they sway a little, out of phase with each other
        const bx = Math.sin(t * .55 + p.ph) * 2.4;
        const by = Math.cos(t * .43 + p.ph) * 2.0;
        ctx.beginPath();
        ctx.arc(p.x + bx, p.y + by, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.warm ? "rgba(244,129,58,.85)" : "rgba(252,248,240,.42)";
        ctx.fill();
      }
      if (running) raf = requestAnimationFrame(frame);
    }

    build();
    if (REDUCED) {
      // a single settled frame: the image, without the movement
      for (const p of pts) { p.x = p.tx; p.y = p.ty; }
      running = false;
      frame(performance.now());
      return;
    }
    raf = requestAnimationFrame(frame);

    // stop entirely when the hero is off-screen — a canvas painting behind
    // the fold is pure waste, and this page scrolls a long way past it
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; t0 = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    }, { threshold: 0 }).observe(cvs.parentElement);

    let rt;
    addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(build, 220); }, { passive: true });
  }

  /* ── Counters ───────────────────────────────────────────────
     en-US grouping, to match how the figures are written in the record
     books (508,603 rather than 5,08,603). Each figure is observed on its
     own so one far down the reel still animates when it is reached. */
  function counters() {
    const els = $$("[data-num]");
    if (!els.length) return;
    const fmt = (n) => n.toLocaleString("en-US");
    const run = (el) => {
      const target = parseFloat(el.dataset.num);
      if (!isFinite(target)) return;
      if (REDUCED) { el.textContent = fmt(target); return; }
      const dur = 1800, t0 = performance.now();
      (function step(t) {
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    };
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.4 });
    els.forEach((el) => io.observe(el));
  }

  /* ── Glyphs ─────────────────────────────────────────────────
     The three value marks draw themselves in. Pure CSS dash animation,
     so it costs nothing and needs no plugin. */
  function glyphs() {
    const paths = $$(".v-glyph .dr");
    if (!paths.length || REDUCED) return;
    for (const p of paths) {
      const len = p.getTotalLength ? p.getTotalLength() : 200;
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      p.style.transition = "stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)";
    }
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        $$(".dr", e.target).forEach((p, i) => {
          setTimeout(() => { p.style.strokeDashoffset = "0"; }, i * 140);
        });
        io.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    $$(".value").forEach((v) => io.observe(v));
  }

  /* ── Method steps ───────────────────────────────────────────
     The rule above each step fills as it comes into view, so reading
     down the six of them feels like following a line. */
  function steps() {
    const items = $$(".steps li");
    if (!items.length) return;
    if (REDUCED) { items.forEach((li) => li.classList.add("is-in")); return; }
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { threshold: 0.35, rootMargin: "0px 0px -8% 0px" });
    items.forEach((li) => io.observe(li));
  }

  /* ── The record reel ────────────────────────────────────────
     Each card carries its own photograph as a held-back backdrop. The
     path is set from a data attribute rather than in the stylesheet so
     the markup stays the single source of which picture belongs to
     which record. */
  function reel() {
    /* A url() inside a custom property is resolved against the stylesheet
       that *consumes* it, not the document — so a path relative to the page
       would be fetched from assets/css/. Resolving it here makes it absolute
       and independent of where the rule happens to live. */
    for (const card of $$(".rcard")) {
      const shot = card.dataset.shot;
      if (!shot) continue;
      const url = new URL(shot, document.baseURI).href;
      card.style.setProperty("--shot", `url("${url}")`);
    }

    /* Cards are reachable and openable by keyboard, and the reel scrolls
       to whichever one takes focus. */
    const track = $("#reel-track");
    if (!track) return;
    track.setAttribute("role", "list");
    $$(".rcard", track).forEach((c) => {
      c.setAttribute("role", "listitem");
      c.tabIndex = 0;
    });
    track.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const cards = $$(".rcard", track);
      const i = cards.indexOf(document.activeElement);
      if (i < 0) return;
      const next = cards[i + (e.key === "ArrowRight" ? 1 : -1)];
      if (next) { next.focus(); e.preventDefault(); }
    });
  }
})();
