# MediaHub

A personal media hub. Profile cards on the home screen, each with its own 4-digit
passcode. Inside a profile: a media library grouped by section labels, with an
in-app fullscreen player. An admin panel (separate master passcode) creates and
manages profiles. All data syncs across devices because everything lives in
MongoDB.

This README is written assuming you might be running it on a low-RAM machine
(like a 4 GB Chromebook with a Linux container). Every command below is safe to
copy-paste.

---

## What's inside

```
/app
├── backend/        FastAPI (Python) — REST API at /api/*
├── frontend/       React + Tailwind + shadcn/ui — the UI
└── README.md       this file
```

- **Backend**: FastAPI + Motor (async MongoDB driver). Single file: `backend/server.py`.
- **Frontend**: Create-React-App with craco, Tailwind, framer-motion, dnd-kit, lucide-react.
- **Database**: MongoDB (any version 4.4+).

That's it. No Docker required. No build pipeline. No microservices.

---

## Requirements

The minimums. Don't install anything you don't need.

- **Python 3.10 or newer** (3.11+ preferred)
- **Node 18 or newer** (Node 20 is best)
- **Yarn** (not npm — see note at the bottom)
- **MongoDB** running locally or reachable by URL

That's the whole list.

---

## Quick start (any machine)

Open two terminals. One for backend, one for frontend.

### Terminal 1 — backend

```bash
cd /app/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Backend is now live at `http://localhost:8001`. It will print `Application
startup complete`. The first time it runs, it will also print a "Seeded example
profile 'Westwood Ranch'" line — that's the demo profile.

### Terminal 2 — frontend

```bash
cd /app/frontend
yarn install
yarn start
```

Frontend opens at `http://localhost:3000`.

That's it. Visit `localhost:3000` in your browser.

- Click the **Westwood Ranch** card → enter passcode `1976` → you're in.
- Click the gear icon (top-right) → enter master passcode `1115` → admin panel.

---

## Low-RAM setup (Chromebook / 4 GB Linux container)

Here is the sequence that actually works without crashing the container. The
two failure modes on small machines are: `yarn install` runs out of memory, or
`yarn start` hangs forever and the browser tab dies.

### 1. Cap Node's memory before doing anything

```bash
export NODE_OPTIONS="--max-old-space-size=1024"
```

This caps Node at 1 GB so it can't eat all your RAM. Put it in your
`~/.bashrc` if you want it permanent.

### 2. Install with longer timeouts and offline preference

```bash
cd /app/frontend
yarn install --network-timeout 600000 --prefer-offline
```

The `--prefer-offline` flag reuses anything yarn has cached locally instead of
re-downloading every package every time you clone the repo.

### 3. Run only what you need

You almost never need backend + frontend running at the same time on a small
Chromebook. Two patterns that work:

**Pattern A — edit frontend, point at the production backend.**
Edit `frontend/.env`:
```
REACT_APP_BACKEND_URL=https://your-deployed-app.example.com
```
Then run only the frontend (`yarn start`). RAM use stays under 1 GB.

**Pattern B — edit backend, skip the frontend.**
Run only the backend, then poke the API with `curl`. No Node process needed at
all.

### 4. If `yarn start` still hangs

Use the production build instead — it doesn't need a hot-reload watcher running.

```bash
yarn build
npx serve -s build -l 3000
```

`yarn build` runs once, finishes, then `serve` is a tiny static-file server
(uses ~30 MB RAM).

### 5. Common errors and what they mean

- **`JavaScript heap out of memory`** → you forgot the `NODE_OPTIONS` cap. Set
  it and re-run.
- **`EAI_AGAIN` / `ETIMEDOUT` during yarn install** → flaky network. Use
  `yarn install --network-timeout 600000`.
- **`Cannot find module '@dnd-kit/core'`** → `yarn install` was interrupted.
  Delete `node_modules/` and re-run `yarn install`.
