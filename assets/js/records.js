/* ============================================================
   JWRC — The records

   Six of the eleven records have photographs. Five do not, and a page
   about counting can do better than a paragraph where a picture should
   be: those five get a drawn plate that renders the number itself, one
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
    try { plates(); } catch (e) { console.error("[records] plates", e); }
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
      const draw = kind === "year" ? drawYear : drawMarks;
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

  /* A field of marks on a grid, with enough jitter that it reads as
     something made by hand rather than printed by a machine. */
  function drawMarks(ctx, box, plate, animate) {
    const total = Number(plate.dataset.marks) || 400;
    const shape = plate.dataset.shape || "dot";
    const ink = plate.dataset.ink || "#FCF8F0";

    /* The caption sits over the bottom of the plate, so the field stops
       short of it rather than being drawn under it and hidden. */
    const pad = 18;
    const bottom = 54;
    const w = box.w - pad * 2;
    const h = box.h - pad - bottom;
    if (w <= 0 || h <= 0) return;

    /* Choose a grid whose cells are as square as possible for this count
       in this box: columns ≈ sqrt(count · width / height). */
    const cols = Math.max(1, Math.round(Math.sqrt((total * w) / h)));
    const rows = Math.ceil(total / cols);
    const cw = w / cols;
    const ch = h / rows;
    const cell = Math.min(cw, ch);

    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;

    /* Deterministic jitter. Math.random would give a different plate on
       every resize, which looks like a glitch rather than a redraw. */
    let seed = total;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    const marks = [];
    for (let i = 0; i < total; i++) {
      const col = i % cols;
      const row = (i / cols) | 0;
      marks.push([
        pad + col * cw + cw / 2 + (rnd() - 0.5) * cw * 0.34,
        pad + row * ch + ch / 2 + (rnd() - 0.5) * ch * 0.34,
        0.42 + rnd() * 0.58,
        (rnd() - 0.5) * 0.7,
      ]);
    }

    const paint = (from, to) => {
      for (let i = from; i < to; i++) {
        const [x, y, alpha, tilt] = marks[i];
        ctx.globalAlpha = alpha;
        if (shape === "dot") {
          ctx.beginPath();
          ctx.arc(x, y, Math.max(0.6, cell * 0.26), 0, Math.PI * 2);
          ctx.fill();
        } else if (shape === "leaf") {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(-0.6 + tilt);
          ctx.beginPath();
          ctx.ellipse(0, 0, cell * 0.34, cell * 0.16, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = Math.max(0.5, cell * 0.05);
          ctx.beginPath();
          ctx.moveTo(-cell * 0.34, 0);
          ctx.lineTo(-cell * 0.52, cell * 0.12);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(tilt * 0.5);
          ctx.lineWidth = Math.max(0.6, cell * 0.16);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(0, -cell * 0.3);
          ctx.lineTo(0, cell * 0.3);
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    };

    if (!animate) { paint(0, total); return; }

    /* Filled in over about a second, in whatever size batch keeps up with
       the frame — the marks accumulate on the canvas, so no frame ever
       redraws what is already there. */
    let done = 0;
    const start = performance.now();
    const DURATION = 1100;
    (function step(now) {
      const t = Math.min(1, (now - start) / DURATION);
      const target = Math.round(total * (1 - Math.pow(1 - t, 3)));
      if (target > done) { paint(done, target); done = target; }
      if (t < 1) requestAnimationFrame(step);
      else if (done < total) paint(done, total);
    })(start);
  }

  /* Three hundred and sixty-six marks, laid out the way a year is: twelve
     rows, one per month, each as long as that month. The twenty-ninth of
     February gets a ring, because it is the date the copy is about. */
  function drawYear(ctx, box, plate, animate) {
    const ink = plate.dataset.ink || "#D9A441";
    const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const pad = 22;
    const bottom = 54;
    const w = box.w - pad * 2;
    const h = box.h - pad - bottom;
    if (w <= 0 || h <= 0) return;

    const cw = w / 31;
    const ch = h / 12;
    const r = Math.max(1.1, Math.min(cw, ch) * 0.24);

    const dots = [];
    DAYS.forEach((days, month) => {
      for (let d = 0; d < days; d++) {
        dots.push([
          pad + d * cw + cw / 2,
          pad + month * ch + ch / 2,
          month === 1 && d === 28,
        ]);
      }
    });

    const paint = (from, to) => {
      for (let i = from; i < to; i++) {
        const [x, y, leap] = dots[i];
        ctx.globalAlpha = leap ? 1 : 0.72;
        ctx.fillStyle = leap ? "#FCF8F0" : ink;
        ctx.beginPath();
        ctx.arc(x, y, leap ? r * 1.2 : r, 0, Math.PI * 2);
        ctx.fill();
        if (leap) {
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = "#E8461C";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(x, y, r * 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    if (!animate) { paint(0, dots.length); return; }

    let done = 0;
    const start = performance.now();
    (function step(now) {
      const t = Math.min(1, (now - start) / 1300);
      const target = Math.round(dots.length * (1 - Math.pow(1 - t, 3)));
      if (target > done) { paint(done, target); done = target; }
      if (t < 1) requestAnimationFrame(step);
      else if (done < dots.length) paint(done, dots.length);
    })(start);
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
