# MediaHub v1 — Security Audit & Fixes

**Date:** 2026-06-07  
**Scope:** Full-stack review of `/backend/server.py` and `/frontend/src/`  
**Status:** Critical and High issues resolved. Medium/Low documented below.

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 1 | ✅ Fixed |
| High | 3 | ✅ Fixed |
| Medium | 3 | ⚠️ Documented |
| Low | 1 | ⚠️ Documented |

---

## Fixed Issues

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

## Remaining Known Issues

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

## Files Changed

| File | Changes |
|------|---------|
| `backend/server.py` | Added rate limiter, `_safe_eq`, `_require_profile_or_admin`; applied auth to all 4 media mutation endpoints; fixed CORS default |
| `frontend/src/lib/api.js` | Added `setProfilePasscode`, `getProfilePasscode`, `clearProfilePasscode`; added `X-Profile-Passcode` header to all media mutation calls |
| `frontend/src/components/PasscodeDialog.jsx` | Calls `setProfilePasscode` after successful verify |
| `frontend/src/pages/ProfileShell.jsx` | Calls `clearProfilePasscode` on exit |
