/* ============================================================
   Who is allowed to read the enquiries.

   One password, held in an environment variable, exchanged for a signed
   cookie. There is one administrator and a few dozen enquiries a month;
   user accounts, password resets and a sessions table would be more
   machinery than the problem has.

   What this does take seriously:
     · the password is never written to disk, a log, or the repository —
       it lives only in the host's environment
     · it is compared in constant time, so the comparison cannot be used
       to guess it a character at a time
     · the cookie is a signed statement of when the session expires, not
       the password itself, so a stolen cookie cannot become a login and
       expires on its own
     · the cookie is HttpOnly, so no script on the page can read it, and
       SameSite=Strict, so another site cannot cause it to be sent
   ============================================================ */

import crypto from "node:crypto";
import { cookies, setCookie, json } from "./http.js";

export const COOKIE = "jwrc_admin";
const TTL_SECONDS = 12 * 60 * 60;

function secret() {
  /* SESSION_SECRET is the right thing to set. If it is missing we derive
     one from the password rather than falling back to a constant — a
     signing key baked into the source would let anybody mint a session.
     Deriving means changing the password also invalidates every session,
     which is the behaviour you want anyway. */
  const explicit = process.env.SESSION_SECRET;
  if (explicit) return explicit;
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return crypto.createHash("sha256").update(`jwrc-session:${pw}`).digest("hex");
}

export function isConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function sign(payload) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

/* Comparing two strings with === leaks how far the comparison got. For
   a password that is enough to recover it. timingSafeEqual needs equal
   lengths, so both sides are hashed first — the digests are always 32
   bytes, and the length of the real password stays private too. */
export function passwordMatches(candidate) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real || typeof candidate !== "string") return false;
  const a = crypto.createHash("sha256").update(candidate).digest();
  const b = crypto.createHash("sha256").update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

export function issue(res) {
  const expires = Date.now() + TTL_SECONDS * 1000;
  const payload = String(expires);
  setCookie(res, COOKIE, `${payload}.${sign(payload)}`, { maxAge: TTL_SECONDS });
}

export function clear(res) {
  setCookie(res, COOKIE, "", { maxAge: 0 });
}

export function isSignedIn(req) {
  if (!secret()) return false;
  const raw = cookies(req)[COOKIE];
  if (!raw) return false;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return false;
  const payload = raw.slice(0, dot);
  const given = raw.slice(dot + 1);
  const want = sign(payload);
  /* Same reasoning as the password: compare the signature in constant
     time. Byte lengths must match before timingSafeEqual will look. */
  const g = Buffer.from(given);
  const w = Buffer.from(want);
  if (g.length !== w.length || !crypto.timingSafeEqual(g, w)) return false;
  const expires = Number(payload);
  return Number.isFinite(expires) && expires > Date.now();
}

/* Wrap an endpoint so it cannot run without a valid session. Returns
   true when the request may proceed; when it may not, it has already
   answered and the caller should return. */
export function requireAdmin(req, res) {
  if (!isConfigured()) {
    json(res, 503, {
      ok: false,
      error: "Admin access is not set up yet. Set ADMIN_PASSWORD in the project's environment variables.",
    });
    return false;
  }
  if (!isSignedIn(req)) {
    json(res, 401, { ok: false, error: "Please sign in." });
    return false;
  }
  return true;
}

/* A brake on guessing. Serverless containers come and go, so this holds
   only for as long as one instance lives — it will not stop a determined
   distributed attack, and it is not the thing standing between an
   attacker and the data (a long password is). It does stop a script
   hammering one warm instance, which is what actually happens. */
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function tooManyAttempts(key) {
  const now = Date.now();
  const hits = (attempts.get(key) || []).filter((t) => now - t < WINDOW_MS);
  attempts.set(key, hits);
  if (attempts.size > 500) attempts.clear();
  return hits.length >= MAX_ATTEMPTS;
}

export function noteAttempt(key) {
  const hits = attempts.get(key) || [];
  hits.push(Date.now());
  attempts.set(key, hits);
}

export function clearAttempts(key) {
  attempts.delete(key);
}
