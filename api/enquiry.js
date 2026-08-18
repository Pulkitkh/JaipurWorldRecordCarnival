/* ============================================================
   POST /api/enquiry
   The one public write in the whole site: somebody filling in the
   form on the Take part page.

   Everything arriving here is untrusted. It is validated, trimmed,
   pulled apart into real columns, and inserted with bound parameters —
   never string-concatenated into SQL.
   ============================================================ */

import crypto from "node:crypto";
import { withSchema, query, WRITING_AS } from "./_lib/db.js";
import {
  json,
  methodNotAllowed,
  readJson,
  clientIp,
  hashIp,
  str,
  text,
} from "./_lib/http.js";

/* An enquiry is a phone call waiting to happen, so the bar is low: who
   you are, how to reach you, and one line about what you have in mind.
   The rest is optional and the form says so. */
const RULES = {
  name: (v) => v.length >= 2,
  phone: (v) => v.replace(/\D/g, "").length >= 7,
  note: (v) => v.length >= 3,
};

/* Same address, five enquiries in an hour: something is wrong, and it is
   more likely a script than five schools in one building. The window is
   generous on purpose — a genuine sender who mistypes their number and
   sends again should never meet this. */
const MAX_PER_HOUR = 5;

/* People write "about 500", "500-600", "no idea yet". Keep what they
   wrote, and pull out a number as well when there is one, so the admin
   page can sort and total by size. */
function peopleCount(raw) {
  const match = raw.replace(/[,\s]/g, "").match(/\d+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) && n > 0 && n < 10_000_000 ? n : null;
}

/* A short reference the sender can quote on the phone. Base32 without
   the letters that get misheard, so it survives being read aloud. */
function reference() {
  const alphabet = "ACDEFGHJKLMNPQRTUVWXY34679";
  const bytes = crypto.randomBytes(6);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `JWRC-${out}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  let body;
  try {
    body = await readJson(req);
  } catch {
    return json(res, 413, { ok: false, error: "That message was too long to accept." });
  }
  if (!body || typeof body !== "object") {
    return json(res, 400, { ok: false, error: "We could not read that." });
  }

  /* The honeypot. A field the stylesheet hides and no person will ever
     see, which most form bots fill in because it is there. Answer 200 so
     the bot believes it succeeded and does not come back to try harder —
     but write nothing. */
  if (str(body.website)) {
    return json(res, 200, { ok: true, ref: reference() });
  }

  const d = {
    name: str(body.name, 120),
    phone: str(body.phone, 40),
    email: str(body.email, 160).toLowerCase(),
    org: str(body.org, 160),
    as: str(body.as, 60),
    people: str(body.people, 60),
    note: text(body.note, 4000),
  };

  const bad = Object.keys(RULES).filter((k) => !RULES[k](d[k]));
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) bad.push("email");
  if (bad.length) {
    return json(res, 422, {
      ok: false,
      error: "Some answers still need filling in.",
      fields: bad,
    });
  }

  const writingAs = WRITING_AS.includes(d.as) ? d.as : "Other";
  const ip = hashIp(clientIp(req));
  const ref = reference();

  try {
    const row = await withSchema(async () => {
      if (ip) {
        const recent = await query(
          `select count(*)::int as n from enquiries
            where ip_hash = $1 and created_at > now() - interval '1 hour'`,
          [ip]
        );
        if (recent.rows[0].n >= MAX_PER_HOUR) {
          const err = new Error("rate limited");
          err.rateLimited = true;
          throw err;
        }
      }
      const insert = await query(
        `insert into enquiries
           (ref, name, phone, phone_digits, email, organisation,
            writing_as, people, people_raw, note,
            source_page, referrer, user_agent, ip_hash)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         returning ref, created_at`,
        [
          ref,
          d.name,
          d.phone,
          d.phone.replace(/\D/g, ""),
          d.email || null,
          d.org || null,
          writingAs,
          peopleCount(d.people),
          d.people || null,
          d.note,
          str(body.page, 120) || "take-part",
          str(req.headers.referer, 300) || null,
          str(req.headers["user-agent"], 300) || null,
          ip,
        ]
      );
      return insert.rows[0];
    });

    return json(res, 201, { ok: true, ref: row.ref, at: row.created_at });
  } catch (err) {
    if (err && err.rateLimited) {
      return json(res, 429, {
        ok: false,
        error:
          "We already have your enquiry — give us a little while to read it. " +
          "If it is urgent, please call +91 80030 03000.",
      });
    }
    /* A duplicate reference is a one-in-three-hundred-million collision,
       not a reason to lose the enquiry: tell the sender to send again. */
    if (err && err.code === "23505") {
      return json(res, 503, { ok: false, error: "Please send that once more." });
    }
    console.error("[enquiry] insert failed", err);
    return json(res, 500, {
      ok: false,
      error: "That did not save. Please call +91 80030 03000 or send it on WhatsApp.",
    });
  }
}
