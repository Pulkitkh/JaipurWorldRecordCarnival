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
     To the site's own API, which writes them into the enquiries table
     and answers with a reference the sender can quote on the phone.

     WhatsApp is still offered, because a great many people here would
     rather talk than fill in a form — but it is no longer instead of
     recording the enquiry. Both buttons save first; the WhatsApp one
     then opens the conversation with the message already written. An
     enquiry that only ever existed inside somebody's phone is an
     enquiry that gets lost.

     If the API is unreachable — no database configured yet, the network
     dropped — the form falls back to the old behaviour rather than
     telling somebody their message is gone. */
  const ENDPOINT = "/api/enquiry";
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
        website: get("website"),   // the honeypot; a person always sends this empty
        page: "take-part",
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

    function say(html, isError) {
      status.classList.toggle("err", Boolean(isError));
      // the only markup this ever inserts is written here, never anything
      // that came from the form
      status.innerHTML = html;
    }

    const sendButtons = () => $$('button[type="submit"]', f);

    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const how = (e.submitter && e.submitter.dataset.send) || "site";

      // validate everything, then put the cursor on the first thing wrong
      let firstBad = null;
      for (const input of $$("input, textarea", f)) {
        if (!RULES[input.name]) continue;
        if (!validate(input, true) && !firstBad) firstBad = input;
      }
      if (firstBad) {
        say("A couple of things still need filling in.", true);
        firstBad.focus();
        firstBad.scrollIntoView({ block: "center", behavior: REDUCED ? "auto" : "smooth" });
        return;
      }

      const d = collect();
      const body = compose(d);
      const subject = `Record attempt enquiry — ${d.name}${d.org ? " (" + d.org + ")" : ""}`;
      const waLink = `https://wa.me/${WHATSAPP}?text=`
                   + encodeURIComponent(subject + "\n\n" + body);

      /* A popup opened after an await has lost the click that justified
         it, and every browser blocks it. So the tab is opened now, empty,
         while the gesture is still live, and pointed somewhere once the
         enquiry has been saved. */
      let waTab = null;
      if (how === "whatsapp") waTab = window.open("", "_blank", "noopener");

      const buttons = sendButtons();
      buttons.forEach((b) => { b.disabled = true; });
      say("Sending…");

      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(d),
        });
        const out = await res.json().catch(() => null);
        if (!res.ok) throw new Error((out && out.error) || `Request failed (${res.status}).`);

        f.reset();
        if (waTab) {
          waTab.location = waLink;
          say("Saved, and WhatsApp is opening with the message written out. "
            + "Your reference is <span class=\"form-ref\">" + esc(out.ref) + "</span>");
        } else {
          say("Thank you — that has reached us, and we read every one. "
            + "We will call you on the number you gave. "
            + "Your reference is <span class=\"form-ref\">" + esc(out.ref) + "</span>");
        }
      } catch (err) {
        console.error("[take-part] send failed", err);
        /* Nothing is lost here. The message is already composed, so the
           visitor is handed it in the channel they can actually use. */
        if (waTab) {
          waTab.location = waLink;
          say("We could not save that on our side, so WhatsApp is opening with the "
            + "message written out — send it there and it will reach us.", true);
        } else {
          window.open(waLink, "_blank", "noopener");
          say("That did not save. WhatsApp is opening with your message written out — "
            + 'or call <a href="tel:+918003003000">+91 80030 03000</a>, '
            + 'or email <a href="mailto:' + EMAIL + '">' + EMAIL + "</a>.", true);
        }
      } finally {
        buttons.forEach((b) => { b.disabled = false; });
      }
    });
  }

  /* The reference comes from our own server and is six letters from a
     fixed alphabet, so it cannot contain markup — but it is a value
     arriving over the network being put into innerHTML, and those get
     escaped without exception. */
  function esc(value) {
    const div = document.createElement("div");
    div.textContent = String(value == null ? "" : value);
    return div.innerHTML;
  }
})();
