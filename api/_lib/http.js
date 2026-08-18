/* ============================================================
   Small helpers every endpoint wants: reading a JSON body, sending
   one back, and knowing who asked.
   ============================================================ */

import crypto from "node:crypto";

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  /* None of these responses should ever be cached — an admin list held
     in a CDN would be a leak, and a stale enquiry receipt is a lie. */
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.end(JSON.stringify(body));
}

export function methodNotAllowed(res, allowed) {
  res.setHeader("Allow", allowed.join(", "));
  return json(res, 405, { ok: false, error: "Method not allowed." });
}

/* Vercel parses JSON bodies for us, but only when the content type says
   so and the body is not already consumed. Reading the stream by hand
   when req.body is absent means the endpoint behaves the same locally,
   under `vercel dev`, and on any other Node host. */
export async function readJson(req, limitBytes = 32 * 1024) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) throw new Error("Body too large.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

export function cookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

export function setCookie(res, name, value, opts = {}) {
  const bits = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Strict"];
  if (opts.maxAge !== undefined) bits.push(`Max-Age=${opts.maxAge}`);
  /* Secure would make the cookie unusable over plain http, which is what
     `vercel dev` serves on localhost. Everywhere else it is required. */
  if (process.env.NODE_ENV !== "development") bits.push("Secure");
  const existing = res.getHeader("Set-Cookie");
  const all = existing ? [].concat(existing, bits.join("; ")) : [bits.join("; ")];
  res.setHeader("Set-Cookie", all);
}

/* The visitor's address, as seen through Vercel's proxy. x-forwarded-for
   is a chain — the first entry is the client, the rest are the hops. */
export function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  if (Array.isArray(fwd) && fwd.length) return String(fwd[0]).split(",")[0].trim();
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || "";
}

/* We want to be able to say "these four enquiries came from the same
   person" without holding anybody's address. A salted hash does that:
   equal addresses give equal hashes, and the hash cannot be walked back
   into an address without the salt, which never leaves the server. */
export function hashIp(ip) {
  if (!ip) return null;
  const salt =
    process.env.IP_SALT || process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "jwrc";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 24);
}

/* Single-line values: collapse all whitespace, trim, cap the length. */
export function str(value, max) {
  if (value === null || value === undefined) return "";
  const out = clean(String(value)).replace(/\s+/g, " ").trim();
  return max ? out.slice(0, max) : out;
}

/* Free text keeps its line breaks — a paragraph somebody wrote about what
   they want to attempt should read the way they wrote it — but control
   characters and runaway length do not survive. */
export function text(value, max) {
  if (value === null || value === undefined) return "";
  const out = clean(String(value))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return max ? out.slice(0, max) : out;
}

/* Written as a codepoint filter rather than a regular expression, because
   a character class of control characters has to contain control
   characters, and a source file that contains them is a source file
   nobody can safely edit afterwards. Tab and newline survive; nothing
   else below space does, nor DEL and the C1 block above it. */
function clean(input) {
  const normalised = input.split("\r\n").join("\n");
  let out = "";
  for (const ch of normalised) {
    const c = ch.codePointAt(0);
    if (c === 9 || c === 10) out += ch;
    else if (c >= 32 && c !== 127 && (c < 128 || c > 159)) out += ch;
  }
  return out;
}
