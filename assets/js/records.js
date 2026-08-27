/* ============================================================
   JWRC — The records

   Eight of the eleven records have photographs. Three do not, and a page
   about counting can do better than a paragraph where a picture should
   be: those three get a drawn plate that renders the number itself, one
   mark at a time.

   Where the count is small enough to draw honestly, every mark is one
   thing — 11,111 miniatures, 366 birthdays. Where it is not, the plate
   says what each mark stands for and draws that many instead. The line
   under every plate states which, because a chart that quietly rescales
   itself is worse than no chart.
   ============================================================ */
(function () {
  "use strict";

  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", () => {
    try { reveal(); } catch (e) { console.error("[records] reveal", e); }
    /* The plates draw type onto canvas — the ghost numeral behind each
       field, and the word राम sixty-four thousand times. Canvas does not
       wait for a webfont the way layout does: draw too early and it is
       rendered in Times and never corrected. So the plates wait for the
       fonts, and draw in the fallback only if that never resolves. */
    const go = () => { try { plates(); } catch (e) { console.error("[records] plates", e); } };
    if (document.fonts && document.fonts.ready) {
      Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]).then(go);
    } else go();
  });

  /* ---------- reveal ----------
     Transform and opacity only. An earlier version of this idiom animated
     clip-path, which repaints rather than composites and cost about fifty
     frames a second on the landing page. */
  function reveal() {
    const els = $$("[data-reveal]");
    if (!els.length) return;
    if (REDUCED) { els.forEach((e) => e.classList.add("is-shown")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-shown");
        io.unobserve(e.target);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- the plates ---------- */

  function plates() {
    const all = $$(".plate[data-plate]");
    if (!all.length) return;

    for (const plate of all) {
      const kind = plate.dataset.plate;
      if (kind === "mirror") continue;      // pure CSS; nothing to draw
      if (kind === "screw") { screw(plate); continue; }

      const canvas = document.createElement("canvas");
      /* A drawing that carries meaning is not decoration. Each plate says in
         words what it is showing, so somebody who cannot see the marks still
         learns what the marks were counting. */
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", plate.dataset.alt || "");
      plate.prepend(canvas);
      const draw = kind === "year" ? drawYear
                 : kind === "word" ? drawWord
                 : drawMarks;
      mount(plate, canvas, draw);
    }
  }

  /* Size the canvas to its box in device pixels, draw, and redraw when the
     box actually changes width — not on every resize event, because a phone
     fires those continuously while the address bar slides away and each one
     would repaint eleven thousand marks. */
  function mount(plate, canvas, draw) {
    const ctx = canvas.getContext("2d");
    let lastW = 0;
    let drawn = false;

    function size() {
      const rect = plate.getBoundingClientRect();
      if (!rect.width) return false;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w === lastW && drawn) return false;
      lastW = w;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      return { w, h };
    }

    function run(animate) {
      const box = size();
      if (!box) return;
      drawn = true;
      draw(ctx, box, plate, animate && !REDUCED);
    }

    /* Drawn when it comes into view, so a plate eight screens down is not
       costing anything on load. */
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      run(true);
    }, { rootMargin: "200px 0px" });
    io.observe(plate);

    let t = null;
    addEventListener("resize", () => {
      if (!drawn) return;
      clearTimeout(t);
      t = setTimeout(() => run(false), 220);
    }, { passive: true });
  }

  /* ---------- the ground every plate shares ----------

     The first version of these was one flat navy rectangle with one flat
     colour of mark on it, and it looked exactly like what it was: a chart
     standing in for a photograph. These are the only pictures five of the
     eleven records will ever have, so they are built the way a specimen
     card is built — a warm light behind the field, paper grain over it, a
     ruled border with corner ticks, and the number itself set enormous and
     nearly invisible behind the marks. */

  const INK = { flame: [232, 70, 28], gold: [217, 164, 65], leaf: [127, 191, 79],
                ember: [244, 129, 58], ivory: [252, 248, 240] };

  function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

  function hexToRgb(hex) {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || "");
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : INK.ivory;
  }

  /* One grain tile, drawn once and reused by every plate. Painting noise
     per pixel per plate would be five full-canvas loops on load; painting
     it once into a 128px tile and repeating that is one. */
  let grain = null;
  function grainTile() {
    if (grain) return grain;
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() * 46 - 23);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 20;
    }
    g.putImageData(img, 0, 0);
    grain = c;
    return c;
  }

  function ground(ctx, box, tint) {
    const { w, h } = box;
    const base = ctx.createLinearGradient(0, 0, w * 0.4, h);
    base.addColorStop(0, "#1B2334");
    base.addColorStop(1, "#0B101B");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    /* a warm light off the top-left corner, in the plate's own ink */
    const glow = ctx.createRadialGradient(w * 0.26, h * 0.12, 0, w * 0.26, h * 0.12, h * 0.9);
    glow.addColorStop(0, rgba(tint, 0.17));
    glow.addColorStop(1, rgba(tint, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    const tile = ctx.createPattern(grainTile(), "repeat");
    if (tile) { ctx.fillStyle = tile; ctx.fillRect(0, 0, w, h); }
  }

  /* The number, set enormous behind the field. It is the subject of the
     plate, so it belongs in the picture — just far enough back that the
     marks stay the thing you read first. */
  function ghost(ctx, box, text, tint) {
    if (!text) return;
    const { w, h } = box;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    /* Set to the height of the card, then pulled back until it fits its
       width. Without the second step "508,603" was three times wider than
       the plate and all that showed was the "8,60" in the middle of it,
       which read as a different number entirely. */
    let size = Math.round(h * 0.42);
    ctx.font = `600 ${size}px Fraunces, Georgia, serif`;
    const room = w - 44;
    const width = ctx.measureText(text).width;
    if (width > room) {
      size = Math.max(14, Math.floor(size * (room / width)));
      ctx.font = `600 ${size}px Fraunces, Georgia, serif`;
    }
    ctx.fillStyle = rgba(tint, ctx.__faint ? 0.075 : 0.13);
    ctx.fillText(text, w / 2, h * 0.46);
    ctx.restore();
  }

  /* A ruled border with ticks at the corners, the way a plate in a
     collection is ruled. */
  function frame(ctx, box) {
    const { w, h } = box;
    const m = 12;
    ctx.save();
    ctx.strokeStyle = rgba(INK.ivory, 0.16);
    ctx.lineWidth = 1;
    ctx.strokeRect(m + 0.5, m + 0.5, w - m * 2 - 1, h - m * 2 - 1);
    ctx.strokeStyle = rgba(INK.ivory, 0.4);
    ctx.lineWidth = 1.4;
    const t = 9;
    for (const [x, y, dx, dy] of [[m, m, 1, 1], [w - m, m, -1, 1],
                                  [m, h - m, 1, -1], [w - m, h - m, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(x + dx * t, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * t);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* Deterministic jitter. Math.random would redraw a different plate on
     every resize, which reads as a glitch rather than a redraw. */
  function seeded(seed) {
    let v = seed || 1;
    return () => { v = (v * 1103515245 + 12345) & 0x7fffffff; return v / 0x7fffffff; };
  }

  /* Where the marks go: a grid whose cells are as square as this count can
     make them in this box, with the caption band left clear at the bottom. */
  function field(box, total) {
    const pad = 30;
    const bottom = 60;
    const w = box.w - pad * 2;
    const h = box.h - pad - bottom;
    if (w <= 0 || h <= 0) return null;
    const cols = Math.max(1, Math.round(Math.sqrt((total * w) / h)));
    const rows = Math.ceil(total / cols);
    return { pad, w, h, cols, rows, cw: w / cols, ch: h / rows,
             cell: Math.min(w / cols, h / rows) };
  }

  /* Paints in over about a second when it first comes into view. The marks
     accumulate on the canvas, so no frame ever redraws what is already
     there — the ground and the ghost numeral are painted once, before. */
  function fillIn(total, paint, animate, ms) {
    if (!animate) { paint(0, total); return; }
    let done = 0;
    const start = performance.now();
    (function step(now) {
      const t = Math.min(1, (now - start) / (ms || 1100));
      const target = Math.round(total * (1 - Math.pow(1 - t, 3)));
      if (target > done) { paint(done, target); done = target; }
      if (t < 1) requestAnimationFrame(step);
      else if (done < total) paint(done, total);
    })(start);
  }

  /* ---------- a field of marks ---------- */

  function drawMarks(ctx, box, plate, animate) {
    const total = Number(plate.dataset.marks) || 400;
    const shape = plate.dataset.shape || "dot";
    const tint = hexToRgb(plate.dataset.ink);

    /* Eleven thousand marks fill the card edge to edge. A numeral set at
       full strength behind that does not sit behind it — it cuts blocks
       out of it. Behind a dense field it is barely there. */
    ctx.__faint = total > 4000;
    ground(ctx, box, tint);
    ghost(ctx, box, plate.dataset.ghost, tint);
    frame(ctx, box);

    const f = field(box, total);
    if (!f) return;
    const rnd = seeded(total);

    const marks = [];
    for (let i = 0; i < total; i++) {
      marks.push([
        f.pad + (i % f.cols) * f.cw + f.cw / 2 + (rnd() - 0.5) * f.cw * 0.4,
        f.pad + ((i / f.cols) | 0) * f.ch + f.ch / 2 + (rnd() - 0.5) * f.ch * 0.4,
        (total > 4000 ? 0.3 : 0.5) + rnd() * (total > 4000 ? 0.42 : 0.5),  // alpha
        (rnd() - 0.5) * 0.9,            // tilt
        0.78 + rnd() * 0.44,            // scale
        rnd(),                          // hue pick
      ]);
    }

    /* Two related inks rather than one, so the field has depth instead of
       reading as a printed halftone. */
    /* A second, related ink gives the leaves depth. At eleven thousand
       marks it does the opposite — two colours at three pixels apart is
       just noise — so the densest field keeps to one. */
    const dense = total > 4000;
    const alt = shape === "leaf" ? [46, 106, 80]
              : shape === "dot" ? (dense ? tint : INK.ember)
              : INK.flame;

    const paint = (from, to) => {
      for (let i = from; i < to; i++) {
        const [x, y, a, tilt, sc, hue] = marks[i];
        const c = hue > 0.62 ? alt : tint;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tilt * (shape === "leaf" ? 1 : 0.4));
        ctx.globalAlpha = a;
        const r = f.cell * (dense ? 0.27 : 0.32) * sc;
        if (shape === "leaf") {
          // a leaf with a midrib, not an ellipse
          ctx.fillStyle = rgba(c, 1);
          ctx.beginPath();
          ctx.moveTo(-r, 0);
          ctx.quadraticCurveTo(-r * 0.1, -r * 0.62, r, 0);
          ctx.quadraticCurveTo(-r * 0.1, r * 0.62, -r, 0);
          ctx.fill();
          ctx.strokeStyle = rgba(INK.ivory, 0.24 * a);
          ctx.lineWidth = Math.max(0.4, r * 0.09);
          ctx.beginPath(); ctx.moveTo(-r * 0.8, 0); ctx.lineTo(r * 0.75, 0); ctx.stroke();
        } else if (shape === "dot") {
          ctx.fillStyle = rgba(c, 1);
          ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.fill();
          if (sc > 1.06) {          // a highlight on the larger ones only
            ctx.fillStyle = rgba(INK.ivory, 0.5);
            ctx.beginPath(); ctx.arc(-r * 0.24, -r * 0.24, r * 0.2, 0, Math.PI * 2); ctx.fill();
          }
        } else {
          ctx.strokeStyle = rgba(c, 1);
          ctx.lineWidth = Math.max(0.6, r * 0.42);
          ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.lineTo(0, r * 0.9); ctx.stroke();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };

    fillIn(total, paint, animate);
  }

  /* ---------- one word, written over and over ----------

     For the record that is a single word written sixty-four thousand times,
     an abstract tick is a poor stand-in when the word itself can be set.
     Four thousand of them at this size is the honest limit of what stays
     legible on a card, and the caption says so. */

  function drawWord(ctx, box, plate, animate) {
    const total = Number(plate.dataset.marks) || 3000;
    const word = plate.dataset.word || "राम";
    const tint = hexToRgb(plate.dataset.ink);

    ground(ctx, box, tint);
    ghost(ctx, box, plate.dataset.ghost, tint);
    frame(ctx, box);

    const f = field(box, total);
    if (!f) return;
    const rnd = seeded(total);
    /* Big enough to read as the word it is. A field of four thousand set
       these at under four pixels, which is not "राम written many times",
       it is red static — and the whole point of setting the word rather
       than an abstract tick was that it could be read. */
    const size = Math.max(11, f.cell * 1.15);
    ctx.font = `500 ${size.toFixed(1)}px "Noto Sans Devanagari", var(--body), sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const marks = [];
    for (let i = 0; i < total; i++) {
      marks.push([
        f.pad + (i % f.cols) * f.cw + f.cw / 2 + (rnd() - 0.5) * f.cw * 0.24,
        f.pad + ((i / f.cols) | 0) * f.ch + f.ch / 2 + (rnd() - 0.5) * f.ch * 0.2,
        0.55 + rnd() * 0.45,
        rnd(),
      ]);
    }

    const paint = (from, to) => {
      for (let i = from; i < to; i++) {
        const [x, y, a, hue] = marks[i];
        ctx.globalAlpha = a;
        ctx.fillStyle = rgba(hue > 0.7 ? INK.ember : tint, 1);
        ctx.fillText(word, x, y);
      }
      ctx.globalAlpha = 1;
    };

    fillIn(total, paint, animate, 1400);
  }

  /* ---------- a year ----------

     Three hundred and sixty-six marks, laid out the way a year is: twelve
     rows, each as long as its month, with the months named down the side so
     it reads as a calendar rather than a block of dots. The twenty-ninth of
     February is ringed, because it is the date the paragraph is about. */

  function drawYear(ctx, box, plate, animate) {
    const tint = hexToRgb(plate.dataset.ink);
    ground(ctx, box, tint);
    ghost(ctx, box, plate.dataset.ghost, tint);
    frame(ctx, box);

    const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
                   "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const left = 46;
    const pad = 26;
    const bottom = 58;
    const w = box.w - left - pad;
    const h = box.h - pad - bottom;
    if (w <= 0 || h <= 0) return;

    const cw = w / 31;
    const ch = h / 12;
    const r = Math.max(1.2, Math.min(cw, ch) * 0.26);

    ctx.font = `600 ${Math.max(6.5, Math.min(9, ch * 0.42)).toFixed(1)}px Inter, sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    NAMES.forEach((n, i) => {
      ctx.fillStyle = rgba(INK.ivory, i === 1 ? 0.62 : 0.34);
      ctx.fillText(n, left - 12, pad + i * ch + ch / 2);
    });

    const dots = [];
    DAYS.forEach((days, month) => {
      for (let d = 0; d < days; d++) {
        dots.push([left + d * cw + cw / 2, pad + month * ch + ch / 2,
                   month === 1 && d === 28]);
      }
    });

    const paint = (from, to) => {
      for (let i = from; i < to; i++) {
        const [x, y, leap] = dots[i];
        ctx.globalAlpha = leap ? 1 : 0.66;
        ctx.fillStyle = leap ? rgba(INK.ivory, 1) : rgba(tint, 1);
        ctx.beginPath();
        ctx.arc(x, y, leap ? r * 1.25 : r, 0, Math.PI * 2);
        ctx.fill();
        if (leap) {
          ctx.globalAlpha = 0.95;
          ctx.strokeStyle = rgba(INK.flame, 1);
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    fillIn(dots.length, paint, animate, 1300);
  }

  /* The screw, against a person of average height. Both are drawn from the
     same scale — 135 inches against 66 — so the comparison is arithmetic
     rather than an impression.

     The viewBox matches the plate's own 4:5 so nothing is letterboxed, and
     everything stops well above the bottom edge, because the caption band is
     painted over the last stretch of the plate. An earlier version put the
     person's label down there and it was never seen. */
  function screw(plate) {
    const SCREW_IN = 135;              // 11 ft 3 in
    const PERSON_IN = 66;              // 5 ft 6 in

    const W = 200, H = 250;
    const base = 196;                  // the 0 ft line
    const top = 34;                    // the top of the screw's head
    const perIn = (base - top) / SCREW_IN;
    const ph = PERSON_IN * perIn;      // the person, to the same scale
    const personTop = base - ph;

    /* ── the scale ── */
    let ticks = "";
    let labels = "";
    for (let ft = 0; ft <= 11; ft++) {
      const y = base - ft * 12 * perIn;
      const long = ft % 5 === 0;
      ticks += `M52 ${r(y)} L${long ? 68 : 62} ${r(y)} `;
      if (long) {
        labels += `<text x="46" y="${r(y + 3.4)}" text-anchor="end" font-size="8"
          fill="rgba(252,248,240,.5)" font-family="Inter, sans-serif">${ft} ft</text>`;
      }
    }

    /* ── the screw ── */
    const cx = 112;
    const halfW = 13;
    const headH = 15;
    const headW = 21;
    const tip = 26;                    // the pointed end
    const pitch = 9;

    /* A serrated outline down both sides, which is what makes it read as a
       screw rather than a red rectangle — drawn as one closed path so the
       fill is a single shape. */
    let left = "", right = "";
    const shaftTop = top + headH;
    const shaftEnd = base - tip;
    for (let y = shaftTop; y < shaftEnd; y += pitch) {
      const y2 = Math.min(y + pitch / 2, shaftEnd);
      const y3 = Math.min(y + pitch, shaftEnd);
      left += `L${cx - halfW} ${r(y2)} L${cx - halfW + 3.4} ${r(y3)} `;
      right = `L${cx + halfW - 3.4} ${r(y2)} L${cx + halfW} ${r(y3)} ` + right;
    }

    let thread = "";
    for (let y = shaftTop + 2; y < shaftEnd - 2; y += pitch) {
      thread += `M${cx - halfW + 1} ${r(y)} L${cx + halfW - 1} ${r(y + pitch * 0.55)} `;
    }

    /* ── the person ── */
    const headR = ph * 0.075;
    const shoulder = personTop + headR * 2.5;
    const hip = personTop + ph * 0.54;
    const bodyW = ph * 0.24;
    const legW = ph * 0.085;
    const px = 168;

    plate.insertAdjacentHTML("afterbegin", `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img"
           aria-label="The screw, eleven feet three inches tall, drawn beside a person of average height at the same scale">
        <line x1="52" y1="${top}" x2="52" y2="${base}" stroke="rgba(252,248,240,.16)" stroke-width="1"/>
        <path d="${ticks}" stroke="rgba(252,248,240,.32)" stroke-width="1" fill="none"/>
        ${labels}
        <line x1="52" y1="${base}" x2="${W - 14}" y2="${base}"
              stroke="rgba(252,248,240,.16)" stroke-width="1"/>

        <g fill="rgba(252,248,240,.28)">
          <circle cx="${px}" cy="${r(personTop + headR)}" r="${r(headR)}"/>
          <rect x="${r(px - bodyW / 2)}" y="${r(shoulder)}"
                width="${r(bodyW)}" height="${r(hip - shoulder)}" rx="${r(bodyW * 0.34)}"/>
          <rect x="${r(px - bodyW / 2 + 1)}" y="${r(hip - 2)}"
                width="${r(legW)}" height="${r(base - hip + 2)}" rx="${r(legW * 0.4)}"/>
          <rect x="${r(px + bodyW / 2 - legW - 1)}" y="${r(hip - 2)}"
                width="${r(legW)}" height="${r(base - hip + 2)}" rx="${r(legW * 0.4)}"/>
        </g>
        <text x="${px}" y="${r(personTop - 7)}" text-anchor="middle" font-size="7.5"
              fill="rgba(252,248,240,.46)" font-family="Inter, sans-serif">5 ft 6 in</text>

        <g>
          <path d="M${cx - halfW} ${shaftTop} ${left} L${cx} ${base}
                   ${right} L${cx + halfW} ${shaftTop} Z" fill="#E8461C"/>
          <path d="${thread}" stroke="rgba(11,16,27,.34)" stroke-width="2" fill="none"/>
          <rect x="${cx - headW}" y="${top}" width="${headW * 2}" height="${headH}"
                rx="2.5" fill="#D9A441"/>
          <rect x="${cx - 5}" y="${top + 4.5}" width="10" height="6" rx="1.5"
                fill="#0B101B" opacity=".5"/>
        </g>
        <text x="${cx}" y="${top - 11}" text-anchor="middle" font-size="9.5"
              fill="#F0C87A" font-family="Inter, sans-serif" letter-spacing=".1em">11 FT 3 IN</text>
      </svg>`);
  }

  /* SVG attributes want numbers, not seventeen decimal places of one. */
  function r(n) { return Math.round(n * 10) / 10; }
})();
