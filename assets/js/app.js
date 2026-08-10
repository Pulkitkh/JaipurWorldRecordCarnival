/* ============================================================
   JWRC — site behaviour
   Shared chrome, scroll choreography, and the interactive modules
   (records archive, stories slider, enquiry wizard).
   ============================================================ */
(function () {
  "use strict";

  const D = window.JWRCData;
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* Single-page site: the nav scrolls, it does not navigate. */
  const NAV = [
    ["#story", "The Story"],
    ["#records", "Records"],
    ["#housing", "Housing"],
    ["#archive", "Archive"],
    ["#contact", "Contact"],
  ];

  const ARROW = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor"
    stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5h9M7 2.5l4 4-4 4"/></svg>`;

  const MARK = `<svg class="mark" viewBox="0 0 40 40" aria-hidden="true">
    <path d="M20 1.6c-1.7 2.3-.5 3.6.5 4.4" stroke="#E8461C" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M4 39V19.6C4 11 11.2 4.2 20 4.2S36 11 36 19.6V39z" fill="#E8461C"/>
    <g fill="#FCF8F0">
      <path d="M20 10.8c2.5 0 4.5 2 4.5 4.5v3.8h-9v-3.8c0-2.5 2-4.5 4.5-4.5z"/>
      <rect x="8.6" y="24" width="6.3" height="9.4" rx="3.15"/>
      <rect x="16.85" y="24" width="6.3" height="9.4" rx="3.15"/>
      <rect x="25.1" y="24" width="6.3" height="9.4" rx="3.15"/>
    </g>
    <circle cx="30.6" cy="14.4" r="4" fill="#2C6E80"/>
    <path d="M27.3 13.4c1.7.7 3.3-.5 4.9.3" stroke="#7FBF4F" stroke-width="1.1" fill="none" stroke-linecap="round"/>
  </svg>`;

  const DEFS = `<svg class="defs" aria-hidden="true"><defs>
    <clipPath id="jw-arch" clipPathUnits="objectBoundingBox">
      <path d="M0,1 V0.44 C0,0.19 0.22,0 0.5,0 C0.78,0 1,0.19 1,0.44 V1 Z"/>
    </clipPath>
    <clipPath id="jw-cusp" clipPathUnits="objectBoundingBox">
      <path d="M0,1 V0.46 Q0.015,0.315 0.125,0.275 Q0.155,0.135 0.288,0.142
               Q0.34,0.028 0.5,0 Q0.66,0.028 0.712,0.142 Q0.845,0.135 0.875,0.275
               Q0.985,0.315 1,0.46 V1 Z"/>
    </clipPath>
  </defs></svg>`;

  /* ---------- chrome ---------- */

  function logo(cls) {
    return `<a class="logo ${cls || ""}" href="index.html" aria-label="Jaipur World Record Carnival, home">
      ${MARK}<span><span class="l1">Jaipur</span><span class="l2">World Record Carnival</span></span></a>`;
  }

  function mountChrome() {
    const links = NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join("");

    document.body.insertAdjacentHTML("afterbegin", `
      ${DEFS}
      <div id="progress"></div>
      <nav class="nav" id="nav">
        ${logo()}
        <div class="nav-links">${links}</div>
        <a class="btn sm" href="#contact">Get in touch ${ARROW}</a>
        <button class="burger" id="burger" aria-label="Menu" aria-expanded="false"><i></i><i></i><i></i></button>
      </nav>
      <div class="drawer" id="drawer">
        ${NAV.map(([h, t], i) =>
          `<a href="${h}"><span class="n">0${i + 1}</span>${t}</a>`).join("")}
        <a href="tel:+918003003000" class="btn mt-m" style="justify-content:center">
          Call +91 80030 03000 ${ARROW}</a>
      </div>`);

    document.body.insertAdjacentHTML("beforeend", `
      <div class="blockprint"></div>
      <footer class="foot pad-sm">
        <div class="wrap">
          <div class="grid" style="grid-template-columns:1.7fr 1fr 1.3fr;gap:44px">
            <div>
              ${logo("on-dark")}
              <p class="mt-m" style="max-width:36ch;font-size:15px;color:rgba(252,248,240,.6)">
                Multiple world record holder, entrepreneur and social visionary.
                Founder of the Jaipur World Record Carnival.</p>
              <p style="font-family:var(--display);font-style:italic;font-size:17px;color:var(--gold);margin-top:20px">
                “Find your passion, and it’s no longer work.”</p>
            </div>
            <div><h4>On this page</h4>
              ${NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}</div>
            <div><h4>Reach us</h4>
              <a href="tel:+918003003000">+91 80030 03000</a>
              <a href="mailto:manmohan.agarwal015@gmail.com">manmohan.agarwal015@gmail.com</a>
              <a href="#">Jaipur, Rajasthan, India</a>
              <div class="creds mt-m">${["Guinness", "Limca", "India Book"]
                .map(c => `<span class="cred" style="font-size:10px;padding:8px 12px">${c}</span>`).join("")}</div>
            </div>
          </div>
          <div class="bottom">
            <span>© 2026 Manmohan Agarwal · Jaipur World Record Carnival®</span>
            <span class="deva">पधारो म्हारे देस — you are always welcome here.</span>
          </div>
        </div>
      </footer>
      <button id="totop" aria-label="Back to top">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5"/></svg>
      </button>`);

    // drawer
    const burger = $("#burger"), drawer = $("#drawer");
    burger.addEventListener("click", () => {
      const open = drawer.classList.toggle("open");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("is-locked", open);
    });

    drawer.addEventListener("click", (e) => {
      if (!e.target.closest("a")) return;
      drawer.classList.remove("open");
      burger.classList.remove("open");
      document.body.classList.remove("is-locked");
    });

    $("#totop").addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" }));
  }

  /* ---------- scroll choreography ---------- */

  function scrollFx() {
    const nav = $("#nav"), bar = $("#progress"), top = $("#totop");
    let tick = false;
    function run() {
      const y = window.scrollY;
      const max = document.body.scrollHeight - innerHeight;
      nav.classList.toggle("scrolled", y > 40);
      bar.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
      top.classList.toggle("on", y > 700);
      tick = false;
    }
    addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(run); } }, { passive: true });
    run();
  }

  /* Entrance choreography lives in motion.js. This observer exists only to
     build the mandana crowd once it is about to come into view. */
  function reveals() {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        crowd(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px 10% 0px" });
    $$(".crowdwrap").forEach(el => io.observe(el));
  }

  /* crowd of dots settling into a mandana rosette */
  function crowd(el) {
    const svg = $("svg", el);
    if (!svg || svg.dataset.built) return;
    svg.dataset.built = "1";
    const W = 1200, H = 210, cx = 600, cy = 104;
    let out = "", n = 0;
    for (let i = 0; i < 560; i++) {
      const x = (i * 97.13) % W, y = (i * 53.77) % H;
      const d = Math.hypot(x - cx, (y - cy) * 2.4) / 640;
      out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.4 + (i % 3) * .35).toFixed(2)}"
               fill="#FCF8F0" style="--d:${(n++ * 1.4).toFixed(0)}ms;--o:${(.09 + d * .3).toFixed(2)}"/>`;
    }
    for (let ring = 1; ring <= 5; ring++) {
      const k = ring * 12, rad = ring * 17;
      for (let i = 0; i < k; i++) {
        const a = (i / k) * Math.PI * 2, wob = 1 + .14 * Math.cos(a * 8);
        out += `<circle cx="${(cx + Math.cos(a) * rad * wob * 2.3).toFixed(1)}"
                 cy="${(cy + Math.sin(a) * rad * wob).toFixed(1)}" r="2.6"
                 style="--d:${(700 + ring * 90 + i * 6).toFixed(0)}ms;--o:.95"
                 fill="${ring % 2 ? "#E8461C" : "#D9A441"}"/>`;
      }
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      out += `<circle cx="${(cx + Math.cos(a) * 21 * 2.3).toFixed(1)}" cy="${(cy + Math.sin(a) * 21).toFixed(1)}"
               r="3.6" fill="#FCF8F0" style="--d:${1250 + i * 30}ms;--o:1"/>`;
    }
    out += `<circle cx="${cx}" cy="${cy}" r="5.4" fill="#E8461C" style="--d:1500ms;--o:1"/>`;
    svg.innerHTML = out;
    $$("circle", svg).forEach((c) => {
      if (REDUCED) { c.style.opacity = c.style.getPropertyValue("--o") || 1; return; }
      c.style.animation = "dotin .6s var(--ease-out) forwards";
      c.style.animationDelay = c.style.getPropertyValue("--d");
    });
  }

  /* ---------- records archive ---------- */

  function recordCard(r) {
    return `<article class="rec zoom" tabindex="0" role="button" data-id="${r.id}" data-body="${r.body}" data-cause="${r.cause}">
      <span class="scene r32" data-scene="${r.scene}" data-seed="${r.id.slice(1) * 17 + 5}"></span>
      <span class="in">
        <span class="cat">${r.cause} · ${r.year}</span>
        <h3>${r.title}</h3>
        <p>${r.blurb}</p>
        <span class="row"><span>${r.body}</span><span><b>${r.participants.toLocaleString("en-IN")}</b> participants</span></span>
      </span></article>`;
  }

  function archive() {
    const grid = $("#recgrid");
    if (!grid || !D) return;
    grid.innerHTML = D.RECORDS.map(recordCard).join("");
    window.JWRCArt.build(grid);

    // filters
    $$("#recfilters .chip").forEach(btn => {
      btn.addEventListener("click", () => {
        $$("#recfilters .chip").forEach(b => b.classList.remove("on"));
        btn.classList.add("on");
        const k = btn.dataset.filter, v = btn.dataset.value;
        let shown = 0;
        document.dispatchEvent(new CustomEvent("jwrc:filter-start"));
        $$(".rec", grid).forEach(c => {
          const ok = !k || c.dataset[k] === v;
          c.classList.toggle("hide", !ok);
          if (ok) shown++;
        });
        document.dispatchEvent(new CustomEvent("jwrc:filter-end"));
        const empty = $("#recempty");
        if (empty) empty.style.display = shown ? "none" : "block";
      });
    });

    // detail modal
    const modal = $("#recmodal");
    grid.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        const c = e.target.closest(".rec");
        if (c) { e.preventDefault(); c.click(); }
      }
    });
    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".rec");
      if (!card) return;
      const r = D.RECORDS.find(x => x.id === card.dataset.id);
      if (!r) return;
      $("#modalbody").innerHTML = `
        <span class="scene r169" data-scene="${r.scene}" data-seed="${r.id.slice(1) * 23 + 9}"></span>
        <div class="body">
          <span class="eyebrow">${r.body} · ${r.cause}</span>
          <h2 class="mt-m" style="max-width:20ch">${r.title}</h2>
          <p class="lede mt-s">${r.blurb}</p>
          <div class="meta">
            <div><div class="a">Participants</div><div class="b">${r.participants.toLocaleString("en-IN")}</div></div>
            <div><div class="a">Volunteers</div><div class="b">${r.volunteers}</div></div>
            <div><div class="a">Institutions</div><div class="b">${r.institutions}</div></div>
            <div><div class="a">Date</div><div class="b" style="font-size:17px">${r.date}</div></div>
          </div>
          <p>${r.story}</p>
          <blockquote style="margin:28px 0 0;padding-left:26px;border-left:3px solid var(--flame);
            font-family:var(--display);font-style:italic;font-size:21px;line-height:1.4">
            “${r.quote}”
            <span style="display:block;font:500 11px/1 var(--body);letter-spacing:.16em;text-transform:uppercase;
              color:var(--ink-faint);margin-top:14px;font-style:normal">${r.quoteBy}</span>
          </blockquote>
          <p style="font-size:12.5px;color:var(--ink-faint);margin-top:28px">
            Venue: ${r.venue}. This entry is illustrative demo content.</p>
        </div>`;
      window.JWRCArt.build($("#modalbody"));
      modal.classList.add("open");
      document.body.classList.add("is-locked");
    });

    function close() { modal.classList.remove("open"); document.body.classList.remove("is-locked"); }
    $(".x", modal).addEventListener("click", close);
    modal.addEventListener("click", e => { if (e.target === modal) close(); });
    addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  }

  /* ---------- stories slider ---------- */

  function slider() {
    const root = $("#stories");
    if (!root || !D) return;
    const track = $(".slides", root);
    track.innerHTML = D.STORIES.map(s => `
      <div class="slide">
        <div class="split center gl">
          <div>
            <p class="q">“${s.quote}”</p>
            <div class="flex center gs mt-l">
              <span class="portrait" data-seed="${s.seed}" style="width:56px;flex:none;
                border-radius:50%;overflow:hidden"></span>
              <span>
                <span style="display:block;font-weight:600">${s.name}</span>
                <span style="display:block;font-size:13px;color:rgba(252,248,240,.55)">${s.role}</span>
              </span>
            </div>
          </div>
          <div class="frame on-dark"><span class="in"><span class="scene r43"
            data-scene="${["attempt","festival","school","heritage","night"][s.seed % 5]}"
            data-seed="${s.seed}"></span></span></div>
        </div>
      </div>`).join("");
    window.JWRCArt.build(track);

    const dots = $("#sdots");
    dots.innerHTML = D.STORIES.map((_, i) =>
      `<button class="dot${i ? "" : " on"}" aria-label="Story ${i + 1}"></button>`).join("");

    let i = 0, timer;
    function go(n) {
      i = (n + D.STORIES.length) % D.STORIES.length;
      track.style.transform = `translateX(-${i * 100}%)`;
      $$(".dot", dots).forEach((d, k) => d.classList.toggle("on", k === i));
    }
    $$(".dot", dots).forEach((d, k) => d.addEventListener("click", () => { go(k); restart(); }));
    $("#sprev").addEventListener("click", () => { go(i - 1); restart(); });
    $("#snext").addEventListener("click", () => { go(i + 1); restart(); });
    function restart() { clearInterval(timer); if (!REDUCED) timer = setInterval(() => go(i + 1), 7000); }
    restart();
  }

  /* ---------- enquiry wizard ---------- */

  function wizard() {
    const form = $("#enquiry");
    if (!form) return;
    const steps = $$(".fstep", form);
    const bars = $$(".formsteps i", form);
    let cur = 0;

    // path picker
    $$(".pathpick button", form).forEach(b => b.addEventListener("click", () => {
      $$(".pathpick button", form).forEach(x => x.classList.remove("on"));
      b.classList.add("on");
      const t = $("#pathnote");
      if (t) t.textContent = b.dataset.note || "";
    }));

    function show(n) {
      cur = n;
      steps.forEach((s, k) => s.classList.toggle("on", k === n));
      bars.forEach((b, k) => b.classList.toggle("on", k <= n));
      form.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" });
    }

    function valid(step) {
      let ok = true;
      $$("[data-req]", step).forEach(inp => {
        const wrap = inp.closest(".field");
        const v = inp.value.trim();
        let bad = !v;
        if (!bad && inp.type === "email") bad = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
        if (!bad && inp.type === "tel") bad = v.replace(/\D/g, "").length < 10;
        wrap.classList.toggle("err", bad);
        if (bad) ok = false;
      });
      return ok;
    }

    $$("[data-next]", form).forEach(b => b.addEventListener("click", () => {
      if (valid(steps[cur])) show(cur + 1);
    }));
    $$("[data-back]", form).forEach(b => b.addEventListener("click", () => show(cur - 1)));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!valid(steps[cur])) return;
      const name = ($("#f-name", form) || {}).value || "friend";
      const path = ($(".pathpick button.on", form) || {}).textContent || "";
      $("#wizbody").style.display = "none";
      const ok = $("#wizdone");
      ok.classList.add("on");
      $("#donename").textContent = name.split(" ")[0];
      $("#donepath").textContent = path.trim().toLowerCase();
      ok.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" });
    });

    $$("input,textarea", form).forEach(i =>
      i.addEventListener("input", () => i.closest(".field").classList.remove("err")));
  }

  /* ---------- upcoming events ---------- */

  function upcoming() {
    const el = $("#upcoming");
    if (!el || !D) return;
    el.innerHTML = D.UPCOMING.map((u, i) => `
      <article class="card zoom" style="padding:0;overflow:hidden">
        <span class="scene r32" data-scene="${u.scene}" data-seed="${(i + 3) * 41}"></span>
        <div style="padding:24px 24px 28px">
          <span class="num">${u.status}</span>
          <h3 style="font-size:21px">${u.title}</h3>
          <p class="mt-s">${u.when} · ${u.where}</p>
          <div class="row" style="display:flex;justify-content:space-between;gap:12px;margin-top:18px;
            padding-top:14px;border-top:1px solid var(--line);font-size:12.5px;color:var(--ink-faint)">
            <span>${u.cause}</span><span>${u.need}</span></div>
        </div>
      </article>`).join("");
    window.JWRCArt.build(el);
  }

  /* ---------- stats binding ---------- */

  function stats() {
    if (!D) return;
    $$("[data-stat]").forEach(el => {
      const v = D.STATS[el.dataset.stat];
      if (v != null) el.dataset.count = v;
    });
  }

  /* ---------- marquee ---------- */

  function marquee() {
    const t = $("#marquee .track");
    if (!t || !D) return;
    const items = D.BODIES.map(b => `<span class="it"><b>${b.name}</b> ${b.note}</span>`).join("");
    t.innerHTML = items + items;
  }

  /* ---------- boot ---------- */

  function preloadFallback() {
    const p = $("#preload");
    if (!p) return;
    if (!document.documentElement.classList.contains("no-motion")
        && !location.search.includes("nomotion") && !REDUCED) return;
    p.style.display = "none";
  }

  document.addEventListener("DOMContentLoaded", function () {
    mountChrome();
    if (window.JWRCArt) window.JWRCArt.build();
    stats(); marquee(); upcoming(); archive(); slider(); wizard();
    reveals(); scrollFx(); preloadFallback();
  });
})();

/* dot-in keyframe injected here so the CSS file stays declarative */
(function () {
  const s = document.createElement("style");
  s.textContent = "@keyframes dotin{from{opacity:0;transform:scale(.2)}to{opacity:var(--o,1);transform:none}}"
    + ".crowdwrap circle{transform-box:fill-box;transform-origin:center}";
  document.head.appendChild(s);
})();
