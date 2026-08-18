/* ============================================================
   A local stand-in for Vercel.

       POSTGRES_URL=... ADMIN_PASSWORD=... node tools/dev-server.js

   Serves the static site from the repository root and routes /api/*
   to the same handler files Vercel runs, so the whole thing — form,
   database, sign-in, console — can be exercised on a laptop before it
   is deployed anywhere.

   `vercel dev` does this too, and better. This exists because it needs
   nothing installed but Node, and because a test harness should not
   depend on a login to somebody's account.
   ============================================================ */

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 3000;

process.env.NODE_ENV = process.env.NODE_ENV || "development";

/* Same mapping Vercel derives from the api/ directory. */
const ROUTES = {
  "/api/enquiry": "api/enquiry.js",
  "/api/admin/session": "api/admin/session.js",
  "/api/admin/enquiries": "api/admin/enquiries.js",
  "/api/admin/export": "api/admin/export.js",
};

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const route = ROUTES[url.pathname];

  if (route) {
    try {
      const mod = await import(pathToFileURL(path.join(ROOT, route)).href);
      await mod.default(req, res);
    } catch (err) {
      console.error(`[dev] ${url.pathname}`, err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
      }
      res.end(JSON.stringify({ ok: false, error: String(err.message || err) }));
    }
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "No such endpoint." }));
    return;
  }

  /* Static, with cleanUrls: /admin serves admin.html, exactly as the
     deployed site does — so a link that works here works there. */
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  let file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) {
    res.statusCode = 403;
    res.end("No.");
    return;
  }

  let body = await fs.readFile(file).catch(() => null);
  if (!body && !path.extname(file)) {
    file += ".html";
    body = await fs.readFile(file).catch(() => null);
  }
  if (!body) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end("<h1>404</h1>");
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[dev] http://127.0.0.1:${PORT}`);
  console.log(`[dev] database: ${process.env.POSTGRES_URL || process.env.DATABASE_URL || "(none set)"}`);
  console.log(`[dev] admin:    ${process.env.ADMIN_PASSWORD ? "password set" : "(ADMIN_PASSWORD not set)"}`);
});
