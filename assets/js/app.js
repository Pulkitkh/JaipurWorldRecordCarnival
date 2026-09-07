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
  /* Which page this is.

     It used to be worked out by matching location.pathname against
     "records.html" and friends. That is wrong the moment the site is
     deployed, because vercel.json sets cleanUrls, so the real address is
     /records with no extension — the match failed, every page except the
     landing page fell back to the home nav, and its bare #gather and
     #build anchors pointed at sections that do not exist there. Clicking
     them did nothing at all. Locally it worked perfectly, because a
     plain file server only ever serves /records.html.

     So the page says what it is, in its own markup, and the URL is only
     consulted as a fallback — now written to accept both forms, plus a
     trailing slash and index.html. app.js runs during parse from just
     inside <body>, so document.body and its attributes already exist. */
  const FROM_URL = (() => {
    const path = location.pathname.replace(/\/+$/, "").split("/").pop() || "";
    const name = path.replace(/\.html$/, "");
    if (name === "take-part") return "take";
    if (name === "records") return "records";
    if (name === "about") return "about";
    return "home";
  })();
  const DECLARED = document.body && document.body.dataset.page;
  const HERE = PAGES[DECLARED] ? DECLARED : FROM_URL;
  const NAV = PAGES[HERE];
  const CONTACT = HERE === "take" ? "#start" : "take-part.html#start";

  const ARROW = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor"
    stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5h9M7 2.5l4 4-4 4"/></svg>`;

  const CHEV = `<svg class="chev" width="16" height="16" viewBox="0 0 16 16" fill="none"
    stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>`;

  const PHONE = `<svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"
    aria-hidden="true"><path d="M2.5 3.5C2.5 2.7 3.2 2 4 2h1.6c.4 0 .8.3.9.7l.7 2.3c.1.4 0 .8-.3 1
    l-1 .8a9 9 0 0 0 3.3 3.3l.8-1c.2-.3.6-.4 1-.3l2.3.7c.4.1.7.5.7.9V12c0 .8-.7 1.5-1.5 1.5
    A11.5 11.5 0 0 1 2.5 3.5Z"/></svg>`;

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

  /* ---------- the theme control ----------

     Three states, not two. A two-way switch cannot express "follow my
     device", which is what most people actually want and what the site
     does before anybody touches it — so the middle option is the default
     and it stays selectable, rather than being a thing you can only get
     back to by clearing the site's storage.

     The choice is written to <html data-theme> and to localStorage. The
     tiny script in every page's <head> reads it back before first paint;
     doing it here instead would show one frame of the wrong theme on
     every single page load. */

  const THEME_KEY = "jwrc-theme";

  const THEME_ICONS = {
    light: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"
      stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="3.6"/>
      <path d="M10 2v1.8M10 16.2V18M18 10h-1.8M3.8 10H2M15.7 4.3l-1.3 1.3M5.6 14.4l-1.3 1.3M15.7 15.7l-1.3-1.3M5.6 5.6 4.3 4.3"/></svg>`,
    system: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"
      stroke-linejoin="round" aria-hidden="true"><rect x="2.6" y="3.6" width="14.8" height="10" rx="1.6"/>
      <path d="M7 16.4h6"/></svg>`,
    dark: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"
      stroke-linejoin="round" aria-hidden="true"><path d="M16.2 11.6A6.8 6.8 0 0 1 8.4 3.8a6.8 6.8 0 1 0 7.8 7.8Z"/></svg>`,
  };

  const THEME_LABELS = { light: "Light", system: "Match my device", dark: "Dark" };

  function themeControl(cls) {
    const buttons = ["light", "system", "dark"].map((mode) =>
      `<button type="button" class="th-b" data-theme-set="${mode}" aria-pressed="false"
        title="${THEME_LABELS[mode]}">${THEME_ICONS[mode]}<span class="vh">${THEME_LABELS[mode]}</span></button>`
    ).join("");
    return `<div class="theme ${cls || ""}" role="group" aria-label="Colour theme">${buttons}</div>`;
  }

  function storedTheme() {
    try {
      const v = localStorage.getItem(THEME_KEY);
      return v === "light" || v === "dark" ? v : "system";
    } catch (e) {
      return "system";           // private browsing, or storage switched off
    }
  }

  function applyTheme(mode) {
    const root = document.documentElement;
    if (mode === "system") root.removeAttribute("data-theme");
    else root.dataset.theme = mode;

    try {
      if (mode === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, mode);
    } catch (e) { /* nothing to do; the page still looks right this visit */ }

    /* The browser's own chrome — the address bar on a phone — takes its
       colour from this, so it has to be told too or the bar stays cream
       above a dark page. */
    const dark = mode === "dark"
      || (mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    for (const m of $$('meta[name="theme-color"]')) {
      m.setAttribute("content", dark ? "#121826" : "#FCF8F0");
    }

    for (const b of $$("[data-theme-set]")) {
      b.setAttribute("aria-pressed", String(b.dataset.themeSet === mode));
    }
  }

  function wireTheme() {
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-theme-set]");
      if (b) applyTheme(b.dataset.themeSet);
    });
    /* While following the device, follow it as it changes — somebody whose
       phone flips to dark at sunset should not have to reload. */
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if (storedTheme() === "system") applyTheme("system"); };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
    applyTheme(storedTheme());
  }

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
        ${themeControl("in-nav")}
        <a class="btn sm" href="${CONTACT}">Take part ${ARROW}</a>
        <button class="burger" id="burger" aria-label="Menu" aria-expanded="false"><i></i><i></i><i></i></button>
      </nav>
      <div class="scrim" id="scrim" hidden></div>
      <div class="drawer" id="drawer" role="dialog" aria-modal="true"
           aria-label="Menu" hidden>
        <button class="drawer-grab" id="drawer-grab" type="button" aria-label="Close menu">
          <i></i>
        </button>
        <nav class="drawer-nav" aria-label="Pages">
          ${NAV.map(([h, t], i) =>
            `<a href="${h}"><span class="n">${String(i + 1).padStart(2, "0")}</span>
               <span class="t">${t}</span>${CHEV}</a>`).join("")}
        </nav>
        <div class="drawer-foot">
          <div class="drawer-acts">
            <a href="${CONTACT}" class="btn">Take part ${ARROW}</a>
            <a href="tel:+918003003000" class="btn ghost" aria-label="Call +91 80030 03000">
              ${PHONE}<span>Call</span></a>
          </div>
          <div class="drawer-theme">
            <span class="lbl">Theme</span>
            ${themeControl("in-drawer")}
          </div>
        </div>
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
    const burger = $("#burger"), drawer = $("#drawer"), scrim = $("#scrim");

    /* Holding the page still while the sheet is open.

       Two obvious approaches both move the page, which is the one thing
       that must not happen. Pinning the body with position:fixed changes
       its layout, and ScrollTrigger puts the offset back to zero about a
       second later. Setting overflow:hidden on the root is worse: the
       scrolling element stops scrolling, so the browser clamps its
       scrollTop to zero immediately. Either way the reader loses their
       place, and reopening the page after closing the sheet drops them at
       the top of a very long document.

       So the document is never touched. Lenis — which is what actually
       drives scrolling here — is stopped; the scrim refuses touch, so a
       drag cannot pull the page behind it; and the wheel is blocked
       everywhere except inside the sheet's own list, which still needs to
       scroll when the menu is long. Nothing about the page's geometry
       changes, so there is nothing to restore. */

    function blockWheel(e) {
      if (e.target.closest && e.target.closest(".drawer-nav")) return;
      e.preventDefault();
    }
    function blockTouch(e) {
      if (e.target.closest && e.target.closest(".drawer")) return;
      e.preventDefault();
    }

    function lock(on) {
      const lenis = window.__lenis;
      if (lenis) {
        if (on && lenis.stop) lenis.stop();
        if (!on && lenis.start) lenis.start();
      }
      const fn = on ? "addEventListener" : "removeEventListener";
      document[fn]("wheel", blockWheel, { passive: false });
      document[fn]("touchmove", blockTouch, { passive: false });
      document.documentElement.classList.toggle("is-locked", on);
    }

    function setOpen(open) {
      if (open) { drawer.hidden = false; scrim.hidden = false; }
      // a frame between unhiding and animating, or the transition never runs
      requestAnimationFrame(() => {
        drawer.classList.toggle("open", open);
        scrim.classList.toggle("open", open);
      });
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", String(open));
      lock(open);
      if (open) {
        /* The first destination, not the first focusable thing — which is
           the grab handle, whose only job is to close the sheet again.
           Landing there offers "close" as the opening move, and paints the
           focus ring around a bar of empty space. */
        const first = drawer.querySelector(".drawer-nav a")
                   || drawer.querySelector("a, button");
        if (first) first.focus({ preventScroll: true });
      } else {
        burger.focus({ preventScroll: true });
        // stay out of the accessibility tree once the animation is done
        setTimeout(() => {
          if (!drawer.classList.contains("open")) { drawer.hidden = true; scrim.hidden = true; }
        }, 420);
      }
    }

    const isOpen = () => drawer.classList.contains("open");

    burger.addEventListener("click", () => setOpen(!isOpen()));
    scrim.addEventListener("click", () => setOpen(false));
    $("#drawer-grab").addEventListener("click", () => setOpen(false));
    drawer.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });

    document.addEventListener("keydown", (e) => {
      if (!isOpen()) return;
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key !== "Tab") return;
      /* While the sheet is open it is the whole interface, so Tab has to
         cycle inside it rather than walking off into the page behind. */
      const items = $$("a, button, [tabindex]:not([tabindex='-1'])", drawer)
        .filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* Drag the sheet down to dismiss it — the gesture both platforms have
       taught people to expect from anything that rises from the bottom. */
    let startY = 0, dy = 0, dragging = false;
    drawer.addEventListener("touchstart", (e) => {
      // only from the top of the sheet, so it never fights the list scrolling
      if (!e.target.closest(".drawer-grab, .drawer-nav") || drawer.scrollTop > 0) {
        const nav = $(".drawer-nav", drawer);
        if (nav && nav.scrollTop > 0) return;
      }
      startY = e.touches[0].clientY; dy = 0; dragging = true;
      drawer.style.transition = "none";
    }, { passive: true });

    drawer.addEventListener("touchmove", (e) => {
      if (!dragging) return;
      dy = e.touches[0].clientY - startY;
      if (dy > 0) drawer.style.transform = `translateY(${dy}px)`;
    }, { passive: true });

    drawer.addEventListener("touchend", () => {
      if (!dragging) return;
      dragging = false;
      drawer.style.transition = "";
      drawer.style.transform = "";
      if (dy > 90) setOpen(false);
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
    wireTheme();
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
