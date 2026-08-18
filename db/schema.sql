-- ============================================================
-- Jaipur World Record Carnival — enquiries
--
-- The API creates this on its own the first time somebody sends the
-- form, so running this by hand is optional. It is here so the table can
-- be read and understood without reading JavaScript, and so a database
-- can be prepared before the site goes live.
--
--     psql "$POSTGRES_URL" -f db/schema.sql
--
-- Every answer the form asks for has its own column. Keeping a form
-- submission as one blob of text is easier to write and useless
-- afterwards: you cannot ask it how many schools wrote in last month, or
-- sort by how many people somebody could gather. These can.
-- ============================================================

create table if not exists enquiries (
  id            bigserial    primary key,

  -- a short reference the sender is shown and can quote on the phone
  ref           text         not null unique,
  created_at    timestamptz  not null default now(),

  -- who they are, and how to reach them
  name          text         not null,
  phone         text         not null,
  -- the same number with everything but digits removed, so that
  -- +91 80030 03000 and 08003003000 find each other in a search
  phone_digits  text         not null,
  email         text,
  organisation  text,

  -- what they are asking about
  writing_as    text         not null,   -- school / NGO / government / company / individual / volunteer
  people        integer,                 -- a number, when one could be read out of the answer
  people_raw    text,                    -- exactly what they typed: "about 500", "no idea yet"
  note          text         not null,

  -- what has been done about it
  status        text         not null default 'new',  -- new / contacted / planning / confirmed / closed
  admin_note    text,
  handled_at    timestamptz,             -- when it stopped being new

  -- context, for spotting patterns and abuse
  source_page   text,
  referrer      text,
  user_agent    text,
  -- a salted hash, never an address. Equal hashes mean the same sender;
  -- the hash cannot be turned back into an address without the salt,
  -- which lives only in the server's environment.
  ip_hash       text
);

create index if not exists enquiries_created_idx on enquiries (created_at desc);
create index if not exists enquiries_status_idx  on enquiries (status);
create index if not exists enquiries_as_idx      on enquiries (writing_as);
create index if not exists enquiries_phone_idx   on enquiries (phone_digits);
create index if not exists enquiries_iphash_idx  on enquiries (ip_hash, created_at desc);
