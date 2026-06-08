# MediaHub v1 — Security Audit & Fixes

**Latest audit date:** 2026-06-08  
**Scope (round 2):** Cloudflare Worker (`backend-workers/src/index.ts`) + React frontend (`frontend/src/`)  
**Status (round 2):** All 5 new issues fixed. See round 1 below for original Python-backend findings.

---

## Round 2 — Worker Stack (2026-06-08)

### Summary

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | Critical | MASTER_PASSCODE hardcoded in wrangler.toml | ✅ Fixed |
| 2 | High | Admin routes lack rate limiting on passcode checks | ✅ Fixed |
| 3 | Medium | backgroundUrl from sessionStorage injected unsanitized into CSS | ✅ Fixed |
| 4 | Medium | sourceType not validated in media PUT endpoint | ✅ Fixed |
| 5 | Low | No max-length limits on free-text backend fields | ✅ Fixed |

---

### [CRITICAL] MASTER_PASSCODE hardcoded in wrangler.toml

**File:** `backend-workers/wrangler.toml`

**Problem:**  
`MASTER_PASSCODE = "1115"` was stored as a plain `[vars]` entry in wrangler.toml. This file is version-controlled, so the secret would be committed to git history and visible to anyone with repo access.

**Fix:**  
Removed the value from `[vars]`. It must now be set as a Cloudflare secret:
```
wrangler secret put MASTER_PASSCODE
```
A comment in wrangler.toml documents this requirement.

---

### [HIGH] Admin routes had no rate limiting on passcode checks

**File:** `backend-workers/src/index.ts`

**Problem:**  
`POST /api/admin/verify` was rate-limited (5 attempts per 5 minutes per IP), but the four other admin routes that also check the admin passcode (`GET/POST/PUT/DELETE /api/admin/profiles`) used an inline check with no rate limiting. An attacker could brute-force the 4-digit PIN by calling those endpoints directly, completely bypassing the protected verify route.

**Fix:**  
Extracted a `requireAdmin(masterPasscode, headers, ip)` helper that performs the rate-limit check **before** comparing the passcode, then replaced all four inline admin passcode checks with this helper. Every admin passcode attempt now shares the same per-IP rate-limit counter.

---

### [MEDIUM] backgroundUrl from sessionStorage injected unsanitized into CSS

**File:** `frontend/src/pages/ProfileShell.jsx`

**Problem:**  
After verifying a profile, the full profile object is serialized to `sessionStorage`. `ProfileShell` reads it back and injects `profile.backgroundUrl` directly into an inline CSS `url()` value:
```js
backgroundImage: `linear-gradient(...), url(${profile.backgroundUrl})`
```
If an attacker tampers with sessionStorage (via XSS or browser devtools), a crafted value like `x) } body { background: red; } .foo { color: green` can break out of the `url()` context and inject arbitrary CSS.

**Fix:**  
Added a `safeBgUrl` memo that only passes through values matching `/^https?:\/\//i`. All other values (including tampered ones) resolve to `null`, which suppresses the background entirely. The `hasBg` flag and the `url()` reference now use `safeBgUrl` instead of the raw field.

---

### [MEDIUM] sourceType not validated in media PUT endpoint

**File:** `backend-workers/src/index.ts`

**Problem:**  
The `POST /api/profiles/:id/media` handler validated `sourceType` against `["direct", "embed"]`, but the `PUT /api/profiles/:id/media/:mediaId` handler accepted any string:
```ts
if (body.sourceType !== undefined) { fields.push("sourceType = ?"); values.push(body.sourceType); }
```
An authenticated user could set `sourceType` to an arbitrary value on any existing media item, causing unpredictable client-side behavior.

**Fix:**  
Added the missing validation before the field-builder loop:
```ts
if (body.sourceType !== undefined && !["direct", "embed"].includes(body.sourceType)) {
  return c.json({ detail: "invalid sourceType" }, 422);
}
```

---

### [LOW] No max-length limits on free-text backend fields

**File:** `backend-workers/src/index.ts`

**Problem:**  
The backend validated format (4-digit passcode, hex color, URL scheme) but placed no upper bound on string lengths for `name`, `icon`, `title`, `description`, `sectionLabel`, or URL fields. A user with valid credentials could send megabyte-sized strings that get stored in D1, causing oversized rows and bloated API responses.

**Fix:**  
Added length constants and enforced them in both create and update endpoints:

