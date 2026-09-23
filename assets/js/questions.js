/* ============================================================
   The questions page — open all, close all, and deep links.

   The accordions themselves need no JavaScript: <details> does the
   disclosure, the keyboard and the accessibility tree on its own, and
   the answers stay in the document whether this file loads or not.
   What is here is the two things the element does not give you.
   ============================================================ */
(function () {
  "use strict";

  const all = [...document.querySelectorAll("details.qa")];
  if (!all.length) return;

  const openBtn = document.getElementById("qa-open");
  const shutBtn = document.getElementById("qa-shut");

  function setAll(open) {
    for (const d of all) d.open = open;
  }
  if (openBtn) openBtn.addEventListener("click", () => setAll(true));
  if (shutBtn) shutBtn.addEventListener("click", () => setAll(false));

  /* A question somebody links to has to be open when they arrive, or the
     link lands them on a closed row and looks broken. Each summary gets an
     id derived from its own text, so the address is readable and survives
     questions being added above it — an index would not.

     Written on the <details>, not the <summary>, so that :target and the
     browser's own scroll land on the whole block. */
  function slug(text) {
    return text.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  const seen = new Set();
  for (const d of all) {
    const s = d.querySelector("summary");
    if (!s || d.id) continue;
    let id = "q-" + slug(s.textContent);
    // two questions could slug the same; keep the address unique
    let n = 2;
    while (seen.has(id)) id = "q-" + slug(s.textContent) + "-" + n++;
    seen.add(id);
    d.id = id;
  }

  function openFromHash() {
    const hash = location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el && el.matches("details.qa")) {
      el.open = true;
      /* Let the layout settle before scrolling: the panel that just opened
         is above the target on the way down, so scrolling first lands
         short of it by the height of the answer. */
      requestAnimationFrame(() => {
        el.scrollIntoView({ block: "center", behavior: "auto" });
      });
    }
  }
  openFromHash();
  addEventListener("hashchange", openFromHash);

  /* Opening a question puts its address in the bar, so a reader who wants
     to send one to a colleague can copy what is already there. replaceState
     rather than pushState — this should not fill the back button with a
     history entry for every row somebody opened on the way past. */
  for (const d of all) {
    d.addEventListener("toggle", () => {
      if (d.open && d.id) {
        try { history.replaceState(null, "", "#" + d.id); } catch (e) { /* file:// */ }
      }
    });
  }
})();
