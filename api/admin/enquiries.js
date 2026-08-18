/* ============================================================
   GET   /api/admin/enquiries    the list, filtered and paged
   PATCH /api/admin/enquiries    change one enquiry's status or note

   Behind the session cookie. Nothing here is reachable without it.
   ============================================================ */

import { requireAdmin } from "../_lib/auth.js";
import { query, withSchema, STATUSES } from "../_lib/db.js";
import { json, methodNotAllowed, readJson, str, text } from "../_lib/http.js";

const PAGE_SIZE = 40;

/* Columns the list may be ordered by. An allow-list, because an order-by
   clause cannot be a bound parameter — it has to be interpolated, and the
   only safe interpolation is one chosen from a fixed set. */
const SORTS = {
  newest: "created_at desc",
  oldest: "created_at asc",
  largest: "people desc nulls last, created_at desc",
  name: "lower(name) asc",
};

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") return list(req, res);
  if (req.method === "PATCH") return update(req, res);
  return methodNotAllowed(res, ["GET", "PATCH"]);
}

async function list(req, res) {
  const url = new URL(req.url, "http://localhost");
  const status = str(url.searchParams.get("status"), 20);
  const as = str(url.searchParams.get("as"), 60);
  const q = str(url.searchParams.get("q"), 80);
  const sort = SORTS[url.searchParams.get("sort")] ? url.searchParams.get("sort") : "newest";
  const page = Math.max(1, Math.min(500, Number(url.searchParams.get("page")) || 1));

  const where = [];
  const args = [];
  if (STATUSES.includes(status)) {
    args.push(status);
    where.push(`status = $${args.length}`);
  }
  if (as) {
    args.push(as);
    where.push(`writing_as = $${args.length}`);
  }
  if (q) {
    args.push(`%${q.toLowerCase()}%`);
    const i = args.length;
    where.push(
      `(lower(name) like $${i} or lower(coalesce(organisation,'')) like $${i}
        or lower(coalesce(email,'')) like $${i} or phone_digits like $${i}
        or lower(note) like $${i} or lower(ref) like $${i})`
    );
  }
  const clause = where.length ? `where ${where.join(" and ")}` : "";

  try {
    const data = await withSchema(async () => {
      const rows = await query(
        `select id, ref, created_at, name, phone, email, organisation,
                writing_as, people, people_raw, note, status, admin_note,
                handled_at, source_page, ip_hash
           from enquiries ${clause}
          order by ${SORTS[sort]}
          limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`,
        args
      );
      const total = await query(`select count(*)::int as n from enquiries ${clause}`, args);

      /* The counts the header shows are of everything, not of the current
         filter — otherwise clicking "contacted" would report that there
         are no new enquiries, which is the opposite of the truth. */
      const byStatus = await query(
        `select status, count(*)::int as n from enquiries group by status`
      );
      const byAs = await query(
        `select writing_as, count(*)::int as n from enquiries group by writing_as order by n desc`
      );
      const totals = await query(
        `select count(*)::int as all_time,
                count(*) filter (where created_at > now() - interval '7 days')::int as week,
                coalesce(sum(people), 0)::int as people
           from enquiries`
      );

      return {
        rows: rows.rows,
        total: total.rows[0].n,
        byStatus: Object.fromEntries(byStatus.rows.map((r) => [r.status, r.n])),
        byAs: byAs.rows,
        summary: totals.rows[0],
      };
    });

    return json(res, 200, {
      ok: true,
      page,
      pageSize: PAGE_SIZE,
      pages: Math.max(1, Math.ceil(data.total / PAGE_SIZE)),
      statuses: STATUSES,
      ...data,
    });
  } catch (err) {
    console.error("[admin] list failed", err);
    return json(res, 500, { ok: false, error: describe(err) });
  }
}

async function update(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    body = null;
  }
  if (!body) return json(res, 400, { ok: false, error: "We could not read that." });

  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1) {
    return json(res, 400, { ok: false, error: "Which enquiry?" });
  }

  const sets = [];
  const args = [];
  if (body.status !== undefined) {
    const status = str(body.status, 20);
    if (!STATUSES.includes(status)) {
      return json(res, 422, { ok: false, error: "That is not one of the statuses." });
    }
    args.push(status);
    sets.push(`status = $${args.length}`);
    /* handled_at records when it stopped being new, so "how long did
       somebody wait to hear back" is answerable later. */
    sets.push(`handled_at = case when status = 'new' and $${args.length} <> 'new'
                                 then now() else handled_at end`);
  }
  if (body.admin_note !== undefined) {
    args.push(text(body.admin_note, 2000) || null);
    sets.push(`admin_note = $${args.length}`);
  }
  if (!sets.length) return json(res, 400, { ok: false, error: "Nothing to change." });

  args.push(id);
  try {
    const out = await withSchema(() =>
      query(
        `update enquiries set ${sets.join(", ")} where id = $${args.length}
         returning id, status, admin_note, handled_at`,
        args
      )
    );
    if (!out.rows.length) return json(res, 404, { ok: false, error: "No such enquiry." });
    return json(res, 200, { ok: true, row: out.rows[0] });
  } catch (err) {
    console.error("[admin] update failed", err);
    return json(res, 500, { ok: false, error: describe(err) });
  }
}

/* An administrator who cannot see the database is better served by the
   real reason than by "something went wrong" — but only an administrator
   ever reaches this code, so saying it is safe. */
function describe(err) {
  const message = String((err && err.message) || err);
  if (/no database is configured/i.test(message)) return message;
  if (/ENOTFOUND|ECONNREFUSED|timeout/i.test(message)) {
    return "The database did not answer. Check POSTGRES_URL in the project's environment variables.";
  }
  /* Worth naming, because the fix is one environment variable and the
     default message would send somebody looking at their password. */
  if (/self.signed|certificate|SSL|DEPTH_ZERO/i.test(message)) {
    return (
      "The database's TLS certificate could not be verified. If the host uses a " +
      "private authority, set PGSSL_NO_VERIFY=1 in the environment variables."
    );
  }
  return "The database returned an error. The deployment logs will have the detail.";
}
