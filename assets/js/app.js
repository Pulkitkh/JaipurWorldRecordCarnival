/* ============================================================
   JWRC — site behaviour
   The shared chrome — nav, drawer, footer, scroll progress — and
   nothing else.

   This file used to carry six modules built for the demo pages that
   were removed long ago: a records archive, a stories slider, an
   enquiry wizard, an upcoming list, a stats grid and a marquee. Every
   element they bound to had gone, so they ran and silently did
   nothing on every page — until the take-part form was given the id
   the wizard was still looking for, and the wizard broke it. Dead
   code is not free; it waits.
   ============================================================ */
(function () {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* Four pages, so the nav is built per page: anchors into the page you
     are already on stay bare and scroll, links to the other pages carry
     their filename. Every page carries a route to every other one, so no
     page is ever a dead end.

     Both the home and founder pages used to point at a local #records
     section. Those sections still exist and still say what they said —
     but the records now have a page of their own, and that is where the
     word in the nav should take somebody. */
  const PAGES = {
    home: [
      ["#gather", "Why we gather"],
      ["#build", "What we build"],
      ["records.html", "The records"],
      ["take-part.html", "Take part"],
      ["about.html", "The Founder"],
    ],
    about: [
      ["#story", "The Story"],
      ["#housing", "Housing"],
      ["#archive", "Archive"],
      ["records.html", "The records"],
      ["take-part.html", "Take part"],
      ["index.html", "The Carnival"],
    ],
    take: [
      ["#who", "Who it is for"],
      ["#how", "How it works"],
      ["#takes", "What it takes"],
      ["records.html", "The records"],
      ["index.html", "The Carnival"],
      ["about.html", "The Founder"],
    ],
    records: [
      ["#gathered", "Gathered"],
      ["#built", "Built"],
      ["#drawn", "Drawn by hand"],
      ["#proof", "The evidence"],
      ["index.html", "The Carnival"],
      ["about.html", "The Founder"],
    ],
  };
  const HERE = /take-part\.html$/.test(location.pathname) ? "take"
             : /records\.html$/.test(location.pathname) ? "records"
             : /about\.html$/.test(location.pathname) ? "about"
             : "home";
  const NAV = PAGES[HERE];
  const CONTACT = HERE === "take" ? "#start" : "take-part.html#start";

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

  /* The nav is position:sticky, so it occupies layout space — injecting it
     after first paint pushed the whole page down 74px and was worth about
     0.05 of CLS on its own. It is now written during parse, from a script
     placed immediately after <body> opens, so the space exists before
     anything is painted. The footer still waits for DOMContentLoaded,
     because appending it early would put it above the page content. */
  function mountNav() {
    const links = NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join("");

    /* The skip link has to stay the very first tab stop, so the chrome is
       inserted after it rather than at the top of <body>. */
    const skip = document.querySelector(".skip");
    const at = skip ? [skip, "afterend"] : [document.body, "afterbegin"];
    at[0].insertAdjacentHTML(at[1], `
      ${DEFS}
      <div id="progress"></div>
      <nav class="nav" id="nav">
        ${logo()}
        <div class="nav-links">${links}</div>
        <a class="btn sm" href="${CONTACT}">Take part ${ARROW}</a>
        <button class="burger" id="burger" aria-label="Menu" aria-expanded="false"><i></i><i></i><i></i></button>
      </nav>
      <div class="drawer" id="drawer">
        ${NAV.map(([h, t], i) =>
          `<a href="${h}"><span class="n">0${i + 1}</span>${t}</a>`).join("")}
        <a href="${CONTACT}" class="btn mt-m" style="justify-content:center">
          Take part ${ARROW}</a>
        <a href="tel:+918003003000" class="btn ghost" style="justify-content:center;margin-top:10px">
          Call +91 80030 03000</a>
      </div>`);
  }

  function mountFooter() {
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
            <nav aria-label="Sections of this page"><h4>On this page</h4>
              ${NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}</nav>
            <div><h4>Reach us</h4>
              <a href="tel:+918003003000">+91 80030 03000</a>
              <a href="mailto:manmohan.agarwal015@gmail.com">manmohan.agarwal015@gmail.com</a>
              <!-- an address is information, not a destination: it was an
                   href="#" that scrolled the reader back to the top -->
              <p class="where">Jaipur, Rajasthan, India</p>
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

  }

  function wireChrome() {
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


  /* ---------- stories slider ---------- */


  /* ---------- enquiry wizard ---------- */


  /* ---------- upcoming events ---------- */


  /* ---------- stats binding ---------- */


  /* ---------- marquee ---------- */


  /* ---------- boot ---------- */

  function preloadFallback() {
    const p = $("#preload");
    if (!p) return;
    if (!document.documentElement.classList.contains("no-motion")
        && !location.search.includes("nomotion") && !REDUCED) return;
    p.style.display = "none";
  }

  /* nav first, synchronously, while the parser is still inside <body> */
  mountNav();

  document.addEventListener("DOMContentLoaded", function () {
    mountFooter();
    wireChrome();
    if (window.JWRCArt) window.JWRCArt.build();
    scrollFx(); preloadFallback();
  });
})();

/* dot-in keyframe injected here so the CSS file stays declarative */
(function () {
  const s = document.createElement("style");
  s.textContent = "@keyframes dotin{from{opacity:0;transform:scale(.2)}to{opacity:var(--o,1);transform:none}}"
    + ".crowdwrap circle{transform-box:fill-box;transform-origin:center}";
  document.head.appendChild(s);
})();