| Field | Limit |
|-------|-------|
| `name` | 80 chars |
| `icon` | 40 chars |
| `sectionLabel` | 60 chars |
| `title` | 120 chars |
| `description` | 500 chars |
| URL fields | 2 048 chars |

---

## Files Changed (round 2)

| File | Changes |
|------|---------|
| `backend-workers/wrangler.toml` | Removed `MASTER_PASSCODE` from `[vars]`; added secret instructions comment |
| `backend-workers/src/index.ts` | Added `requireAdmin()` helper with rate limiting; replaced 4 inline passcode checks; added `sourceType` validation to PUT; added length constants and checks across create/update endpoints |
| `frontend/src/pages/ProfileShell.jsx` | Added `safeBgUrl` memo; replaced `profile.backgroundUrl` with `safeBgUrl` in CSS injection points |

---

---

## Round 1 — Python Backend (2026-06-07)

**Date:** 2026-06-07  
**Scope:** Full-stack review of `/backend/server.py` and `/frontend/src/`  
**Status:** Critical and High issues resolved. Medium/Low documented below.

---

### Round 1 Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 1 | ✅ Fixed |
| High | 3 | ✅ Fixed |
| Medium | 3 | ⚠️ Documented |
| Low | 1 | ⚠️ Documented |

---

### Fixed Issues

### [CRITICAL] Media mutation endpoints had zero authentication

**File:** `backend/server.py`  
**Endpoints affected:**
- `POST /api/profiles/{id}/media`
- `PUT /api/profiles/{id}/media/{mediaId}`
- `DELETE /api/profiles/{id}/media/{mediaId}`
- `POST /api/profiles/{id}/media/reorder`

**Problem:**  
All four media write endpoints accepted requests from anyone with no credential check whatsoever. Profile IDs are UUIDs but are fully public — they're returned by `GET /api/profiles` which requires no auth. An attacker could enumerate all profile IDs from that endpoint and then freely add, edit, delete, or reorder media on any profile.

**Fix:**  
Added `_require_profile_or_admin()` to all four endpoints. The caller must present either:
- `X-Profile-Passcode` header matching the passcode of that specific profile, **or**
- `X-Admin-Passcode` header matching the master passcode

On the frontend, `PasscodeDialog` now calls `setProfilePasscode(id, code)` after a successful verify, and all four media API functions send `X-Profile-Passcode` automatically. The passcode is cleared from `sessionStorage` when the user exits the profile.

---

### [HIGH] No rate limiting on passcode verification endpoints

**File:** `backend/server.py`  
**Endpoints affected:**
- `POST /api/admin/verify`
- `POST /api/profiles/{id}/verify`

**Problem:**  
A 4-digit PIN has only 10,000 possible combinations. With no attempt limiting, a script could brute-force any profile passcode or the admin master passcode in under a minute. The default admin passcode `1115` could be guessed in well under 1,200 requests on average.

**Fix:**  
Added an in-memory rate limiter (`_check_rate_limit`, `_record_failure`, `_clear_rate_limit`) keyed on `IP + endpoint context`. After **5 failed attempts**, the key is locked out for **5 minutes**. A successful attempt clears the counter.

```
Max attempts : 5
Lockout      : 300 seconds
Key format   : "admin:{ip}" or "profile:{ip}:{profile_id}"
```

> **Note:** This is in-process memory. It resets on server restart and does not share state across multiple workers. For a multi-instance deployment, replace with Redis-backed rate limiting (e.g., `slowapi` + Redis).

---

### [HIGH] Timing attack on passcode comparison

**File:** `backend/server.py`

**Problem:**  
Python's `!=` and `==` operators short-circuit on the first differing character. This creates a measurable timing difference — a passcode starting with the right first digit takes slightly longer to reject than one that's completely wrong. Over many requests, this leaks information about the correct passcode one character at a time.

**Fix:**  
All passcode comparisons now use `hmac.compare_digest()` via a `_safe_eq()` wrapper, which runs in constant time regardless of where the strings differ.

```python
def _safe_eq(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())
```

Applied to: `_require_admin`, `_require_profile_or_admin`, `admin_verify`, `verify_profile_passcode`.

---

### [HIGH] CORS default was wildcard (`*`)

**File:** `backend/server.py`

**Problem:**  
```python
# Before — fails open
allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
```
If `CORS_ORIGINS` was missing from the environment, the server accepted cross-origin requests from any domain. Any website could make authenticated API calls on behalf of a logged-in user.

