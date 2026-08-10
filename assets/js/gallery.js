/* ============================================================
   JWRC — archive engine
   ------------------------------------------------------------
   A virtualised masonry built for a library that keeps growing.

   WHY VIRTUALISED, not just lazy-loaded:
   `loading="lazy"` solves bandwidth. It does not solve DOM weight —
   a thousand <img> elements is a thousand layout boxes, style
   recalculations and compositor layers whether or not the pixels
   have arrived. So this engine:

     1. measures nothing in the DOM. Tile geometry is computed from
        the intrinsic w/h in the data, so layout is O(n) arithmetic
        and there is never a reflow or a shift on load;
     2. mounts only the tiles whose computed rectangle intersects the
        viewport plus a screen and a half of buffer;
     3. recycles unmounted nodes through a pool and releases their
        image sources, so memory stays flat while you scroll.

   The result is constant DOM size regardless of library size: 284
   sample photographs and 10,000 real ones cost the same at runtime.
   ============================================================ */
(function (w) {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DPR = Math.min(devicePixelRatio || 1, 2);

  const GAP = 14;
  const TARGET_COL = 300;     // ideal column width; count is derived from it
  const BUFFER = 1.5;         // screens of over-render above and below
  const PER_PAGE = 24;        // a page of the archive; keeps the page short

  function Gallery(root, opts) {
    this.root = root;
    this.viewport = $(".gal-viewport", root);
    this.sizer = $(".gal-sizer", root);
    this.status = opts.status;
    this.all = [];
    this.view = [];
    this.rects = [];
    this.mounted = new Map();
    this.pool = [];
    this.onOpen = opts.onOpen || function () {};
    this.colW = TARGET_COL;
    this.page = 0;
    this.perPage = opts.perPage || PER_PAGE;
    this.pager = opts.pager || null;
    this.intro = false;        // animate tiles in the first time the grid is seen
    this._raf = null;
    this._seen = new Set();
    this._bind();
  }

  Gallery.prototype = {

    setItems(items) {
      this.all = items;
      this.matched = items;
      this.page = 0;
      this.applyPage();
    },

    /* `matched` is everything the filter allows; `view` is the slice on screen. */
    applyPage() {
      const start = this.page * this.perPage;
      this.view = this.matched.slice(start, start + this.perPage);
      this._seen.clear();
      this.unmountAll();
      this.layout();
      this.renderPager();
    },

    goTo(page) {
      const max = Math.max(0, Math.ceil(this.matched.length / this.perPage) - 1);
      this.page = Math.min(max, Math.max(0, page));
      this.applyPage();
      this.root.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
    },

    renderPager() {
      if (!this.pager) return;
      const pages = Math.ceil(this.matched.length / this.perPage) || 1;
      if (pages < 2) { this.pager.innerHTML = ""; return; }
      const p = this.page;
      const nums = [];
      for (let i = 0; i < pages; i++) {
        if (i === 0 || i === pages - 1 || Math.abs(i - p) <= 1) nums.push(i);
        else if (nums[nums.length - 1] !== "…") nums.push("…");
      }
      this.pager.innerHTML =
        `<button class="pg-arrow" data-go="${p - 1}"${p === 0 ? " disabled" : ""} aria-label="Previous page">‹</button>`
        + nums.map((n) => n === "…"
            ? `<span class="pg-gap">…</span>`
            : `<button class="pg-n${n === p ? " on" : ""}" data-go="${n}"
                 aria-label="Page ${n + 1}"${n === p ? ' aria-current="page"' : ""}>${n + 1}</button>`).join("")
        + `<button class="pg-arrow" data-go="${p + 1}"${p >= pages - 1 ? " disabled" : ""} aria-label="Next page">›</button>`;
    },

    /* filtering is a pure function of the data — no DOM queries */
    filter(q) {
      const term = (q.text || "").trim().toLowerCase();
      this.matched = this.all.filter((it) => {
        if (q.category && q.category !== "all" && it.category !== q.category) return false;
        if (!term) return true;
        return (it.event + " " + it.alt + " " + (it.caption || "") + " " + (it.tags || []).join(" "))
          .toLowerCase().includes(term);
      });
      this.page = 0;
      this.intro = true;                 // a new set deserves a fresh entrance
      this.applyPage();
    },

    /* ── layout: pure arithmetic over the data ── */
    layout() {
      const width = this.viewport.clientWidth;
      if (!width) return;
      const cols = Math.max(1, Math.round(width / (TARGET_COL + GAP)));
      this.colW = (width - GAP * (cols - 1)) / cols;

      const heights = new Array(cols).fill(0);
      this.rects = this.view.map((it) => {
        let c = 0;
        for (let i = 1; i < cols; i++) if (heights[i] < heights[c]) c = i;
        const h = Math.round(this.colW * (it.h / it.w));
        const rect = { x: Math.round(c * (this.colW + GAP)), y: heights[c], w: Math.round(this.colW), h };
        heights[c] += h + GAP;
        return rect;
      });

      this.sizer.style.height = (Math.max(0, ...heights) - GAP) + "px";
      this.report();
      this.update(true);
    },

    report() {
      if (!this.status) return;
      const n = this.matched.length, total = this.all.length;
      const pages = Math.ceil(n / this.perPage) || 1;
      const base = n === total
        ? `${total.toLocaleString("en-US")} photographs`
        : `${n.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} photographs`;
      this.status.textContent = pages > 1
        ? `${base} · page ${this.page + 1} of ${pages}` : base;
    },

    /* ── windowing ── */
    update(force) {
      const vh = innerHeight;
      const box = this.viewport.getBoundingClientRect();
      const top = -box.top - vh * BUFFER;
      const bottom = -box.top + vh * (1 + BUFFER);

      const wanted = new Set();
      for (let i = 0; i < this.rects.length; i++) {
        const r = this.rects[i];
        if (r.y + r.h < top) continue;
        if (r.y > bottom) break;              // rects are y-ordered enough to bail early
        wanted.add(i);
      }

      for (const [i, node] of this.mounted) {
        if (!wanted.has(i)) { this.recycle(i, node); }
      }
      wanted.forEach((i) => {
        if (!this.mounted.has(i)) this.mount(i);
        else if (force) this.place(this.mounted.get(i), this.rects[i]);
      });
    },

    place(node, r) {
      node.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
      node.style.width = r.w + "px";
      node.style.height = r.h + "px";
    },

    mount(i) {
      const it = this.view[i], r = this.rects[i];
      const node = this.pool.pop() || this.makeNode();
      node.dataset.i = i;
      node.setAttribute("aria-label", it.alt || "");
      this.place(node, r);

      const img = node.querySelector("img");
      const ph = node.querySelector(".gal-ph");
      const cap = node.querySelector(".gal-cap");

      ph.style.background = it.tone || "#2a2118";
      node.classList.remove("is-ready");
      cap.textContent = it.event || "";

      const url = w.JWRCMedia.srcFor(it, r.w, DPR);
      if (url) {
        const set = w.JWRCMedia.srcsetFor(it);
        if (set) { img.srcset = set; img.sizes = Math.round(r.w) + "px"; }
        img.alt = it.alt || "";
        img.src = url;
        if (img.complete) node.classList.add("is-ready");
      } else {
        /* No file yet — draw a scene so the layout can be judged at full
           density. Deleted automatically the moment a real src exists. */
        img.removeAttribute("src"); img.removeAttribute("srcset");
        ph.innerHTML = placeholderArt(it);
        node.classList.add("is-ready", "is-art");
      }

      this.viewport.appendChild(node);
      this.mounted.set(i, node);

      /* Entrance: the first time a tile is seen, it settles into place. Only
         once per tile per page, so scrolling back up is not a slideshow. */
      if (!REDUCED && !this._seen.has(i)) {
        this._seen.add(i);
        const order = this._seen.size - 1;
        node.classList.add("is-entering");
        node.style.setProperty("--enter-delay", Math.min(order, 14) * 45 + "ms");
        requestAnimationFrame(() => requestAnimationFrame(() =>
          node.classList.remove("is-entering")));
      }
    },

    recycle(i, node) {
      const img = node.querySelector("img");
      img.removeAttribute("src");            // releases the decoded bitmap
      img.removeAttribute("srcset");
      node.querySelector(".gal-ph").innerHTML = "";
      node.classList.remove("is-art");
      node.remove();
      this.mounted.delete(i);
      if (this.pool.length < 60) this.pool.push(node);
    },

    unmountAll() {
      for (const [i, node] of this.mounted) this.recycle(i, node);
    },

    makeNode() {
      const b = document.createElement("button");
      b.className = "gal-tile";
      b.type = "button";
      b.setAttribute("data-cursor", "View");
      b.innerHTML = '<span class="gal-ph"></span>'
        + '<img alt="" loading="lazy" decoding="async">'
        + '<span class="gal-cap"></span>';
      const img = b.querySelector("img");
      img.addEventListener("load", () => b.classList.add("is-ready"));
      b.addEventListener("click", () => this.onOpen(+b.dataset.i, this.view));
      return b;
    },

    _bind() {
      const tick = () => {
        this._raf = null;
        this.update(false);
      };
      const onScroll = () => { if (!this._raf) this._raf = requestAnimationFrame(tick); };
      addEventListener("scroll", onScroll, { passive: true });

      let rt;
      addEventListener("resize", () => {
        clearTimeout(rt);
        rt = setTimeout(() => { this.unmountAll(); this.layout(); }, 140);
      });
    },
  };

  /* ── stand-in artwork, until real files land ── */
  function placeholderArt(it) {
    const a = w.JWRCMedia.artFor(it);
    const d = document.createElement("div");
    d.className = "scene";
    d.dataset.scene = a.scene;
    d.dataset.seed = String(a.seed);
    const holder = document.createElement("div");
    holder.appendChild(d);
    if (w.JWRCArt) w.JWRCArt.build(holder);
    return holder.innerHTML;
  }

  /* ═══ Lightbox ═══ */
  function Lightbox(el) {
    this.el = el;
    this.stage = $(".lb-stage", el);
    this.capEl = $(".lb-cap", el);
    this.metaEl = $(".lb-meta", el);
    this.countEl = $(".lb-count", el);
    this.items = [];
    this.i = 0;

    $(".lb-close", el).addEventListener("click", () => this.close());
    $(".lb-prev", el).addEventListener("click", () => this.go(-1));
    $(".lb-next", el).addEventListener("click", () => this.go(1));
    el.addEventListener("click", (e) => { if (e.target === el) this.close(); });

    addEventListener("keydown", (e) => {
      if (!el.classList.contains("open")) return;
      if (e.key === "Escape") this.close();
      if (e.key === "ArrowLeft") this.go(-1);
      if (e.key === "ArrowRight") this.go(1);
    });

    // swipe
    let x0 = null;
    el.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) this.go(dx < 0 ? 1 : -1);
      x0 = null;
    }, { passive: true });
  }

  Lightbox.prototype = {
    open(i, items) {
      this.items = items; this.i = i;
      this.el.classList.add("open");
      document.body.style.overflow = "hidden";
      if (w.__lenis) w.__lenis.stop();
      this.render();
      $(".lb-close", this.el).focus();
    },
    close() {
      this.el.classList.remove("open");
      document.body.style.overflow = "";
      if (w.__lenis) w.__lenis.start();
      this.stage.innerHTML = "";
      history.replaceState(null, "", location.pathname + location.search);
    },
    go(d) {
      this.i = (this.i + d + this.items.length) % this.items.length;
      this.render();
    },
    render() {
      const it = this.items[this.i];
      if (!it) return;
      const url = w.JWRCMedia.srcFor(it, Math.min(innerWidth, 1800), DPR);
      this.stage.innerHTML = url
        ? `<img src="${url}" alt="${(it.alt || "").replace(/"/g, "&quot;")}">`
        : `<div class="lb-art">${placeholderArt(it)}</div>`;
      this.capEl.textContent = it.caption || it.alt || "";
      this.metaEl.textContent = [...new Set([it.event, String(it.year || "Undated")])].filter(Boolean).join(" · ");
      this.countEl.textContent = `${this.i + 1} / ${this.items.length}`;
      history.replaceState(null, "", "#photo=" + encodeURIComponent(it.id));

      // preload the neighbours so paging feels instant
      [1, -1].forEach((d) => {
        const n = this.items[(this.i + d + this.items.length) % this.items.length];
        const u = n && w.JWRCMedia.srcFor(n, Math.min(innerWidth, 1800), DPR);
        if (u) { const im = new Image(); im.src = u; }
      });
    },
  };

  w.JWRCGallery = { Gallery, Lightbox };
})(window);