- **MongoDB connection refused** → MongoDB isn't running. Start it with
  `sudo systemctl start mongod` (or whatever your distro uses).

---

## Environment variables

Two `.env` files, both already exist with sensible defaults.

### `backend/.env`

```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
MASTER_PASSCODE=1115
```

- `MASTER_PASSCODE` is the 4-digit code for the admin panel. Change this.
- `CORS_ORIGINS` should be your frontend's URL in production (comma-separated
  if multiple). `*` is fine for local dev.

### `frontend/.env`

```
REACT_APP_BACKEND_URL=https://your-backend-url-here
```

That's the only frontend env var that matters. The frontend reads it at build
time. **If you change it, restart `yarn start`.**

---

## How the API is laid out

Everything is under `/api/`.

Public (no auth):
- `GET  /api/profiles` — list profile cards (name, icon, color — no passcodes)
- `POST /api/profiles/{id}/verify` — check a profile's 4-digit passcode

Per-profile (header: `X-Profile-Passcode: 1234`):
- `GET    /api/profiles/{id}/media`
- `POST   /api/profiles/{id}/media`
- `PUT    /api/profiles/{id}/media/{mediaId}`
- `DELETE /api/profiles/{id}/media/{mediaId}`
- `POST   /api/profiles/{id}/media/reorder`

Admin (header: `X-Admin-Passcode: 1115`):
- `POST /api/admin/verify` — check the master passcode (rate-limited)
- `GET    /api/admin/profiles` — list with passcodes
- `POST   /api/admin/profiles` — create
- `PUT    /api/admin/profiles/{id}` — edit
- `DELETE /api/admin/profiles/{id}` — delete (cascades to media)

The admin verify and profile verify endpoints both rate-limit per IP: 5 wrong
attempts in 5 minutes returns `429 Too Many Requests`.

---

## Editing the code

A short tour so you know where to look.

### Backend (one file)

`/app/backend/server.py` is the entire backend. Models, routes, the seed,
everything. About 600 lines. Read it top to bottom.

### Frontend

```
frontend/src/
├── App.js                  routing
├── lib/
│   ├── api.js              every HTTP call lives here
│   ├── registry.js         icon library + curated colors
│   ├── themes.js           the 4 themes (default/western/neon/studio)
│   └── embed.js            YouTube/Vimeo URL parsing
├── pages/
│   ├── Home.jsx            profile grid + passcode dialog trigger
│   ├── ProfileShell.jsx    media grid grouped by section
│   ├── AdminLogin.jsx      master-passcode entry
│   └── AdminDashboard.jsx  create/edit/delete profiles
└── components/
    ├── ProfileCard.jsx     one card on the home screen
    ├── PasscodeDialog.jsx  4-digit entry
    ├── Keypad.jsx          the keypad UI
    ├── MediaCard.jsx       a media card in the grid
    ├── MediaForm.jsx       add/edit media dialog
    ├── VideoPlayer.jsx     fullscreen player
    ├── SortableMediaCard.jsx   drag wrapper for media cards
    └── ProfileForm.jsx     admin form (name/icon/color/theme/sections)
```

Each file is small (<300 lines). Read it once and you understand it.

---

## Deploying

The deployment scanner expects this layout — supervisor or any process
manager that runs:

- backend: `uvicorn server:app --host 0.0.0.0 --port 8001`
- frontend: `yarn start` (dev) or `yarn build` + a static server (prod)

Set `REACT_APP_BACKEND_URL` to your public backend URL before building.

---

## Why yarn, not npm

This project uses yarn. Don't switch to npm — `package.json` is fine with
either, but the lockfiles aren't compatible and `yarn.lock` is what's checked
in. Mixing the two leads to subtle dependency drift that's hard to diagnose
later.

If you don't have yarn:
```bash
npm install -g yarn
```

---

## License

Personal use. Do whatever you want with it.
