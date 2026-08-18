/* ============================================================
   JWRC — Take part
   The enquiry form: validation, and handing the finished message
   to whichever channel the visitor picked.
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Where enquiries go ─────────────────────────────────────
     There is no server behind this site, so the form does not POST
     anywhere. Rather than pretend to and lose enquiries silently, it
     composes the message and opens WhatsApp or the mail client with it
     already written.

     To switch to a real endpoint later — a Formspree URL, a Vercel
     function, anything that accepts a POST — put it in ENDPOINT below.
     The form will send in the background and show its own confirmation,
     and the two send buttons become a single Send. Nothing else needs
     to change. */
  const ENDPOINT = "";
  const WHATSAPP = "918003003000";
  const EMAIL = "manmohan.agarwal015@gmail.com";

  document.addEventListener("DOMContentLoaded", () => {
    try { reveal(); } catch (e) { console.error("[take-part] reveal", e); }
    try { form(); } catch (e) { console.error("[take-part] form", e); }
  });

  /* Photographs uncover rather than fade. Same idiom as the other pages:
     the clip lives on the image, never on the observed element, because
     Chrome's IntersectionObserver counts clipping as visibility and an
     element hidden that way would never trigger its own reveal. */
  function reveal() {
    const els = $$("[data-reveal]");
    if (!els.length) return;
    if (REDUCED) { els.forEach((e) => e.classList.add("is-shown")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-shown");
        io.unobserve(e.target);
        setTimeout(() => e.target.classList.add("is-done"), 1200);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    els.forEach((el) => io.observe(el));
  }

  function form() {
    const f = $("#enquiry");
    if (!f) return;
    const status = $("#q-status");

    /* Each rule says how to judge one field. Keeping them together means
       the same check runs on blur, on input and on submit, so a field can
       never disagree with itself. */
    const RULES = {
      name:  (v) => v.trim().length >= 2,
      phone: (v) => v.replace(/[^\d]/g, "").length >= 7,
      email: (v) => v.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
      note:  (v) => v.trim().length >= 3,
    };

    function fieldOf(input) { return input.closest(".field"); }

    function validate(input, show) {
      const rule = RULES[input.name];
      if (!rule) return true;
      const ok = rule(input.value);
      const wrap = fieldOf(input);
      if (wrap) wrap.classList.toggle("err", !ok && show);
      // the message element is named by aria-describedby only while it is
      // showing, so a screen reader is not told about an error that is not
      // being displayed yet
      const msg = $(".msg", wrap || f);
      if (msg) {
        if (!ok && show) { input.setAttribute("aria-describedby", msg.id || ""); input.setAttribute("aria-invalid", "true"); }
        else { input.removeAttribute("aria-describedby"); input.removeAttribute("aria-invalid"); }
      }
      return ok;
    }

    for (const input of $$("input, textarea", f)) {
      if (!RULES[input.name]) continue;
      // judged on blur, per the guidance — nagging while somebody is still
      // typing their own name is worse than saying nothing
      input.addEventListener("blur", () => validate(input, true));
      // but once a field is already marked wrong, correct it live
      input.addEventListener("input", () => {
        if (fieldOf(input) && fieldOf(input).classList.contains("err")) validate(input, true);
      });
    }

    function collect() {
      const get = (n) => (f.elements[n] ? String(f.elements[n].value || "").trim() : "");
      const as = f.querySelector('input[name="as"]:checked');
      return {
        name: get("name"), phone: get("phone"), email: get("email"),
        org: get("org"), people: get("people"), note: get("note"),
        as: as ? as.value : "",
      };
    }

    function compose(d) {
      const lines = [
        `Name: ${d.name}`,
        `Phone: ${d.phone}`,
        d.email ? `Email: ${d.email}` : "",
        d.org ? `Organisation: ${d.org}` : "",
        `Writing as: ${d.as}`,
        d.people ? `People they could gather: ${d.people}` : "",
        "",
        d.note,
      ];
      return lines.filter((l) => l !== "").join("\n");
    }

    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const how = (e.submitter && e.submitter.dataset.send) || "whatsapp";

      // validate everything, then put the cursor on the first thing wrong
      let firstBad = null;
      for (const input of $$("input, textarea", f)) {
        if (!RULES[input.name]) continue;
        if (!validate(input, true) && !firstBad) firstBad = input;
      }
      if (firstBad) {
        status.textContent = "A couple of things still need filling in.";
        status.classList.add("err");
        firstBad.focus();
        firstBad.scrollIntoView({ block: "center", behavior: REDUCED ? "auto" : "smooth" });
        return;
      }

      const d = collect();
      const body = compose(d);
      status.classList.remove("err");

      if (ENDPOINT) {
        status.textContent = "Sending…";
        try {
          const res = await fetch(ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(d),
          });
          if (!res.ok) throw new Error(res.status);
          f.reset();
          status.textContent = "Thank you — that has reached us. We will call you.";
        } catch (err) {
          console.error("[take-part] send failed", err);
          status.classList.add("err");
          status.innerHTML =
            'That did not send. Please call <a href="tel:+918003003000">+91 80030 03000</a> ' +
            'or email <a href="mailto:' + EMAIL + '">' + EMAIL + "</a>.";
        }
        return;
      }

      const subject = `Record attempt enquiry — ${d.name}${d.org ? " (" + d.org + ")" : ""}`;
      if (how === "email") {
        location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}`
                      + `&body=${encodeURIComponent(body)}`;
        status.textContent = "Opening your email app with the message written out.";
      } else {
        window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(subject + "\n\n" + body)}`,
                    "_blank", "noopener");
        status.textContent = "Opening WhatsApp with the message written out.";
      }
    });
  }
})();
