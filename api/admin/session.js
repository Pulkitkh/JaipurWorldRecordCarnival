/* ============================================================
   POST   /api/admin/session   sign in   { password }
   GET    /api/admin/session   am I signed in?
   DELETE /api/admin/session   sign out

   One route for the whole session lifecycle, because Vercel counts
   functions and three files for three verbs is three cold starts.
   ============================================================ */

import {
  isConfigured,
  isSignedIn,
  passwordMatches,
  issue,
  clear,
  tooManyAttempts,
  noteAttempt,
  clearAttempts,
} from "../_lib/auth.js";
import { json, methodNotAllowed, readJson, clientIp, hashIp } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return json(res, 200, { ok: true, configured: isConfigured(), signedIn: isSignedIn(req) });
  }

  if (req.method === "DELETE") {
    clear(res);
    return json(res, 200, { ok: true, signedIn: false });
  }

  if (req.method !== "POST") return methodNotAllowed(res, ["GET", "POST", "DELETE"]);

  if (!isConfigured()) {
    return json(res, 503, {
      ok: false,
      error:
        "Admin access is not set up yet. Add ADMIN_PASSWORD to the project's " +
        "environment variables in Vercel, then redeploy.",
    });
  }

  const key = hashIp(clientIp(req)) || "anon";
  if (tooManyAttempts(key)) {
    return json(res, 429, { ok: false, error: "Too many attempts. Try again in a few minutes." });
  }

  let body;
  try {
    body = await readJson(req, 4096);
  } catch {
    body = null;
  }

  if (!body || !passwordMatches(body.password)) {
    noteAttempt(key);
    /* One message for a wrong password and for a missing one. Saying
       which is wrong tells somebody guessing that they are close. */
    return json(res, 401, { ok: false, error: "That password is not right." });
  }

  clearAttempts(key);
  issue(res);
  return json(res, 200, { ok: true, signedIn: true });
}
