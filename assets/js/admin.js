/* ============================================================
   JWRC — the enquiries console

   Sign in, list what came in, change a status, write a note, take the
   spreadsheet away.

   Everything on this page was typed by a stranger into a public form, so
   nothing is ever put into innerHTML. Every value goes in through
   textContent or a property, which cannot be read as markup. That is the
   whole defence against somebody sending an enquiry whose name is a
   script tag, and it is why this file builds elements instead of
   composing strings.
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);

  const boot = $("#boot");
  const gate = $("#gate");
  const app = $("#app");

  const state = { status: "", as: "", q: "", sort: "newest", page: 1 };
  let searchTimer = null;

  /* ---------- talking to the server ---------- */

  async function api(path, opts) {
    const { ownsAuth, ...init } = opts || {};
    const res = await fetch(path, {
      credentials: "same-origin",
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) },
      ...init,
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      /* an HTML error page, not JSON — leave body null and let the
         status code speak */
    }
    /* A 401 on a data request means the session ran out while somebody was
       reading, so the door closes and says so. A 401 on the sign-in
       request itself means the password was wrong — and if that were
       handled here too, the answer to a wrong password would be "your
       session has ended", which is nonsense for somebody who has not been
       in yet. Callers that own their own authentication say so. */
    if (res.status === 401 && !ownsAuth) {
      showGate("Your session has ended. Please sign in again.");
      throw new Error("signed out");
    }
    if (!res.ok) throw new Error((body && body.error) || `Request failed (${res.status}).`);
    return body;
  }

  /* ---------- which screen ---------- */

  function showGate(message) {
    boot.hidden = true;
    app.hidden = true;
    gate.hidden = false;
    const msg = $("#gate-msg");
    msg.textContent = message || "";
    msg.classList.toggle("err", Boolean(message));
    const pw = $("#pw");
    if (pw) pw.value = "";
  }

  function showApp() {
    boot.hidden = true;
    gate.hidden = true;
    app.hidden = false;
    load();
  }

  /* ---------- sign in ---------- */

  $("#signin").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pw = $("#pw");
    const go = $("#signin-go");
    const msg = $("#gate-msg");
    if (!pw.value) {
      msg.textContent = "Enter the password.";
      msg.classList.add("err");
      pw.focus();
      return;
    }
    go.disabled = true;
    msg.classList.remove("err");
    msg.textContent = "Signing in…";
    try {
      await api("/api/admin/session", {
        method: "POST",
        body: JSON.stringify({ password: pw.value }),
        ownsAuth: true,
      });
      pw.value = "";
      showApp();
    } catch (err) {
      msg.textContent = err.message;
      msg.classList.add("err");
      pw.select();
    } finally {
      go.disabled = false;
    }
  });

  $("#signout").addEventListener("click", async () => {
    try {
      await api("/api/admin/session", { method: "DELETE" });
    } catch {
      /* signed out either way */
    }
    showGate("Signed out.");
  });

  /* ---------- filters ---------- */

  $("#q").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    const value = e.target.value;
    /* Wait for a pause in typing. Querying on every keystroke would put
       six requests in flight for one word and show them out of order. */
    searchTimer = setTimeout(() => {
      state.q = value;
      state.page = 1;
      load();
    }, 260);
  });

  $("#as").addEventListener("change", (e) => {
    state.as = e.target.value;
    state.page = 1;
    load();
  });

  $("#sort").addEventListener("change", (e) => {
    state.sort = e.target.value;
    state.page = 1;
    load();
  });

  $("#pager").addEventListener("click", (e) => {
    const button = e.target.closest("button[data-step]");
    if (!button || button.disabled) return;
    state.page = Math.max(1, state.page + Number(button.dataset.step));
    load();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------- the list ---------- */

  async function load() {
    const params = new URLSearchParams();
    if (state.status) params.set("status", state.status);
    if (state.as) params.set("as", state.as);
    if (state.q) params.set("q", state.q);
    params.set("sort", state.sort);
    params.set("page", String(state.page));

    const count = $("#count");
    count.textContent = "Loading…";

    let data;
    try {
      data = await api(`/api/admin/enquiries?${params}`);
    } catch (err) {
      if (err.message === "signed out") return;
      count.textContent = "";
      empty("That did not load", err.message);
      return;
    }

    stats(data);
    pills(data);
    writingAs(data);

    count.textContent = data.total === 0 ? "" : `${data.total} ${data.total === 1 ? "enquiry" : "enquiries"}`;

    const list = $("#list");
    list.textContent = "";
    if (!data.rows.length) {
      empty(
        state.q || state.status || state.as ? "Nothing matches that" : "No enquiries yet",
        state.q || state.status || state.as
          ? "Try a wider search, or clear the filters."
          : "When somebody sends the form on the Take part page, they will appear here."
      );
    } else {
      for (const row of data.rows) list.append(card(row, data.statuses));
    }

    const pager = $("#pager");
    pager.hidden = data.pages <= 1;
    if (!pager.hidden) {
      $("#pager-at").textContent = `Page ${data.page} of ${data.pages}`;
      pager.querySelector('[data-step="-1"]').disabled = data.page <= 1;
      pager.querySelector('[data-step="1"]').disabled = data.page >= data.pages;
    }
  }

  function empty(title, body) {
    const list = $("#list");
    list.textContent = "";
    const box = el("div", "ad-empty");
    box.append(el("h2", "", title));
    const p = el("p", "", body);
    box.append(p);
    list.append(box);
  }

  function stats(data) {
    const wrap = $("#stats");
    wrap.textContent = "";
    const cards = [
      ["New, waiting", data.byStatus.new || 0, true],
      ["This week", data.summary.week || 0, false],
      ["All time", data.summary.all_time || 0, false],
      ["People offered", (data.summary.people || 0).toLocaleString("en-IN"), false],
    ];
    for (const [label, value, hot] of cards) {
      const box = el("div", "ad-stat" + (hot && Number(value) > 0 ? " hot" : ""));
      box.append(el("b", "", String(value)), el("span", "", label));
      wrap.append(box);
    }
  }

  function pills(data) {
    const wrap = $("#pills");
    wrap.textContent = "";
    const all = [["", "Everything", data.summary.all_time || 0]].concat(
      data.statuses.map((s) => [s, s[0].toUpperCase() + s.slice(1), data.byStatus[s] || 0])
    );
    for (const [value, label, n] of all) {
      const b = el("button", "ad-pill", label);
      b.type = "button";
      b.setAttribute("aria-pressed", String(state.status === value));
      const badge = el("i", "", String(n));
      b.append(badge);
      b.addEventListener("click", () => {
        state.status = value;
        state.page = 1;
        load();
      });
      wrap.append(b);
    }
  }

  /* The list of who is writing comes from the data, not from a hard-coded
     list, so it always matches what is actually in the table — including
     "Other", which only appears once somebody has posted something the
     form does not offer. */
  function writingAs(data) {
    const select = $("#as");
    const current = state.as;
    select.textContent = "";
    select.append(new Option("Everyone", ""));
    for (const row of data.byAs) {
      select.append(new Option(`${row.writing_as} (${row.n})`, row.writing_as));
    }
    select.value = current;
    if (select.value !== current) select.value = "";
  }

  function card(row, statuses) {
    const box = el("article", "ad-row");
    box.dataset.status = row.status;

    /* ── who ── */
    const head = el("div", "ad-head");
    const who = el("div", "ad-who");
    who.append(el("h2", "", row.name));
    if (row.organisation) who.append(el("p", "ad-org", row.organisation));

    const meta = el("div", "ad-meta");
    meta.append(el("span", "ref", row.ref));
    meta.append(el("span", "", when(row.created_at)));
    meta.append(el("span", "ad-tag", row.writing_as));
    if (row.people_raw) {
      meta.append(el("span", "ad-tag people", `${row.people_raw} people`));
    }
    who.append(meta);
    head.append(who);

    /* ── status ── */
    const statusWrap = el("div", "ad-status");
    const label = el("label", "vh", `Status of the enquiry from ${row.name}`);
    const select = document.createElement("select");
    const id = `st-${row.id}`;
    select.id = id;
    label.setAttribute("for", id);
    for (const s of statuses) select.append(new Option(s[0].toUpperCase() + s.slice(1), s));
    select.value = row.status;
    statusWrap.append(label, select);
    head.append(statusWrap);
    box.append(head);

    /* ── how to reach them ── */
    const contact = el("div", "ad-contact");
    contact.append(link(`tel:${row.phone.replace(/[^\d+]/g, "")}`, row.phone, icon("phone")));
    const digits = row.phone.replace(/\D/g, "");
    const wa = link(
      `https://wa.me/${digits.length === 10 ? "91" + digits : digits}`,
      "WhatsApp",
      icon("wa")
    );
    wa.classList.add("wa");
    wa.target = "_blank";
    wa.rel = "noopener noreferrer";
    contact.append(wa);
    if (row.email) contact.append(link(`mailto:${row.email}`, row.email, icon("mail")));
    box.append(contact);

    /* ── what they wrote ── */
    box.append(el("p", "ad-note", row.note));

    /* ── what we did about it ── */
    const mine = el("div", "ad-mine");
    const noteId = `note-${row.id}`;
    const noteLabel = el("label", "ad-field-label", "Our note");
    noteLabel.setAttribute("for", noteId);
    const area = document.createElement("textarea");
    area.id = noteId;
    area.rows = 2;
    area.placeholder = "Called on the 14th, sending dates…";
    area.value = row.admin_note || "";
    const saved = el("span", "ad-saved", "");
    mine.append(noteLabel, area, saved);
    box.append(mine);

    /* Saving happens on blur, not on every keystroke: one request when
       somebody finishes typing rather than forty while they do. */
    let lastNote = area.value;
    area.addEventListener("blur", () => {
      if (area.value === lastNote) return;
      lastNote = area.value;
      save(row.id, { admin_note: area.value }, saved, "Note saved.");
    });

    select.addEventListener("change", () => {
      box.dataset.status = select.value;
      save(row.id, { status: select.value }, saved, `Marked ${select.value}.`);
    });

    return box;
  }

  async function save(id, patch, where, done) {
    where.className = "ad-saved";
    where.textContent = "Saving…";
    try {
      await api("/api/admin/enquiries", { method: "PATCH", body: JSON.stringify({ id, ...patch }) });
      where.className = "ad-saved ok";
      where.textContent = done;
      setTimeout(() => {
        if (where.textContent === done) where.textContent = "";
      }, 2600);
    } catch (err) {
      if (err.message === "signed out") return;
      where.className = "ad-saved err";
      where.textContent = err.message;
    }
  }

  /* ---------- small builders ---------- */

  function el(tag, cls, textContent) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (textContent !== undefined) node.textContent = textContent;
    return node;
  }

  function link(href, label, svg) {
    const a = document.createElement("a");
    a.href = href;
    if (svg) a.append(svg);
    a.append(document.createTextNode(label));
    return a;
  }

  const PATHS = {
    phone: "M2.5 3.5C2.5 2.7 3.2 2 4 2h1.6c.4 0 .8.3.9.7l.7 2.3c.1.4 0 .8-.3 1l-1 .8a9 9 0 0 0 3.3 3.3l.8-1c.2-.3.6-.4 1-.3l2.3.7c.4.1.7.5.7.9V12c0 .8-.7 1.5-1.5 1.5A11.5 11.5 0 0 1 2.5 3.5Z",
    mail: "M2 4.5h12v7H2zM2 5l6 4 6-4",
    wa: "M8 1.2a6.8 6.8 0 0 0-5.9 10.2L1.2 14.8l3.5-.9A6.8 6.8 0 1 0 8 1.2Zm3.9 9.6c-.2.5-.9.9-1.3.9-.4 0-.8.2-2.6-.5A8.4 8.4 0 0 1 4.4 8c-.1-.2-.8-1.1-.8-2.1s.5-1.5.7-1.7c.2-.2.4-.2.5-.2h.4c.2 0 .3 0 .5.4l.7 1.6c0 .1 0 .2-.1.4l-.2.3-.3.2c0 .1-.1.2 0 .3.1.2.4.8 1 1.3.6.5 1.2.7 1.4.8.1 0 .2 0 .3-.1l.5-.6c.1-.2.3-.2.4-.1l1.5.7c.2.1.3.2.4.3 0 .1 0 .5-.2 1Z",
  };

  function icon(kind) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", PATHS[kind]);
    if (kind === "mail") {
      svg.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.4");
      path.setAttribute("stroke-linejoin", "round");
    } else {
      path.setAttribute("fill", "currentColor");
    }
    svg.append(path);
    return svg;
  }

  /* "3 hours ago" is easier to act on than a timestamp, but the exact
     time still has to be available — it goes in the title. */
  function when(iso) {
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return "";
    const mins = Math.round((Date.now() - then.getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    const days = Math.round(hours / 24);
    if (days < 8) return `${days} ${days === 1 ? "day" : "days"} ago`;
    return then.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  /* ---------- start ---------- */

  (async function start() {
    try {
      const session = await fetch("/api/admin/session", { credentials: "same-origin" }).then((r) => r.json());
      if (session && session.signedIn) showApp();
      else if (session && !session.configured) {
        showGate(
          "No password is set for this site yet. Add ADMIN_PASSWORD to the project's environment variables in Vercel, then redeploy."
        );
      } else showGate("");
    } catch {
      showGate("");
    }
  })();
})();
