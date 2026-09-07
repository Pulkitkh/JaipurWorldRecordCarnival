/* ============================================================
   Legal pages — the contents list, and nothing else.

   A ten-section document scrolled past the middle gives no clue where you
   are, and "where am I" is the question a reader of a privacy notice asks
   most: they came for one section and want to know whether they have gone
   past it. So the contents list marks the section currently being read.

   IntersectionObserver rather than a scroll handler: the browser does the
   measuring off the main thread, which matters on a page that is also
   running Lenis and ScrollTrigger.
   ============================================================ */
(function () {
  "use strict";

  const secs = [...document.querySelectorAll(".lg-sec[id]")];
  const links = [...document.querySelectorAll(".lg-toc a[href^='#']")];
  if (!secs.length || !links.length) return;

  /* Both copies of the list — the sticky one beside the text and the one
     inside the phone's disclosure — point at the same ids, so a section is
     marked in whichever list is on screen. */
  const byId = new Map();
  for (const a of links) {
    const id = a.getAttribute("href").slice(1);
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(a);
  }

  let current = null;
  function mark(id) {
    if (id === current) return;
    current = id;
    for (const a of links) a.classList.remove("on");
    for (const a of byId.get(id) || []) a.classList.add("on");
  }

  /* A band across the upper third of the screen. The section whose top has
     most recently crossed it is the one being read — measuring against the
     whole viewport instead would mark two sections at once for most of a
     long scroll. */
  const seen = new Set();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) seen.add(e.target.id);
      else seen.delete(e.target.id);
    }
    /* Whichever of the visible sections comes first in the document — so
       scrolling backwards up the page marks the same section that scrolling
       forwards through it did. */
    const first = secs.find((s) => seen.has(s.id));
    if (first) mark(first.id);
  }, { rootMargin: "-20% 0px -70% 0px", threshold: 0 });

  for (const s of secs) io.observe(s);

  /* Tapping an entry on a phone should close the list behind it. Left open,
     it pushes the section you just chose off the bottom of the screen. */
  const sheet = document.querySelector(".lg-toc-m");
  if (sheet) {
    sheet.addEventListener("click", (e) => {
      if (e.target.closest("a")) sheet.open = false;
    });
  }
})();
