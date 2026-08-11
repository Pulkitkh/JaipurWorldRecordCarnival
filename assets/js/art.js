/* ============================================================
   JWRC — generative artwork
   Every "photograph" on this site is a composed SVG scene built from
   Jaipur primitives: the Hawa Mahal facade, crowds, kites, marigolds.
   Swap these for real photography when it is available — the markup
   contract is <div class="scene" data-scene="..."> and nothing else.
   ============================================================ */
(function (w) {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const W = 900, H = 640;

  /* deterministic pseudo-random so scenes never re-shuffle between loads */
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;  s >>>= 0;
      return s / 4294967296;
    };
  }

  const PAL_BASE = {
    dawn:   { a: "#F5B841", b: "#E8461C", c: "#8E2A2E", ink: "#2A1226", sun: "#FFE9B0" },
    day:    { a: "#7FC4D8", b: "#2C6E80", c: "#16405A", ink: "#0E2436", sun: "#FFF4CE" },
    dusk:   { a: "#F08A3C", b: "#B9333F", c: "#3B2050", ink: "#180E28", sun: "#FFD79A" },
    night:  { a: "#2E4A78", b: "#1B2334", c: "#0C111D", ink: "#060911", sun: "#F0E2B6" },
    rose:   { a: "#F2A07B", b: "#D95536", c: "#7C2739", ink: "#2A1020", sun: "#FFE6C8" },
    indigo: { a: "#5C86B8", b: "#23406B", c: "#111C33", ink: "#080E1C", sun: "#E8EEF8" },
  };
  const PAL = new Proxy({}, { get: (_, k) => Object.assign({}, PAL_BASE[k]) });

  /* ---------- primitives ---------- */

  // Hawa-Mahal-style tiered facade: the shape already inside the JWRC logo
  function facade(x, base, w, h, tiers, fill, op) {
    let d = "", win = "";
    const tierH = h / tiers;
    for (let t = 0; t < tiers; t++) {
      const inset = (t / tiers) * w * 0.17;
      const x0 = x + inset, x1 = x + w - inset;
      const y0 = base - tierH * (t + 1), y1 = base - tierH * t;
      d += `M${x0} ${y1} L${x0} ${y0 + tierH * .28} `
        + `Q${(x0 + x1) / 2} ${y0 - tierH * .30} ${x1} ${y0 + tierH * .28} `
        + `L${x1} ${y1} Z `;
      // arched windows along the tier
      const cols = Math.max(2, Math.round((x1 - x0) / 26));
      for (let c = 0; c < cols; c++) {
        const cw = (x1 - x0) / cols, cx = x0 + cw * (c + .5);
        const wy = y1 - tierH * .30, wh = tierH * .40, ww = Math.min(cw * .46, 11);
        win += `M${cx - ww / 2} ${wy} L${cx - ww / 2} ${wy - wh * .55} `
             + `Q${cx} ${wy - wh * 1.15} ${cx + ww / 2} ${wy - wh * .55} `
             + `L${cx + ww / 2} ${wy} Z `;
      }
    }
    // finial
    const cx = x + w / 2, top = base - h;
    d += `M${cx - 4} ${top} Q${cx} ${top - 22} ${cx + 4} ${top} Z `;
    return `<path d="${d}" fill="${fill}" opacity="${op}"/>`
         + `<path d="${win}" fill="#000" opacity="${op * .42}"/>`;
  }

  function skyline(base, fill, op, seed) {
    const r = rng(seed);
    let out = `<rect x="0" y="${base}" width="${W}" height="${H - base}" fill="${fill}" opacity="${op}"/>`;
    let x = -40;
    while (x < W + 40) {
      const bw = 70 + r() * 110, bh = 60 + r() * 130;
      out += facade(x, base, bw, bh, 2 + Math.floor(r() * 3), fill, op);
      x += bw * (0.72 + r() * 0.3);
    }
    return out;
  }

  function hills(base, fill, op) {
    return `<path d="M0 ${base} Q${W * .18} ${base - 120} ${W * .36} ${base - 42}
             Q${W * .52} ${base - 108} ${W * .70} ${base - 30}
             Q${W * .86} ${base - 96} ${W} ${base - 46} L${W} ${H} L0 ${H} Z"
             fill="${fill}" opacity="${op}"/>`;
  }

  // a row of people — the site's core motif
  function crowdRow(y, scale, fill, op, seed, density) {
    const r = rng(seed);
    const step = 21 * scale;
    let out = "";
    for (let x = -step; x < W + step; x += step * (0.82 + r() * 0.4)) {
      if (r() > (density || 0.94)) continue;
      const s = scale * (0.86 + r() * 0.3);
      const hr = 5.4 * s;                       // head radius
      const bh = 20 * s;                        // body height
      const arms = r() > 0.72;                  // some raise their arms
      out += `<g opacity="${op}" fill="${fill}">`
           + `<circle cx="${x.toFixed(1)}" cy="${(y - bh - hr).toFixed(1)}" r="${hr.toFixed(1)}"/>`
           + `<path d="M${(x - 8.4 * s).toFixed(1)} ${y.toFixed(1)}
                       q0 ${(-bh).toFixed(1)} ${(8.4 * s).toFixed(1)} ${(-bh).toFixed(1)}
                       q${(8.4 * s).toFixed(1)} 0 ${(8.4 * s).toFixed(1)} ${bh.toFixed(1)} Z"/>`;
      if (arms) {
        out += `<path d="M${(x - 7 * s).toFixed(1)} ${(y - bh * .78).toFixed(1)}
                 l${(-5 * s).toFixed(1)} ${(-11 * s).toFixed(1)}" stroke="${fill}"
                 stroke-width="${(2.6 * s).toFixed(1)}" stroke-linecap="round" fill="none"/>`
             + `<path d="M${(x + 7 * s).toFixed(1)} ${(y - bh * .78).toFixed(1)}
                 l${(5 * s).toFixed(1)} ${(-11 * s).toFixed(1)}" stroke="${fill}"
                 stroke-width="${(2.6 * s).toFixed(1)}" stroke-linecap="round" fill="none"/>`;
      }
      out += `</g>`;
    }
    return out;
  }

  function kites(seed, n) {
    const r = rng(seed);
    const cols = ["#E8461C", "#D9A441", "#FCF8F0", "#2C6E80", "#B92B2C"];
    let out = "";
    for (let i = 0; i < (n || 7); i++) {
      const x = 40 + r() * (W - 80), y = 30 + r() * 200, s = 7 + r() * 9;
      const rot = -30 + r() * 60, c = cols[Math.floor(r() * cols.length)];
      out += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${rot.toFixed(0)})" opacity=".85">
        <path d="M0 ${-s} L${s * .8} 0 L0 ${s * 1.5} L${-s * .8} 0 Z" fill="${c}"/>
        <path d="M0 ${s * 1.5} q${s * .5} ${s} ${-s * .3} ${s * 1.8}" stroke="${c}"
              stroke-width="1" fill="none" opacity=".6"/></g>`;
    }
    return out;
  }

  function petals(seed, n, fill) {
    const r = rng(seed);
    let out = "";
    for (let i = 0; i < (n || 40); i++) {
      const x = r() * W, y = r() * H, s = 2 + r() * 4.5;
      out += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${s.toFixed(1)}"
               fill="${fill || "#F0B24A"}" opacity="${(0.18 + r() * 0.5).toFixed(2)}"/>`;
    }
    return out;
  }

  let UID = 0;
  function sky(p) {
    p.uid = "g" + (++UID);
    return `<defs>
      <linearGradient id="sk${p.uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${p.a}"/>
        <stop offset="52%" stop-color="${p.b}"/>
        <stop offset="100%" stop-color="${p.c}"/>
      </linearGradient>
      <radialGradient id="gl${p.uid}"><stop offset="0" stop-color="${p.sun}" stop-opacity=".95"/>
        <stop offset="100%" stop-color="${p.sun}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#sk${p.uid})"/>`;
  }

  function sun(cx, cy, r, p) {
    return `<circle cx="${cx}" cy="${cy}" r="${r * 3.4}" fill="url(#gl${p.uid})"/>
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.sun}" opacity=".92"/>`;
  }

  /* ---------- scenes ---------- */

  const SCENES = {
    // the moment of the attempt — a vast crowd under a Jaipur sunrise
    attempt: (s) => {
      const p = PAL.dawn;
      return sky(p) + sun(660, 170, 52, p) + kites(s + 3, 8)
        + hills(330, p.c, .42) + skyline(360, p.ink, .78, s)
        + crowdRow(430, .9, p.ink, .48, s + 1, .97)
        + crowdRow(490, 1.25, p.ink, .68, s + 2, .96)
        + crowdRow(560, 1.7, p.ink, .86, s + 3, .95)
        + crowdRow(645, 2.3, "#150A14", .96, s + 4, .93)
        + petals(s + 9, 46, "#FFD98A");
    },
    // aerial: people arranged into a formation
    formation: (s) => {
      const p = PAL.indigo;
      let dots = "";
      const cx = W / 2, cy = H / 2;
      const r = rng(s);
      for (let ring = 1; ring <= 9; ring++) {
        const n = ring * 11, rad = ring * 30;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + ring * .12;
          const wob = 1 + .17 * Math.cos(a * 6);
          const x = cx + Math.cos(a) * rad * wob * 1.34;
          const y = cy + Math.sin(a) * rad * wob * .82;
          if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
          const c = ring % 3 === 0 ? "#E8461C" : ring % 3 === 1 ? "#D9A441" : "#FCF8F0";
          dots += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(3.4 + r() * 1.4).toFixed(1)}"
                    fill="${c}" opacity="${(.65 + r() * .35).toFixed(2)}"/>`;
        }
      }
      return `<rect width="${W}" height="${H}" fill="${p.c}"/>`
        + `<circle cx="${cx}" cy="${cy}" r="330" fill="${p.b}" opacity=".55"/>`
        + `<circle cx="${cx}" cy="${cy}" r="190" fill="${p.a}" opacity=".18"/>`
        + dots
        + `<circle cx="${cx}" cy="${cy}" r="9" fill="#E8461C"/>`;
    },
    // a school ground, mid-morning
    school: (s) => {
      const p = PAL.day;
      return sky(p) + sun(180, 120, 42, p) + kites(s + 5, 5)
        + skyline(390, "#0D2A3D", .72, s + 2)
        + `<rect x="0" y="470" width="${W}" height="${H - 470}" fill="#0F2E42" opacity=".55"/>`
        + crowdRow(460, 1.0, "#0E2436", .55, s + 1, .98)
        + crowdRow(530, 1.45, "#0B1D2C", .78, s + 2, .97)
        + crowdRow(620, 2.0, "#08131E", .95, s + 3, .95)
        + petals(s + 7, 28, "#BFE3EE");
    },
    // heritage: the palace facade close up, at dusk
    heritage: (s) => {
      const p = PAL.dusk;
      return sky(p) + sun(720, 210, 60, p)
        + facade(120, 560, 320, 330, 4, p.ink, .74)
        + facade(430, 560, 220, 250, 3, p.ink, .82)
        + facade(620, 560, 260, 300, 4, p.ink, .70)
        + `<rect x="0" y="556" width="${W}" height="${H - 556}" fill="${p.ink}" opacity=".9"/>`
        + crowdRow(636, 2.0, "#0B0616", .9, s, .9)
        + petals(s + 11, 34, "#FFC98A");
    },
    // a folk celebration — dancers and colour
    festival: (s) => {
      const p = PAL.rose;
      return sky(p) + sun(150, 150, 46, p) + kites(s + 1, 10)
        + hills(340, "#6E2233", .46) + skyline(380, "#3D1020", .76, s + 6)
        + crowdRow(470, 1.15, "#3A0F20", .6, s + 1, .96)
        + crowdRow(545, 1.6, "#2A0A18", .8, s + 2, .94)
        + crowdRow(635, 2.2, "#1C0512", .95, s + 3, .92)
        + petals(s + 13, 60, "#FFD07A");
    },
    // night: lamps, the city after the record
    night: (s) => {
      const p = PAL.night;
      let lamps = "";
      const r = rng(s + 21);
      for (let i = 0; i < 90; i++) {
        const x = r() * W, y = 330 + r() * 180;
        lamps += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1 + r() * 2).toFixed(1)}"
                   fill="#F5D580" opacity="${(.3 + r() * .7).toFixed(2)}"/>`;
      }
      return sky(p) + sun(700, 120, 34, p) + skyline(400, "#070C16", .85, s + 4)
        + lamps
        + crowdRow(520, 1.4, "#050912", .8, s + 1, .96)
        + crowdRow(620, 2.0, "#03060D", .95, s + 2, .94)
        + petals(s + 17, 30, "#F5D580");
    },
    // planting / green cause
    green: (s) => {
      const p = PAL.day;
      const r = rng(s + 31);
      let trees = "";
      for (let i = 0; i < 26; i++) {
        const x = r() * W, y = 430 + r() * 190, sc = .5 + r() * 1.1;
        trees += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${sc.toFixed(2)})" opacity=".9">
          <path d="M0 0 L0 -18" stroke="#3A2A18" stroke-width="3"/>
          <circle cx="0" cy="-26" r="13" fill="#2E6A50"/>
          <circle cx="-8" cy="-19" r="9" fill="#3A7F5F"/>
          <circle cx="8" cy="-20" r="9" fill="#25573F"/></g>`;
      }
      return sky(p) + sun(720, 130, 44, p) + hills(360, "#1F5240", .5)
        + `<rect x="0" y="410" width="${W}" height="${H - 410}" fill="#20493C" opacity=".7"/>`
        + trees + crowdRow(640, 2.0, "#0A2018", .9, s, .9);
    },
  };

  const ORDER = ["attempt", "formation", "school", "heritage", "festival", "night", "green"];

  /* ---------- craft motifs (decorative, not photographic) ---------- */

  const MOTIF = {
    mandana: () => {
      let g = "";
      for (let ring = 1; ring <= 4; ring++) {
        const n = ring * 8, rad = ring * 22;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          g += `<circle cx="${(100 + Math.cos(a) * rad).toFixed(1)}"
                 cy="${(100 + Math.sin(a) * rad).toFixed(1)}"
                 r="${ring % 2 ? 3.6 : 2.4}" fill="currentColor"/>`;
        }
        g += `<circle cx="100" cy="100" r="${rad}" fill="none" stroke="currentColor"
               stroke-width="1" opacity=".38" stroke-dasharray="3 6"/>`;
      }
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        g += `<path d="M100 100 L${(100 + Math.cos(a) * 96).toFixed(1)} ${(100 + Math.sin(a) * 96).toFixed(1)}"
               stroke="currentColor" stroke-width="1" opacity=".28"/>`;
      }
      return `<svg viewBox="0 0 200 200">${g}<circle cx="100" cy="100" r="7" fill="currentColor"/></svg>`;
    },
    pottery: () => `<svg viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="2"/>
      <circle cx="100" cy="100" r="72" fill="none" stroke="currentColor" stroke-width="1" opacity=".5"/>
      ${Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return `<ellipse cx="${(100 + Math.cos(a) * 52).toFixed(1)}" cy="${(100 + Math.sin(a) * 52).toFixed(1)}"
                 rx="15" ry="7" fill="currentColor" opacity=".7"
                 transform="rotate(${(a * 180 / Math.PI).toFixed(0)} ${(100 + Math.cos(a) * 52).toFixed(1)} ${(100 + Math.sin(a) * 52).toFixed(1)})"/>`;
      }).join("")}
      <circle cx="100" cy="100" r="24" fill="currentColor" opacity=".85"/>
      <circle cx="100" cy="100" r="11" fill="none" stroke="#FCF8F0" stroke-width="2"/></svg>`,
    block: () => `<svg viewBox="0 0 200 200">
      ${Array.from({ length: 4 }, (_, r) => Array.from({ length: 4 }, (_, c) => {
        const x = 25 + c * 50, y = 25 + r * 50;
        return `<path d="M${x} ${y + 18} q0 -20 18 -20 q18 0 18 20 q0 18 -18 22 q-18 -4 -18 -22 Z"
                 fill="currentColor" opacity="${(r + c) % 2 ? ".85" : ".5"}"/>
                <circle cx="${x + 18}" cy="${y + 40}" r="3" fill="currentColor"/>`;
      }).join("")).join("")}</svg>`,
    jharokha: () => `<svg viewBox="0 0 200 200">
      <path d="M40 190 V78 Q40 26 100 26 Q160 26 160 78 V190 Z" fill="none"
            stroke="currentColor" stroke-width="2.4"/>
      <path d="M62 190 V86 Q62 50 100 50 Q138 50 138 86 V190 Z" fill="none"
            stroke="currentColor" stroke-width="1.4" opacity=".6"/>
      ${Array.from({ length: 3 }, (_, i) =>
        `<rect x="${72 + i * 22}" y="120" width="14" height="30" rx="7" fill="currentColor" opacity=".7"/>`).join("")}
      <path d="M100 26 q0 -16 0 -18" stroke="currentColor" stroke-width="2.4"/>
      <circle cx="100" cy="4" r="5" fill="currentColor"/>
      <path d="M28 190 H172" stroke="currentColor" stroke-width="3"/></svg>`,
  };

  /* ---------- portraits (for stories / team) ---------- */

  function portrait(seed) {
    const r = rng(seed);
    const grounds = [["#F4EADA", "#E8461C"], ["#EADCC4", "#23406B"], ["#F7EEDD", "#2C6E80"],
                     ["#EFE1CB", "#B92B2C"], ["#F4EADA", "#2E6A50"], ["#EDDFC8", "#D9A441"]];
    const [bg, ac] = grounds[Math.floor(r() * grounds.length)];
    const head = r();
    let cover = "";
    if (head < .34) {                                   // turban
      cover = `<path d="M60 82 q0 -40 40 -40 q40 0 40 38 q-14 -16 -40 -16 q-26 0 -40 18 Z" fill="${ac}"/>
               <path d="M58 80 q28 -14 84 -7" stroke="${bg}" stroke-width="3.4" fill="none" opacity=".55"/>
               <path d="M140 78 q14 4 12 20" stroke="${ac}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
    } else if (head < .68) {                            // odhni / dupatta
      cover = `<path d="M54 104 q0 -62 46 -62 q46 0 46 62 q-12 -26 -46 -26 q-34 0 -46 26 Z" fill="${ac}"/>
               <path d="M54 104 q-8 50 8 84 M146 104 q8 50 -8 84" stroke="${ac}" stroke-width="13"
                     fill="none" stroke-linecap="round"/>
               <circle cx="66" cy="128" r="2.6" fill="${bg}"/><circle cx="134" cy="128" r="2.6" fill="${bg}"/>`;
    } else {                                            // uncovered
      cover = `<path d="M64 86 q0 -36 36 -36 q36 0 36 36 q-12 -14 -36 -14 q-24 0 -36 14 Z" fill="#241C15"/>`;
    }
    return `<svg viewBox="0 0 200 200">
      <rect width="200" height="200" fill="${bg}"/>
      <circle cx="100" cy="92" r="66" fill="${ac}" opacity=".13"/>
      <g opacity=".16" fill="none" stroke="${ac}" stroke-width="1.1">
        ${Array.from({ length: 5 }, (_, i) =>
          `<path d="M${20 + i * 40} 200 v-46 q0 -22 20 -22 q20 0 20 22 v46"/>`).join("")}
      </g>
      <path d="M24 200 q0 -62 76 -62 q76 0 76 62 Z" fill="${ac}"/>
      <path d="M80 128 h40 v26 q-20 12 -40 0 Z" fill="#2A211A" opacity=".92"/>
      <ellipse cx="100" cy="96" rx="35" ry="41" fill="#2A211A"/>
      ${cover}
    </svg>`;
  }

  /* ---------- mount ---------- */

  function build(root) {
    (root || document).querySelectorAll(".scene:not([data-built])").forEach(function (el, i) {
      const name = el.dataset.scene;
      const seed = parseInt(el.dataset.seed || (i + 1) * 37, 10);
      const fn = SCENES[name] || SCENES[ORDER[seed % ORDER.length]];
      el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"
                        role="img" aria-label="${el.dataset.alt || "Illustration"}">${fn(seed)}</svg>`;
      el.setAttribute("data-built", "1");
    });
    (root || document).querySelectorAll(".motif:not([data-built])").forEach(function (el) {
      const m = MOTIF[el.dataset.motif];
      if (m) { el.innerHTML = m(); el.setAttribute("data-built", "1"); }
    });
    (root || document).querySelectorAll(".portrait:not([data-built])").forEach(function (el, i) {
      el.innerHTML = portrait(parseInt(el.dataset.seed || (i + 5) * 91, 10));
      el.setAttribute("data-built", "1");
    });
  }

  w.JWRCArt = { build, portrait, scenes: ORDER };
})(window);
