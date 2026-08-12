/* ============================================================
   JWRC — motion system
   ------------------------------------------------------------
   One physics model, one timing language. Every module below is
   optional: it looks for its own elements and stays silent if the
   page doesn't have them.

   Disabled entirely by ?nomotion=1 (used by the capture harness)
   and by prefers-reduced-motion.
   ============================================================ */
(function () {
  "use strict";

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const OFF = REDUCED || location.search.includes("nomotion");
  const TOUCH = matchMedia("(hover: none)").matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  if (OFF) {
    document.documentElement.classList.add("no-motion");
    // make sure nothing stays invisible when motion is off
    $$("[data-anim], .split-target").forEach(el => { el.style.opacity = 1; el.style.transform = "none"; });
    return;
  }

  /* Register whatever actually loaded. Naming a plugin that failed to load
     throws a ReferenceError here, which used to abort the whole module — and
     because headlines start hidden for their reveal, a single missing vendor
     file blanked every headline on the page. Missing a plugin should cost its
     effect and nothing else. */
  gsap.registerPlugin(...[
    "ScrollTrigger", "SplitText", "DrawSVGPlugin", "CustomEase", "ScrollToPlugin", "Flip",
  ].map((n) => window[n]).filter(Boolean));
  document.documentElement.classList.add("has-motion");

  /* app.js injects the nav, footer and counter values on DOMContentLoaded and
     registers its listener first, so deferring here guarantees those elements
     exist before we animate or make them magnetic. */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  function init() {

  /* one shared easing language ------------------------------- */
  CustomEase.create("jw", "M0,0 C0.12,0 0.13,1 1,1");        // long, confident
  CustomEase.create("jwOut", "M0,0 C0.22,1 0.36,1 1,1");     // quick settle
  const EASE = "jw", EASE_OUT = "jwOut";

  /* ═══ 1 · Inertial smooth scroll (Lenis → ScrollTrigger) ═══ */
  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.6,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis;

  // anchor links ride the same easing
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]:not([href="#"])');
    if (!a) return;
    const t = document.querySelector(a.getAttribute("href"));
    if (!t) return;
    e.preventDefault();
    lenis.scrollTo(t, { offset: -90, duration: 1.4 });
  });

  /* ═══ 2 · Custom cursor: dot + spring ring + state labels ═══ */
  if (!TOUCH) {
    const cur = document.createElement("div");
    cur.className = "cursor";
    cur.innerHTML = '<i class="dot"></i><i class="ring"></i><span class="lbl"></span>';
    document.body.appendChild(cur);
    document.documentElement.classList.add("has-cursor");

    const dot = $(".dot", cur), ring = $(".ring", cur), lbl = $(".lbl", cur);
    const setDX = gsap.quickTo(dot, "x", { duration: .12, ease: "power3" });
    const setDY = gsap.quickTo(dot, "y", { duration: .12, ease: "power3" });
    const setRX = gsap.quickTo(ring, "x", { duration: .55, ease: "power3" });
    const setRY = gsap.quickTo(ring, "y", { duration: .55, ease: "power3" });
    const setLX = gsap.quickTo(lbl, "x", { duration: .5, ease: "power3" });
    const setLY = gsap.quickTo(lbl, "y", { duration: .5, ease: "power3" });

    let vis = false;
    addEventListener("mousemove", (e) => {
      if (!vis) { vis = true; gsap.to(cur, { autoAlpha: 1, duration: .3 }); }
      setDX(e.clientX); setDY(e.clientY);
      setRX(e.clientX); setRY(e.clientY);
      setLX(e.clientX); setLY(e.clientY);
    });
    addEventListener("mouseleave", () => { vis = false; gsap.to(cur, { autoAlpha: 0, duration: .3 }); });

    // state changes on hover
    const grow = (label) => {
      cur.classList.add("is-active");
      lbl.textContent = label || "";
      cur.classList.toggle("has-label", !!label);
    };
    const shrink = () => { cur.classList.remove("is-active", "has-label"); lbl.textContent = ""; };

    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest("[data-cursor], a, button, .rec, .moment, .card, input, textarea, select");
      if (!t) return;
      grow(t.dataset ? t.dataset.cursor : "");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest("[data-cursor], a, button, .rec, .moment, .card, input, textarea, select")) shrink();
    });
    addEventListener("mousedown", () => cur.classList.add("is-down"));
    addEventListener("mouseup", () => cur.classList.remove("is-down"));
  }

  /* ═══ 3 · Magnetic buttons and cards ═══ */
  if (!TOUCH) {
    $$(".btn, .sarrow, .chip, #totop, .logo").forEach((el) => {
      const strength = el.classList.contains("btn") ? .34 : .22;
      const xTo = gsap.quickTo(el, "x", { duration: .5, ease: "elastic.out(1, .45)" });
      const yTo = gsap.quickTo(el, "y", { duration: .5, ease: "elastic.out(1, .45)" });
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      });
      el.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
    });
  }

  /* ═══ 4 · Split-text reveals (line / word / char) ═══ */
  function splitReveal(el) {
    const mode = el.dataset.split || "lines";
    const split = new SplitText(el, {
      type: mode === "chars" ? "lines,words,chars" : mode === "words" ? "lines,words" : "lines",
      linesClass: "sp-line",
    });
    const targets = mode === "chars" ? split.chars : mode === "words" ? split.words : split.lines;
    gsap.set(el, { opacity: 1 });
    gsap.from(targets, {
      yPercent: 108,
      opacity: 0,
      filter: "blur(7px)",
      duration: mode === "chars" ? .9 : 1.15,
      ease: EASE,
      stagger: mode === "chars" ? .012 : mode === "words" ? .028 : .09,
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  }
  $$("[data-split]").forEach(splitReveal);

  /* ═══ 5 · Generic entrance choreography ═══ */
  $$("[data-anim]").forEach((el) => {
    const kind = el.dataset.anim || "up";
    const d = parseFloat(el.dataset.delay || 0);
    const from = { opacity: 0, duration: 1.05, ease: EASE, delay: d };
    if (kind === "up") from.y = 42;
    if (kind === "left") from.x = -48;
    if (kind === "right") from.x = 48;
    if (kind === "scale") { from.scale = .92; from.filter = "blur(6px)"; }
    if (kind === "clip") { from.clipPath = "inset(0 0 100% 0)"; from.opacity = 1; from.duration = 1.3; }
    gsap.from(el, { ...from, scrollTrigger: { trigger: el, start: "top 86%", once: true } });
  });

  // staggered groups
  $$("[data-stag]").forEach((el) => {
    gsap.from(el.children, {
      opacity: 0, y: 46, filter: "blur(5px)",
      duration: 1, ease: EASE, stagger: parseFloat(el.dataset.stag) || .11,
      scrollTrigger: { trigger: el, start: "top 84%", once: true },
    });
  });

  /* ═══ 6 · Cinematic hero: scroll-linked exit + mouse parallax ═══ */
  const hero = $(".hero");
  if (hero) {
    const bg = $(".hero-bg", hero), content = $(".hero .wrap", hero);
    gsap.timeline({
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: .8 },
    })
      .to(bg, { scale: 1.18, yPercent: 12, ease: "none" }, 0)
      .to(content, { yPercent: -28, opacity: 0, filter: "blur(9px)", ease: "none" }, 0);

    if (!TOUCH) {
      const px = gsap.quickTo(bg, "xPercent", { duration: 1.2, ease: "power3" });
      const py = gsap.quickTo(bg, "yPercent", { duration: 1.2, ease: "power3" });
      hero.addEventListener("mousemove", (e) => {
        const r = hero.getBoundingClientRect();
        px(((e.clientX - r.width / 2) / r.width) * -3.5);
        py(((e.clientY - r.height / 2) / r.height) * -2.5);
      });
    }
  }

  /* ═══ 7 · Breathers: scrubbed parallax + line reveal ═══ */
  $$(".breather").forEach((b) => {
    const sc = $(".scene", b), said = $(".said", b);
    gsap.fromTo(sc, { yPercent: -12, scale: 1.14 }, {
      yPercent: 12, scale: 1.14, ease: "none",
      scrollTrigger: { trigger: b, start: "top bottom", end: "bottom top", scrub: true },
    });
    if (said) {
      const s = new SplitText(said, { type: "lines", linesClass: "sp-line" });
      gsap.from(s.lines, {
        yPercent: 110, opacity: 0, duration: 1.2, ease: EASE, stagger: .11,
        scrollTrigger: { trigger: b, start: "top 62%", once: true },
      });
    }
  });

  /* ═══ 8 · Scrollytelling: pinned symbols, revealed one at a time ═══ */
  const symbols = $(".symbols");
  if (symbols && innerWidth > 900) {
    const rows = $$(".sym", symbols);
    gsap.set(rows, { opacity: .18 });
    rows.forEach((row, i) => {
      ScrollTrigger.create({
        trigger: row, start: "top 68%", end: "bottom 46%",
        onEnter: () => gsap.to(row, { opacity: 1, duration: .55, ease: EASE_OUT }),
        onLeaveBack: () => gsap.to(row, { opacity: .18, duration: .45 }),
      });
      gsap.from($(".k", row), {
        scale: .5, opacity: 0, duration: .8, ease: "back.out(2)",
        scrollTrigger: { trigger: row, start: "top 78%", once: true },
      });
    });
  }

  /* ═══ 9 · Horizontal pinned gallery (chapter four) ═══ */
  const rail = $("[data-hscroll]");
  if (rail && innerWidth > 900) {
    const track = $(".hs-track", rail);
    const dist = () => Math.max(0, track.scrollWidth - innerWidth + 120);
    gsap.to(track, {
      x: () => -dist(), ease: "none",
      scrollTrigger: {
        trigger: rail, start: "top top", end: () => "+=" + dist(),
        pin: true, scrub: .9, anticipatePin: 1, invalidateOnRefresh: true,
      },
    });
  }

  /* ═══ 10 · SVG path drawing, linked to scroll ═══ */
  $$("[data-draw] path, [data-draw] circle, [data-draw] line").forEach((p) => {
    gsap.fromTo(p, { drawSVG: "0%" }, {
      drawSVG: "100%", ease: "none",
      scrollTrigger: { trigger: p.closest("[data-draw]"), start: "top 82%", end: "bottom 55%", scrub: .7 },
    });
  });

  /* ═══ 11 · Hero particle field — a crowd that reacts to you ═══ */
  const canvas = innerWidth > 760 ? $("#field") : null;
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let W, H, pts = [], mouse = { x: -1e4, y: -1e4 }, raf;
    const COLS = ["#E8461C", "#D9A441", "#FCF8F0", "#F4813A"];
    function size() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = canvas.width = r.width * dpr; H = canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((r.width * r.height) / 14000);
      pts = Array.from({ length: Math.min(n, 150) }, () => ({
        x: Math.random() * r.width, y: Math.random() * r.height,
        vx: (Math.random() - .5) * .16, vy: (Math.random() - .5) * .16,
        r: 1 + Math.random() * 2.2, c: COLS[(Math.random() * COLS.length) | 0],
        a: .18 + Math.random() * .5,
      }));
    }
    function tick() {
      const r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      for (const p of pts) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 16000) {                       // gentle repulsion
          const f = (16000 - d2) / 16000 * .9;
          p.vx += (dx / Math.sqrt(d2 || 1)) * f * .5;
          p.vy += (dy / Math.sqrt(d2 || 1)) * f * .5;
        }
        p.vx *= .975; p.vy *= .975;
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = r.width + 10; if (p.x > r.width + 10) p.x = -10;
        if (p.y < -10) p.y = r.height + 10; if (p.y > r.height + 10) p.y = -10;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.284); ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    }
    size(); tick();
    addEventListener("resize", size);
    addEventListener("mousemove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    // stop painting when off-screen
    ScrollTrigger.create({
      trigger: canvas, start: "top bottom", end: "bottom top",
      onToggle: (s) => { if (s.isActive) { if (!raf) tick(); } else { cancelAnimationFrame(raf); raf = 0; } },
    });
  }

  /* ═══ 12 · Marquee driven by scroll velocity ═══ */
  const mq = $("#marquee .track");
  if (mq) {
    const loop = gsap.to(mq, { xPercent: -50, repeat: -1, duration: 26, ease: "none" });
    let vel = 0;
    ScrollTrigger.create({
      onUpdate: (self) => {
        vel = self.getVelocity();
        const scale = gsap.utils.clamp(-4, 4, 1 + Math.abs(vel) / 1400);
        loop.timeScale(vel < 0 ? -scale : scale);
        gsap.to(loop, { timeScale: vel < 0 ? -1 : 1, duration: .9, overwrite: true, delay: .1 });
      },
    });
  }

  /* ═══ 13 · 3D tilt with moving glare ═══ */
  if (!TOUCH) {
    $$(".card, .moment, .rec, .door, .craftcard").forEach((el) => {
      el.classList.add("tilt");
      const glare = document.createElement("i");
      glare.className = "glare";
      el.appendChild(glare);
      const rx = gsap.quickTo(el, "rotationX", { duration: .5, ease: "power3" });
      const ry = gsap.quickTo(el, "rotationY", { duration: .5, ease: "power3" });
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        rx((py - .5) * -7); ry((px - .5) * 9);
        glare.style.setProperty("--gx", px * 100 + "%");
        glare.style.setProperty("--gy", py * 100 + "%");
        gsap.to(glare, { opacity: .9, duration: .3 });
      });
      el.addEventListener("mouseleave", () => {
        rx(0); ry(0);
        gsap.to(glare, { opacity: 0, duration: .45 });
      });
    });
  }

  /* ═══ 14 · Odometer counters ═══ */
  $$("[data-stat], [data-count]").forEach((el) => {
    const target = parseFloat(el.dataset.count || el.textContent) || 0;
    if (!target) return;
    const suffix = el.dataset.suffix || "";
    const o = { v: 0 };
    gsap.to(o, {
      v: target, duration: 2.1, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
      onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString("en-IN") + suffix; },
    });
  });

  /* ═══ 15 · Clip-path image reveals ═══ */
  $$(".frame, .scene-reveal").forEach((el) => {
    gsap.from(el, {
      clipPath: "inset(0% 0% 100% 0%)", duration: 1.35, ease: EASE,
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
  });

  /* ═══ 16 · Scroll-spy chapter rail with progress ring ═══ */
  const chapters = $$("section[data-chapter], header[data-chapter]");
  if (chapters.length > 2 && innerWidth > 1100) {
    const railEl = document.createElement("nav");
    railEl.className = "chaprail";
    railEl.setAttribute("aria-label", "Chapters");
    railEl.innerHTML = chapters.map((c, i) =>
      `<button data-i="${i}"><span class="tick"></span><em>${c.dataset.chapter}</em></button>`).join("");
    document.body.appendChild(railEl);
    const btns = $$("button", railEl);
    btns.forEach((b, i) => b.addEventListener("click", () =>
      lenis.scrollTo(chapters[i], { offset: -70, duration: 1.5 })));
    chapters.forEach((c, i) => {
      ScrollTrigger.create({
        trigger: c, start: "top 48%", end: "bottom 48%",
        onToggle: (s) => btns[i].classList.toggle("on", s.isActive),
      });
    });
    gsap.from(railEl, { autoAlpha: 0, x: 20, duration: .8, delay: 1.4, ease: EASE });
  }

  /* ═══ 17 · Page transitions ═══ */
  const veil = document.createElement("div");
  veil.className = "veil";
  veil.innerHTML = "<i></i><i></i><i></i><i></i><i></i>";
  document.body.appendChild(veil);
  const bars = $$("i", veil);

  gsap.set(bars, { scaleY: 1, transformOrigin: "top" });
  gsap.to(bars, { scaleY: 0, duration: .85, ease: EASE, stagger: .06, delay: .1,
    onComplete: () => veil.classList.add("idle") });

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a) return;
    const url = a.getAttribute("href");
    if (!url || url.startsWith("#") || url.startsWith("mailto") || url.startsWith("tel")
        || a.target === "_blank" || /^https?:/i.test(url)) return;
    e.preventDefault();
    veil.classList.remove("idle");
    gsap.set(bars, { transformOrigin: "bottom" });
    gsap.to(bars, {
      scaleY: 1, duration: .6, ease: EASE_OUT, stagger: .05,
      onComplete: () => { location.href = url; },
    });
  });

  /* ═══ 18 · Preloader: mandana draws itself, then lifts ═══ */
  const pre = $("#preload");
  if (pre) {
    const paths = $$("#preload svg circle, #preload svg path");
    const tl = gsap.timeline();
    if (paths.length) {
      gsap.set(paths, { transformOrigin: "center" });
      tl.from(paths, { scale: 0, opacity: 0, duration: .5, ease: "back.out(2.2)", stagger: { each: .006, from: "center" } });
    }
    tl.to($(".cap", pre), { opacity: 1, y: 0, duration: .6, ease: EASE }, "-=.3")
      .to(pre, { yPercent: -100, duration: 1, ease: EASE, delay: .35,
        onComplete: () => { pre.style.display = "none"; ScrollTrigger.refresh(); } });
  }

  /* ═══ 19 · FLIP-animated archive filtering ═══ */
  const recgrid = $("#recgrid");
  if (recgrid) {
    let state = null;
    document.addEventListener("jwrc:filter-start", () => {
      state = Flip.getState($$(".rec", recgrid));
    });
    document.addEventListener("jwrc:filter-end", () => {
      if (!state) return;
      Flip.from(state, {
        duration: .72, ease: EASE_OUT, scale: true, absolute: true,
        stagger: .035,
        onEnter: (els) => gsap.fromTo(els,
          { opacity: 0, scale: .82, filter: "blur(6px)" },
          { opacity: 1, scale: 1, filter: "blur(0px)", duration: .6, ease: EASE_OUT, stagger: .045 }),
        onLeave: (els) => gsap.to(els,
          { opacity: 0, scale: .86, filter: "blur(6px)", duration: .35, ease: "power2.in" }),
      });
      state = null;
    });
  }

  /* ═══ 20 · Record detail: choreographed modal entrance ═══ */
  const modal = $("#recmodal");
  if (modal) {
    const sheet = $(".sheet", modal);
    const obs = new MutationObserver(() => {
      if (!modal.classList.contains("open")) return;
      gsap.fromTo(sheet, { y: 60, scale: .96, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: .75, ease: EASE_OUT });
      const bits = $$(".body > *", sheet);
      gsap.from(bits, { y: 26, opacity: 0, duration: .7, ease: EASE, stagger: .055, delay: .12 });
      const sc = $(".scene", sheet);
      if (sc) gsap.from(sc, { scale: 1.14, duration: 1.4, ease: EASE });
    });
    obs.observe(modal, { attributes: true, attributeFilter: ["class"] });
  }

  /* ═══ 21 · Timeline spine draws itself as you read ═══ */
  const spine = $(".tl-spine");
  if (spine) {
    gsap.fromTo(spine, { scaleY: 0 }, {
      scaleY: 1, transformOrigin: "top", ease: "none",
      scrollTrigger: { trigger: ".tl", start: "top 72%", end: "bottom 78%", scrub: .6 },
    });
    $$(".tl .ev").forEach((ev) => {
      gsap.from(ev, {
        opacity: 0, x: 28, duration: .9, ease: EASE,
        scrollTrigger: { trigger: ev, start: "top 84%", once: true },
      });
      const dot = document.createElement("i");
      dot.className = "ev-dot";
      ev.appendChild(dot);
      gsap.from(dot, {
        scale: 0, duration: .7, ease: "back.out(2.4)",
        scrollTrigger: { trigger: ev, start: "top 82%", once: true },
      });
    });
  }

  /* ═══ 22 · Essay: word-by-word pull quotes + reading progress ═══ */
  $$("blockquote, .pull").forEach((q) => {
    const sp = new SplitText(q, { type: "lines,words", linesClass: "sp-line" });
    gsap.from(sp.words, {
      opacity: .12, duration: .55, ease: "none", stagger: .028,
      scrollTrigger: { trigger: q, start: "top 82%", end: "bottom 62%", scrub: .5 },
    });
  });

  const essay = $(".essay .body");
  if (essay) {
    const ring = document.createElement("div");
    ring.className = "readring";
    ring.innerHTML = '<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19"/>'
      + '<circle cx="22" cy="22" r="19" class="p"/></svg><em>0%</em>';
    document.body.appendChild(ring);
    const p = $(".p", ring), num = $("em", ring);
    const C = 2 * Math.PI * 19;
    gsap.set(p, { strokeDasharray: C, strokeDashoffset: C });
    ScrollTrigger.create({
      trigger: essay, start: "top 70%", end: "bottom bottom",
      onUpdate: (self) => {
        gsap.set(p, { strokeDashoffset: C * (1 - self.progress) });
        num.textContent = Math.round(self.progress * 100) + "%";
      },
      onToggle: (self) => gsap.to(ring, { autoAlpha: self.isActive ? 1 : 0, duration: .4 }),
    });
    gsap.set(ring, { autoAlpha: 0 });
  }

  /* ═══ 23 · Enquiry wizard: step transitions + arrival burst ═══ */
  const wiz = $("#enquiry");
  if (wiz) {
    const obs = new MutationObserver((muts) => {
      muts.forEach((m) => {
        const el = m.target;
        if (el.classList.contains("fstep") && el.classList.contains("on")) {
          gsap.from(el.children, { y: 30, opacity: 0, duration: .65, ease: EASE, stagger: .06 });
        }
        if (el.id === "wizdone" && el.classList.contains("on")) burst(el);
      });
    });
    $$(".fstep, #wizdone", wiz).forEach(el =>
      obs.observe(el, { attributes: true, attributeFilter: ["class"] }));

    function burst(host) {
      gsap.from($(".tick", host), { scale: 0, rotate: -40, duration: .9, ease: "back.out(2.6)" });
      gsap.from($$("#wizdone > *:not(.tick)"), { y: 26, opacity: 0, duration: .7, ease: EASE, stagger: .07, delay: .15 });
      const wrap = document.createElement("div");
      wrap.className = "burst";
      host.appendChild(wrap);
      const cols = ["#E8461C", "#D9A441", "#FCF8F0", "#2C6E80"];
      for (let i = 0; i < 34; i++) {
        const d = document.createElement("i");
        d.style.background = cols[i % cols.length];
        wrap.appendChild(d);
        const a = (i / 34) * Math.PI * 2, r = 90 + Math.random() * 150;
        gsap.fromTo(d, { x: 0, y: 0, scale: 0, opacity: 1 }, {
          x: Math.cos(a) * r, y: Math.sin(a) * r - 40,
          scale: .5 + Math.random(), opacity: 0, rotate: Math.random() * 360,
          duration: 1.1 + Math.random() * .7, ease: "power2.out", delay: i * .008,
          onComplete: () => d.remove(),
        });
      }
    }
  }

  /* keep pinning honest when fonts/art land late */
  addEventListener("load", () => ScrollTrigger.refresh());
  setTimeout(() => ScrollTrigger.refresh(), 1200);
  }
})();
