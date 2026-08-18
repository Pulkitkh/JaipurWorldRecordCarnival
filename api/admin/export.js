/* ============================================================
   GET /api/admin/export — every enquiry, as a CSV file.

   The point of a spreadsheet export is that the data does not live only
   in this website. Somebody should be able to take the list to a meeting
   on a laptop with no internet.
   ============================================================ */

import { requireAdmin } from "../_lib/auth.js";
import { query, withSchema } from "../_lib/db.js";
import { json, methodNotAllowed } from "../_lib/http.js";

const COLUMNS = [
  ["ref", "Reference"],
  ["created_at", "Received"],
  ["name", "Name"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["organisation", "Organisation"],
  ["writing_as", "Writing as"],
  ["people", "People (number)"],
  ["people_raw", "People (as written)"],
  ["note", "What they have in mind"],
  ["status", "Status"],
  ["admin_note", "Our note"],
  ["handled_at", "First handled"],
];

/* A leading =, +, - or @ makes a spreadsheet treat the cell as a formula.
   A note beginning "=see attached" would be executed by Excel, which is
   how a contact list becomes an attack. Prefixing an apostrophe keeps the
   text visible and inert. */
function cell(value) {
  if (value === null || value === undefined) return "";
  let out = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(out)) out = `'${out}`;
  if (/["\n,]/.test(out)) out = `"${out.split('"').join('""')}"`;
  return out;
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const rows = await withSchema(() =>
      query(
        `select ${COLUMNS.map(([c]) => c).join(", ")}
           from enquiries order by created_at desc limit 20000`
      )
    );

    const lines = [COLUMNS.map(([, label]) => cell(label)).join(",")];
    for (const row of rows.rows) {
      lines.push(COLUMNS.map(([c]) => cell(row[c])).join(","));
    }

    const stamp = new Date().toISOString().slice(0, 10);
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("Content-Disposition", `attachment; filename="jwrc-enquiries-${stamp}.csv"`);
    /* The byte-order mark is what makes Excel on Windows read the file as
       UTF-8 instead of guessing, which is the difference between a name
       spelled correctly and one full of question marks. */
    res.end("﻿" + lines.join("\r\n") + "\r\n");
  } catch (err) {
    console.error("[admin] export failed", err);
    return json(res, 500, { ok: false, error: "The export could not be built." });
  }
}
