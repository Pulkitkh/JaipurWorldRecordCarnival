/* ============================================================
   The database connection, and the shape of what goes in it.

   Files under api/_lib are not routes — Vercel skips anything whose
   name begins with an underscore — so this is shared code, not an
   endpoint.

   One pool, reused. A serverless function is not a fresh process on
   every request: the container is kept warm between invocations, so a
   pool held on the module scope survives and a second request costs no
   handshake. Making a new client per request works too, but it opens a
   connection for every form submission and Postgres notices.
   ============================================================ */

import pg from "pg";

const { Pool } = pg;

/* Whichever name the host used. Vercel's own Postgres sets POSTGRES_URL;
   the Neon and Supabase integrations set DATABASE_URL; some set both. We
   accept any of them so the site works wherever it is pointed, and say
   so plainly if none is set rather than failing with a stack trace about
   an undefined string. */
export function connectionString() {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ""
  );
}

let pool = null;

export function db() {
  if (pool) return pool;
  const url = connectionString();
  if (!url) {
    throw new Error(
      "No database is configured. Set POSTGRES_URL (or DATABASE_URL) in the " +
        "project's environment variables."
    );
  }
  const local = /@(localhost|127\.0\.0\.1)/.test(url);
  pool = new Pool({
    connectionString: url,
    /* TLS, with the certificate actually checked. Neon, Supabase and Vercel
       Postgres all present chains from public authorities, so verification
       succeeds — and this table holds people's phone numbers, which is not
       a table to carry over a connection that would accept any certificate
       offered. A host with a private CA can set PGSSL_NO_VERIFY=1 and
       knowingly give that up; a database on this machine needs no
       certificate at all. */
    ssl: local ? false : { rejectUnauthorized: process.env.PGSSL_NO_VERIFY !== "1" },
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
  });
  pool.on("error", (err) => console.error("[db] idle client error", err));
  return pool;
}

export async function query(text, params) {
  return db().query(text, params);
}

/* The schema lives here as well as in db/schema.sql so that a fresh
   database needs no setup step. The first write to a missing table
   raises 42P01; we create everything and try once more. After that the
   table exists and this never runs again.

   Keeping the two copies in step matters — db/schema.sql is what
   somebody will read to understand the table. */
export const SCHEMA = `
create table if not exists enquiries (
  id            bigserial    primary key,
  ref           text         not null unique,
  created_at    timestamptz  not null default now(),

  name          text         not null,
  phone         text         not null,
  phone_digits  text         not null,
  email         text,
  organisation  text,

  writing_as    text         not null,
  people        integer,
  people_raw    text,
  note          text         not null,

  status        text         not null default 'new',
  admin_note    text,
  handled_at    timestamptz,

  source_page   text,
  referrer      text,
  user_agent    text,
  ip_hash       text
);

create index if not exists enquiries_created_idx on enquiries (created_at desc);
create index if not exists enquiries_status_idx  on enquiries (status);
create index if not exists enquiries_as_idx      on enquiries (writing_as);
create index if not exists enquiries_phone_idx   on enquiries (phone_digits);
create index if not exists enquiries_iphash_idx  on enquiries (ip_hash, created_at desc);
`;

export async function ensureSchema() {
  await query(SCHEMA);
}

/* Run a statement, and if the table is not there yet, create it and run
   the statement again. Any other error is the caller's to handle. */
export async function withSchema(run) {
  try {
    return await run();
  } catch (err) {
    if (err && err.code === "42P01") {
      await ensureSchema();
      return run();
    }
    throw err;
  }
}

/* The statuses an enquiry can hold, in the order they happen. The admin
   page reads this list, so adding one here adds it to the interface. */
export const STATUSES = ["new", "contacted", "planning", "confirmed", "closed"];

/* The six answers the form offers. Anything else that arrives — an old
   cached page, somebody posting by hand — is filed as Other rather than
   silently widening the column into free text. */
export const WRITING_AS = [
  "A school or college",
  "An NGO or cause",
  "A government or civic body",
  "A company or institution",
  "An individual",
  "A volunteer who wants to help",
];