**Fix:**  
```python
# After — fails closed
allow_origins=[o.strip() for o in os.environ.get('CORS_ORIGINS', '').split(',') if o.strip()],
```
An unset `CORS_ORIGINS` now produces an empty allow-list. The `.env` file already sets `CORS_ORIGINS=http://localhost:3000` for development — ensure the production deployment sets this to the actual frontend origin.

---

### Remaining Known Issues (Round 1)

### [MEDIUM] Admin passcode stored as plaintext in sessionStorage

**File:** `frontend/src/lib/api.js`

**Problem:**  
After admin login, the master passcode is stored verbatim in `sessionStorage` under the key `mediahub_admin_passcode`. Any browser extension, injected script, or XSS payload can read it with one line of JavaScript:
```js
sessionStorage.getItem('mediahub_admin_passcode')
```
It is also transmitted as a plain `X-Admin-Passcode` HTTP header on every admin request.

**Proper fix (not yet implemented):**  
Replace the passcode-per-request pattern with a server-issued session token. On `POST /admin/verify`, the server would return a short-lived signed token (e.g., HMAC-SHA256 of `timestamp + secret`). The frontend stores and sends the token. The server verifies the token's signature and expiry instead of comparing the raw passcode. This way the passcode never leaves the initial login exchange.

---

### [MEDIUM] Profile passcodes returned in plaintext via admin API

**File:** `backend/server.py` — `_to_admin()`

**Problem:**  
`GET /api/admin/profiles` returns each profile's passcode in plain text:
```json
{ "id": "...", "name": "Kids", "passcode": "1234", ... }
```
If admin access is compromised, all profile passcodes are immediately exposed.

**Proper fix (not yet implemented):**  
Hash passcodes at rest with bcrypt (the dependency is already in `requirements.txt`). Store the hash; never return it. The verify endpoints would use `bcrypt.checkpw()` instead of string comparison. The admin UI would show `••••` and allow changing the passcode but never displaying it.

> This is a more involved migration — existing stored passcodes would need to be re-hashed, and the verify flow would change. Appropriate for a future hardening pass.

---

### [MEDIUM] Arbitrary embed URLs pass through to iframe with a weak sandbox

**File:** `frontend/src/lib/embed.js`, `frontend/src/components/VideoPlayer.jsx`

**Problem:**  
Any URL that isn't recognized as YouTube or Vimeo is passed directly to the iframe:
```js
return { kind: "embed", src: url };  // no validation
```
The iframe uses `sandbox="allow-scripts allow-same-origin allow-presentation"`. The combination of `allow-scripts` **and** `allow-same-origin` is a known sandbox escape vector — a page with same-origin access can remove its own sandbox attribute via `document.domain` manipulation.

**Mitigations already in place:**
- Admin controls what URLs are added (trust boundary is the admin passcode)
- `allow-popups` and `allow-top-navigation` are omitted, blocking "Watch on YouTube" redirects
- Visual click-shields overlay YouTube/Vimeo branding hotspots

**Recommendation:**  
Consider restricting the `sourceUrl` field in the admin form to a known-safe allowlist (YouTube, Vimeo, and any domains you explicitly trust) rather than accepting arbitrary URLs. Alternatively, remove `allow-same-origin` from the sandbox — this will break cross-origin embeds that need it, so evaluate per use case.

---

### [LOW] `data-testid` attributes ship in production HTML

**Files:** All components and pages

**Problem:**  
Every interactive element carries a `data-testid` attribute (e.g., `data-testid="admin-login-trigger"`). These are meant for automated testing but expose internal component structure in production.

**Recommendation:**  
Strip `data-testid` attributes during the production build. With CRA/craco this can be done via a Babel plugin:
```
babel-plugin-react-remove-properties
```
Add to `craco.config.js`:
```js
plugins: [
  process.env.NODE_ENV === 'production' && [
    'react-remove-properties',
    { properties: ['data-testid'] }
  ]
].filter(Boolean)
```

---

### Files Changed (Round 1)

| File | Changes |
|------|---------|
| `backend/server.py` | Added rate limiter, `_safe_eq`, `_require_profile_or_admin`; applied auth to all 4 media mutation endpoints; fixed CORS default |
| `frontend/src/lib/api.js` | Added `setProfilePasscode`, `getProfilePasscode`, `clearProfilePasscode`; added `X-Profile-Passcode` header to all media mutation calls |
| `frontend/src/components/PasscodeDialog.jsx` | Calls `setProfilePasscode` after successful verify |
| `frontend/src/pages/ProfileShell.jsx` | Calls `clearProfilePasscode` on exit |
