#!/usr/bin/env python3
"""
Exercise the enquiry API and the admin console against a real database.

    createdb jwrc
    POSTGRES_URL=postgres://... ADMIN_PASSWORD=... node tools/dev-server.js &
    POSTGRES_URL=postgres://... python3 tools/check-api.py http://127.0.0.1:3000 the-password

    WARNING: this empties the enquiries table. Point it at a scratch
    database, never at the live one.

Every check here is one that failing would matter: an enquiry lost, an
enquiry stored wrong, or the list of them readable by somebody who should
not have it. Exit code 1 on any failure, so it can run in CI.
"""

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3000"
PASSWORD = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("ADMIN_PASSWORD", "")
DB = os.environ.get("POSTGRES_URL") or os.environ.get("DATABASE_URL") or ""

FAILURES = []


def reset():
    """Start from an empty table. Every count below is exact, which is the
    only way "search finds one" can mean anything — and it also clears the
    per-address rate limit, which counts stored rows."""
    subprocess.run(["psql", DB, "-qc", "truncate enquiries;"],
                   capture_output=True, text=True)


def check(ok, what):
    print(("  ok   " if ok else "  FAIL ") + what)
    if not ok:
        FAILURES.append(what)


def call(path, method="GET", body=None, cookie=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    if cookie:
        req.add_header("Cookie", cookie)
    try:
        with urllib.request.urlopen(req) as res:
            payload = res.read().decode()
            out = payload if raw else (json.loads(payload) if payload else None)
            return res.status, out, res.headers.get("Set-Cookie")
    except urllib.error.HTTPError as err:
        payload = err.read().decode()
        try:
            return err.code, json.loads(payload), None
        except json.JSONDecodeError:
            return err.code, payload, None


def main():
    reset()

    print("\nsending an enquiry")
    # one to search for later, so this file depends on nothing but itself
    call("/api/enquiry", "POST", {
        "name": "Meera Sharma", "phone": "+91 98290 11111",
        "email": "meera@example.com", "org": "Maharani College",
        "as": "A school or college", "people": "about 1200 girls",
        "note": "Mass kathak in November.",
    })
    status, out, _ = call(
        "/api/enquiry",
        "POST",
        {
            "name": "Rakesh Yadav",
            "phone": "08003003000",
            "email": "rakesh@example.org",
            "org": "Seva Bharti",
            "as": "An NGO or cause",
            "people": "roughly 400",
            "note": "We run a blood donation drive every year.\nCould it be a record?",
        },
    )
    check(status == 201, f"an enquiry is accepted ({status})")
    check(bool(out and out.get("ref", "").startswith("JWRC-")), f"a reference comes back ({out})")
    ref = out.get("ref") if isinstance(out, dict) else None

    print("\nrefusing what should be refused")
    status, out, _ = call("/api/enquiry", "POST", {"name": "x", "phone": "1", "note": ""})
    check(status == 422, f"a half-filled form is refused ({status})")
    check(
        set(out.get("fields", [])) == {"name", "phone", "note"},
        f"and it names every field that is wrong ({out.get('fields')})",
    )

    status, out, _ = call(
        "/api/enquiry",
        "POST",
        {"name": "Ok Name", "phone": "9829011111", "email": "not-an-email", "note": "hello there"},
    )
    check(status == 422 and "email" in out.get("fields", []), f"a bad email is refused ({status})")

    status, _, _ = call("/api/enquiry", "GET")
    check(status == 405, f"GET is not a way to send one ({status})")

    print("\nthe honeypot")
    status, out, _ = call(
        "/api/enquiry",
        "POST",
        {
            "name": "Spam Bot",
            "phone": "1234567890",
            "note": "buy things",
            "website": "http://example.com",
        },
    )
    check(status == 200, f"a bot is told it succeeded ({status})")

    print("\nlocked doors")
    for path, method in (
        ("/api/admin/enquiries", "GET"),
        ("/api/admin/enquiries", "PATCH"),
        ("/api/admin/export", "GET"),
    ):
        status, _, _ = call(path, method, {} if method == "PATCH" else None)
        check(status == 401, f"{method} {path} needs a session ({status})")

    status, _, _ = call("/api/admin/session", "POST", {"password": "not the password"})
    check(status == 401, f"a wrong password is refused ({status})")

    forged = "jwrc_admin=" + str(9999999999999) + ".notarealsignature"
    status, _, _ = call("/api/admin/enquiries", "GET", cookie=forged)
    check(status == 401, f"a forged cookie is refused ({status})")

    print("\nsigning in")
    status, out, set_cookie = call("/api/admin/session", "POST", {"password": PASSWORD})
    check(status == 200 and out.get("signedIn"), f"the right password signs in ({status})")
    check(
        set_cookie and "HttpOnly" in set_cookie and "SameSite=Strict" in set_cookie,
        f"the cookie is HttpOnly and SameSite=Strict ({set_cookie})",
    )
    cookie = set_cookie.split(";")[0] if set_cookie else ""

    print("\nreading the enquiries")
    status, out, _ = call("/api/admin/enquiries", cookie=cookie)
    check(status == 200, f"the list loads ({status})")
    rows = out.get("rows", [])
    check(len(rows) >= 2, f"both real enquiries are there ({len(rows)})")
    check(
        all(r["name"] != "Spam Bot" for r in rows),
        "the honeypot submission was never stored",
    )
    check(
        any(r["ref"] == ref and r["people"] == 400 for r in rows),
        "'roughly 400' was stored as the number 400",
    )
    check(
        out.get("byStatus", {}).get("new", 0) >= 2,
        f"the totals count them ({out.get('byStatus')})",
    )

    print("\nfiltering")
    status, out, _ = call("/api/admin/enquiries?q=maharani", cookie=cookie)
    check(len(out.get("rows", [])) == 1, f"search finds by organisation ({len(out.get('rows', []))})")
    status, out, _ = call("/api/admin/enquiries?q=8003003000", cookie=cookie)
    check(len(out.get("rows", [])) == 1, "search finds a number typed a different way")
    status, out, _ = call("/api/admin/enquiries?as=An+NGO+or+cause", cookie=cookie)
    check(len(out.get("rows", [])) == 1, "filtering by who is writing works")
    status, out, _ = call("/api/admin/enquiries?status=closed", cookie=cookie)
    check(out.get("rows") == [], "filtering by a status nothing has returns nothing")

    print("\nSQL injection")
    status, out, _ = call("/api/admin/enquiries?q=%27%3B+drop+table+enquiries%3B--", cookie=cookie)
    check(status == 200 and out.get("rows") == [], f"a query full of SQL is just a search ({status})")
    status, out, _ = call("/api/admin/enquiries", cookie=cookie)
    check(status == 200 and len(out.get("rows", [])) >= 2, "the table is still there afterwards")
    status, _, _ = call("/api/admin/enquiries?sort=created_at%3B+drop+table+enquiries", cookie=cookie)
    check(status == 200, f"an invented sort falls back instead of running ({status})")

    print("\nchanging one")
    row = next(r for r in out["rows"] if r["ref"] == ref)
    status, patched, _ = call(
        "/api/admin/enquiries",
        "PATCH",
        {"id": row["id"], "status": "contacted", "admin_note": "Called on the 4th."},
        cookie=cookie,
    )
    check(status == 200, f"a status can be changed ({status})")
    check(patched["row"]["status"] == "contacted", "the change comes back")
    check(patched["row"]["handled_at"] is not None, "and it recorded when it stopped being new")

    status, out, _ = call(
        "/api/admin/enquiries", "PATCH", {"id": row["id"], "status": "sold"}, cookie=cookie
    )
    check(status == 422, f"an invented status is refused ({status})")

    print("\nthe spreadsheet")
    status, csv, _ = call("/api/admin/export", cookie=cookie, raw=True)
    check(status == 200, f"the export builds ({status})")
    check("Reference,Received,Name" in csv, "it has a header row people can read")
    check("Rakesh Yadav" in csv and "Meera Sharma" in csv, "every enquiry is in it")
    check("Spam Bot" not in csv, "and the bot is not")

    print("\nsigning out")
    status, _, gone = call("/api/admin/session", "DELETE", cookie=cookie)
    check(status == 200 and "Max-Age=0" in (gone or ""), f"the cookie is cleared ({status})")

    print()
    if FAILURES:
        print(f"{len(FAILURES)} FAILURES:")
        for f in FAILURES:
            print(f"  · {f}")
        sys.exit(1)
    print("ALL PASS")


if __name__ == "__main__":
    if not DB or not PASSWORD:
        sys.exit("Set POSTGRES_URL and pass the admin password. See the docstring.")
    main()
