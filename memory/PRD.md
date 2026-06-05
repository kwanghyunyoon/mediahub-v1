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

### In-app video player — iteration 3 (2026-02)
- Fullscreen overlay (`VideoPlayer`) opens on card click — MediaDetailsDialog removed
- `parseSource` normalises YouTube to `youtube-nocookie.com/embed/{id}` and Vimeo to `player.vimeo.com/video/{id}` with strict params
- Direct: native HTML5 `<video>` with `controlsList="nodownload noremoteplayback noplaybackrate"`, right-click suppressed, no PiP
- Embed: `<iframe sandbox="allow-scripts allow-same-origin allow-presentation">` — no `allow-popups`, no `allow-top-navigation` → "Watch on YouTube" and any external nav is browser-blocked
- Visual click-shields overlay branding/title-bar corners as a second layer
- ESC closes, body scroll locked while open, no `<a>` tags in overlay
- Edit / Delete actions live in the player top bar (Delete behind confirmation dialog)
- Tested: 28/28 backend + 45/45 frontend assertions passing

### Westwood Ranch theme + global polish — iteration 4 (2026-02)
- Profile model now carries an optional `theme` field (default `"default"`)
- Startup seed `_seed_westwood_ranch()` idempotently creates one example profile (`name='Westwood Ranch'`, `theme='western'`, passcode `1976`, color `#C2410C`, icon `Crown`) with 9 placeholder media items (3 per section across Best Moments / Classic Scenes / Hidden Gems, mix of direct + YouTube embed)
- New rugged-western look in `ProfileShell`: cinematic wide hero banner with desert canyon image, serif "Westwood / *Ranch*" title (Playfair Display + italic accent), earthy palette (burnt orange #C2410C, warm tan #D4A574, cream #F5E6D3), subtle wood-grain gradient background
- Section headings auto-swap to Playfair Display when `data-theme="western"`; non-western profiles continue to use Outfit sans-serif
- App-wide page transitions via `AnimatePresence` (fade + tiny rise) on every route
- Tested: 34/34 backend + all 12 frontend review items passing

### Media poster artwork — iteration 5 (2026-02)
- `posterUrl` optional field added to MediaCreate/MediaUpdate (validated http(s)); empty string on update clears it
- Startup re-runs as an **idempotent backfill**: scans Westwood Ranch media missing `posterUrl` and assigns themed Unsplash images from a per-title map
- `MediaForm` gains a Poster URL input + live preview thumbnail + clear button; when the source is a YouTube URL a "Use YouTube thumbnail" helper auto-fills `img.youtube.com/vi/{id}/hqdefault.jpg`
- `MediaCard` renders the poster as the visual band with a bottom-up dark gradient + accent vignette so titles stay legible; badge gets a dark glass treatment over photos; `onLoad`/`onError` tracking means **broken posters fall back to the original color-wash** cleanly
- `VideoPlayer` `<video>` element receives `poster={media.posterUrl}` for direct items
- Tested: 43/43 backend + 10/10 frontend review items passing

### Drag-reorder + theme selector + 2 new presets — iteration 6 (2026-02)
- Media `order: int` field added; `POST /api/profiles/{id}/media/reorder` endpoint (`{sectionLabel, mediaIds}` → assigns order=0..N); idempotent startup backfill for legacy items; list query sorts by `(sectionLabel, order, createdAt)`
- `@dnd-kit/core` + `@dnd-kit/sortable` integrated. Sections in `ProfileForm` are now a vertical sortable list (grip handle per row); media items in each section grid use `rectSortingStrategy` with PointerSensor distance=8 so simple clicks still open the player
- New `ProfileForm` Theme picker (4 cards): `default`, `western`, `neon` (Neon Arcade), `studio` (Studio Loft); persisted on save
- New `ProfileShell` rendering for `neon` (cyber-magenta + cyan glow on serif-shadow headings, grid backdrop) and `studio` (warm monochrome backdrop, italic serif headings via DM Serif Display)
- Tested: 55/55 backend (incl. TestMediaOrderAndReorder, TestWestwoodOrderBackfill, TestNewThemes) + all 10 frontend review items passing

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
