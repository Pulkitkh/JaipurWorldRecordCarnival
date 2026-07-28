/* Shared chrome for the JWRC concept mockups.
   Injects SVG defs (arch clip paths), the mock label bar, nav and footer. */

const NAV = [
  ["index.html", "Home"],
  ["why-records-matter.html", "Why Records Matter"],
  ["how-it-happens.html", "How It Happens"],
  ["records.html", "Records &amp; Moments"],
  ["join.html", "Become Part of History"],
];

const LOGO_MARK = `
<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
  <path d="M20 1.5c-1.6 2.3-.4 3.6.6 4.4" stroke="#E8461C" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M4 39V19.5C4 10.9 11.2 4 20 4s16 6.9 16 15.5V39z" fill="#E8461C"/>
  <g fill="#FCF8F0">
    <path d="M20 10.6c2.5 0 4.5 2 4.5 4.5V19h-9v-3.9c0-2.5 2-4.5 4.5-4.5z"/>
    <rect x="8.5" y="24" width="6.4" height="9.5" rx="3.2"/>
    <rect x="16.8" y="24" width="6.4" height="9.5" rx="3.2"/>
    <rect x="25.1" y="24" width="6.4" height="9.5" rx="3.2"/>
  </g>
  <circle cx="30.5" cy="14.5" r="4.2" fill="#2C6E80"/>
  <path d="M27 13.4c1.8.7 3.4-.5 5 .4M28 17c1.5-1.2 3.4-.4 4.8-1.6" stroke="#8CC63F" stroke-width="1.1" fill="none" stroke-linecap="round"/>
</svg>`;

const DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <clipPath id="jw-arch" clipPathUnits="objectBoundingBox">
      <path d="M0,1 V0.44 C0,0.19 0.22,0 0.5,0 C0.78,0 1,0.19 1,0.44 V1 Z"/>
    </clipPath>
    <clipPath id="jw-cusp" clipPathUnits="objectBoundingBox">
      <path d="M0,1 V0.46
               Q0.015,0.315 0.125,0.275
               Q0.155,0.135 0.288,0.142
               Q0.34,0.028 0.5,0
               Q0.66,0.028 0.712,0.142
               Q0.845,0.135 0.875,0.275
               Q0.985,0.315 1,0.46
               V1 Z"/>
    </clipPath>
  </defs>
</svg>`;

function logoLockup(cls = "") {
  return `<a class="logo ${cls}" href="index.html">${LOGO_MARK}
    <span class="logo-txt">
      <span class="l1">Jaipur</span>
      <span class="l2">World Record Carnival</span>
    </span></a>`;
}

function buildNav() {
  const here = location.pathname.split("/").pop() || "index.html";
  const links = NAV.map(([h, t]) =>
    `<a href="${h}" class="${h === here ? "is-active" : ""}">${t}</a>`).join("");
  return `
  <div class="mockbar">
    <span><b>Concept mockup</b> &nbsp;·&nbsp; jaipurworldrecordcarnival.in</span>
    <span>Sample copy &amp; placeholder imagery — for design review only</span>
  </div>
  <nav class="nav">
    ${logoLockup()}
    <div class="nav-links">${links}
      <a href="join.html" class="btn" style="padding:12px 22px">Get involved
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M2 6.5h9M7 2.5l4 4-4 4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </a>
    </div>
  </nav>`;
}

function buildFooter() {
  return `
  <div class="blockprint"></div>
  <footer class="foot pad-sm">
    <div class="wrap">
      <div class="grid" style="grid-template-columns:1.6fr 1fr 1fr 1.2fr;gap:44px">
        <div>
          ${logoLockup("on-dark")}
          <p class="mt-m" style="max-width:34ch;font-size:15px;line-height:1.7;color:rgba(252,248,240,.6)">
            A movement that gathers people around achievements worth remembering —
            rooted in the culture, craft and hospitality of Rajasthan.
          </p>
          <p style="font-family:var(--display);font-style:italic;font-size:17px;color:var(--gold);margin-top:22px">
            “Find your passion, and it’s no longer work.”
          </p>
        </div>
        <div>
          <h4>The Journey</h4>
          <a href="index.html">Padharo Mhare Des</a>
          <a href="index.html#who">Who We Are</a>
          <a href="why-records-matter.html">Why Records Matter</a>
          <a href="how-it-happens.html">How It Happens</a>
          <a href="records.html">Records &amp; Moments</a>
        </div>
        <div>
          <h4>Take Part</h4>
          <a href="join.html">Participate</a>
          <a href="join.html">Volunteer</a>
          <a href="join.html">Partner with us</a>
          <a href="join.html">Start an initiative</a>
          <a href="join.html">For schools &amp; colleges</a>
        </div>
        <div>
          <h4>Reach Us</h4>
          <a href="tel:+918003003000">+91 80030 03000</a>
          <a href="mailto:manmohan.agarwal015@gmail.com">manmohan.agarwal015@gmail.com</a>
          <a href="#">Jaipur, Rajasthan, India</a>
          <div class="creds mt-m" style="gap:8px">
            <span class="cred" style="font-size:10px;padding:8px 12px">Guinness</span>
            <span class="cred" style="font-size:10px;padding:8px 12px">Limca</span>
            <span class="cred" style="font-size:10px;padding:8px 12px">India Book</span>
          </div>
        </div>
      </div>
      <div class="bottom">
        <span>© 2026 Jaipur World Record Carnival®. All rights reserved.</span>
        <span>पधारो म्हारे देस — you are always welcome here.</span>
      </div>
    </div>
  </footer>`;
}

document.body.insertAdjacentHTML("afterbegin", DEFS + buildNav());
document.body.insertAdjacentHTML("beforeend", buildFooter());

/* Reveal-on-scroll stand-in: everything is shown for static capture */
document.querySelectorAll(".card").forEach(c => c.classList.add("lit"));
