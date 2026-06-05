# MediaHub — PRD

## Original Problem Statement
Build the foundation of a personal media hub web app called MediaHub. React frontend with a Node.js + MongoDB backend so data syncs across all devices. Dark UI, mobile-first and responsive. No user accounts or third-party auth. The home screen shows a grid of profile cards, each with a name and icon. Clicking a card prompts for a 4-digit passcode to enter that profile. Include an admin panel accessed by a separate master passcode where I can create, edit, and delete profiles. Each profile stores a name, passcode, color theme, and section labels — all saved in the database. Just build the navigation and profile structure — no media features yet.

(Tech note from user: FastAPI + MongoDB is fine instead of Node.js.)

## User Choices
- Master admin passcode: **1115**
- Profile card icons: **Preset Lucide icon library**
- Section labels: **Variable — admin can add/remove per profile**
- Color themes: **Curated palette + custom color picker**
- Backend: **FastAPI + MongoDB** (instead of Node.js)
- UI: Dark, cinematic, mobile-first

## Architecture
- **Backend** (`/app/backend/server.py`): FastAPI, MongoDB (motor), all routes `/api/*`
  - Public: `GET /api/profiles`, `POST /api/profiles/{id}/verify`, `POST /api/admin/verify`
  - Admin (X-Admin-Passcode header): `GET/POST /api/admin/profiles`, `PUT/DELETE /api/admin/profiles/{id}`
  - Master passcode in `/app/backend/.env` as `MASTER_PASSCODE=1115`
- **Frontend** (React 19 + react-router-dom 7 + framer-motion + shadcn/ui + lucide-react)
  - Routes: `/` (Home grid), `/profile/:id` (Profile shell), `/admin` (master passcode), `/admin/dashboard` (CRUD)
  - Admin passcode stored in `sessionStorage` after verification, sent via `X-Admin-Passcode` header

## User Personas
- **Personal user (owner)**: manages all profiles via admin panel; uses individual profile entries for personal content separation (kids, partner, self, etc.).
- **Profile users (household / personas)**: select a card, enter 4-digit passcode, land in their own themed shell.

## Core Requirements (Static)
- No user accounts / no third-party auth
- Dark-only UI, mobile-first responsive
- All data persisted in MongoDB so it syncs across devices
- Each profile: `name`, `passcode` (4 digits), `color` (hex), `icon` (Lucide name), `sections` (list of strings)

## Implemented (2026-02)
- Backend CRUD for profiles + admin/profile passcode verification
- Validation: 4-digit passcode regex, hex color regex, section list cap (20)
- Public listing excludes passcode; admin listing includes it
- Cinematic dark UI (Outfit/Manrope fonts, vignette + grain texture)
- Netflix-style "Who's tuning in?" home grid with per-card hover glow in profile color
- 4-digit keypad component with auto-submit, error shake, keyboard input support
- Admin panel: list, create, edit, delete with confirmation dialog
- Per-profile color and icon flow through to card hover, dialog, profile shell tabs
- Profile shell with dynamic section tabs (active pill highlighted in profile accent color), placeholder content area
- All interactive/critical elements carry `data-testid`
- Tested: 15/15 backend tests + 13/13 frontend Playwright scenarios passing

### Media library — iteration 2 (2026-02)
- Backend media model + endpoints: `GET/POST /api/profiles/{id}/media`, `PUT/DELETE /api/profiles/{id}/media/{mediaId}`
- Per-item fields: `title`, optional `description`, `sectionLabel`, `sourceType` (direct|embed), `sourceUrl` (validated http(s))
- Cascade: deleting a profile also deletes its media
- ProfileShell now renders media grouped by section label with section filter pills (incl. "All"), per-section empty states, and inline "+ Add" per section
- MediaForm with title/description/section dropdown/source-type radio/url field
- MediaCard with source-type badge (Direct / YouTube / Vimeo / Embed) and color-tinted hover glow
- MediaDetailsDialog (details-only — no player yet) with Edit + Delete (with confirmation)
- Tested: 28/28 backend + 13/13 frontend e2e scenarios passing

## Backlog (Future Phases)
**P0 — content layer**
- Media content modules per section (e.g., movie lists, music playlists, books, notes)
- Section-level CRUD inside the profile shell

**P1 — UX polish**
- Drag-and-reorder for profiles in admin
- Drag-and-reorder for section labels
- Per-profile background imagery / album art
- Search across content once media features exist

**P2 — sharing / sync nice-to-haves**
- Export/import profile bundle (JSON)
- Lock screen / inactivity auto-logout in profile shell
- PWA install + offline cache of profile list

## Next Tasks
1. Define media content schema (per-section item shape)
2. Build first content module (e.g., movie list) inside profile shell
3. Add drag-reorder for sections in admin form
4. Optional: per-profile background image
