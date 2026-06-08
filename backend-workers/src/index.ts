import { Hono } from "hono";
import { cors } from "hono/cors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Env {
  DB: D1Database;
  MASTER_PASSCODE: string;
  CORS_ORIGIN: string;
}

// What a profile row looks like coming out of D1
interface ProfileRow {
  id: string;
  name: string;
  passcode: string;
  color: string;
  icon: string;
  sections: string;       // JSON-encoded string array
  theme: string;
  backgroundUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MediaRow {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  sectionLabel: string;
  sourceType: "direct" | "embed";
  sourceUrl: string;
  posterUrl: string | null;
  ordering: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PASSCODE_RE = /^\d{4}$/;
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const URL_RE = /^https?:\/\//i;

const MAX_NAME = 80;
const MAX_ICON = 40;
const MAX_SECTION_LABEL = 60;
const MAX_TITLE = 120;
const MAX_DESC = 500;
const MAX_URL = 2048;

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(): string {
  return crypto.randomUUID();
}

// Strips passcode before sending to public clients
function toPublic(row: ProfileRow) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    sections: JSON.parse(row.sections),
    theme: row.theme,
    backgroundUrl: row.backgroundUrl ?? null,
  };
}

// Includes passcode for admin clients
function toAdmin(row: ProfileRow) {
  return {
    ...toPublic(row),
    passcode: row.passcode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mediaToDict(row: MediaRow) {
  return {
    id: row.id,
    profileId: row.profileId,
    title: row.title,
    description: row.description ?? null,
    sectionLabel: row.sectionLabel,
    sourceType: row.sourceType,
    sourceUrl: row.sourceUrl,
    posterUrl: row.posterUrl ?? null,
    order: row.ordering,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function err(status: number, message: string) {
  return new Response(JSON.stringify({ detail: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Rate limiter (in-process; resets on cold start, not shared across instances)
// ---------------------------------------------------------------------------

const RL_MAX = 5;
const RL_WINDOW_MS = 5 * 60 * 1000;

interface RLEntry { count: number; lockedUntil: number }
const rlStore: Map<string, RLEntry> =
  (globalThis as any).__mhRl ?? ((globalThis as any).__mhRl = new Map<string, RLEntry>());

function rlCheck(key: string): Response | null {
  const now = Date.now();
  const e = rlStore.get(key);
  if (e && now < e.lockedUntil) {
    return err(429, `Too many attempts — try again in ${Math.ceil((e.lockedUntil - now) / 1000)}s`);
  }
  return null;
}

function rlRecord(key: string): void {
  const e = rlStore.get(key) ?? { count: 0, lockedUntil: 0 };
  e.count += 1;
  if (e.count >= RL_MAX) { e.lockedUntil = Date.now() + RL_WINDOW_MS; e.count = 0; }
  rlStore.set(key, e);
}

function rlClear(key: string): void {
  rlStore.delete(key);
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

// Rate-limited admin passcode check — use on ALL admin routes, not just /verify.
// Returns a 401/429 Response on failure, or null on success.
function requireAdmin(
  masterPasscode: string,
  headers: Headers,
  ip: string,
): Response | null {
  const rlKey = `admin:${ip}`;
  const blocked = rlCheck(rlKey);
  if (blocked) return blocked;

  const supplied = headers.get("X-Admin-Passcode");
  if (!supplied || supplied !== masterPasscode) {
    rlRecord(rlKey);
    return err(401, "Invalid admin passcode");
  }
  rlClear(rlKey);
  return null;
}

// Profile passcode OR admin master passcode required
async function requireProfileOrAdmin(
  db: D1Database,
  masterPasscode: string,
  headers: Headers,
  profileId: string,
): Promise<{ ok: true; profile: ProfileRow } | Response> {
  const adminPass = headers.get("X-Admin-Passcode");
  if (adminPass !== null && adminPass === masterPasscode) {
    const profile = await db.prepare("SELECT * FROM profiles WHERE id = ?")
      .bind(profileId).first<ProfileRow>();
    if (!profile) return err(404, "Profile not found");
    return { ok: true, profile };
  }
  const profilePass = headers.get("X-Profile-Passcode");
  if (!profilePass) return err(401, "Authentication required");
  const profile = await db.prepare("SELECT * FROM profiles WHERE id = ?")
    .bind(profileId).first<ProfileRow>();
  if (!profile) return err(404, "Profile not found");
  if (profilePass !== profile.passcode) return err(401, "Wrong passcode");
  return { ok: true, profile };
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = new Hono<{ Bindings: Env }>();

app.onError((e, c) => {
  console.error(e);
  return c.json({ detail: "Internal server error" }, 500);
});

// CORS — allow the Pages frontend (and any preview deployment hashes) to call the Worker
app.use("*", async (c, next) => {
  const base = c.env.CORS_ORIGIN || "*";
  const originFn = base === "*" ? "*" : (incoming: string) => {
    // Allow exact match or any *.subdomain of the base Pages domain
    const baseDomain = base.replace(/^https?:\/\//, "");
    const incomingDomain = incoming.replace(/^https?:\/\//, "");
    if (incomingDomain === baseDomain || incomingDomain.endsWith(`.${baseDomain}`)) {
      return incoming;
    }
    return base;
  };
  return cors({
    origin: originFn,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-Admin-Passcode", "X-Profile-Passcode"],
  })(c, next);
});

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

app.get("/api/", (c) => c.json({ message: "MediaHub API", status: "ok" }));

// ---------------------------------------------------------------------------
// Admin verify
// ---------------------------------------------------------------------------

app.post("/api/admin/verify", async (c) => {
  const ip = c.req.raw.headers.get("CF-Connecting-IP") ?? "unknown";
  const rlKey = `admin:${ip}`;
  const blocked = rlCheck(rlKey);
  if (blocked) return blocked;

  const body = await c.req.json<{ passcode: string }>();
  if (body.passcode !== c.env.MASTER_PASSCODE) {
    rlRecord(rlKey);
    return c.json({ detail: "Invalid master passcode" }, 401);
  }
  rlClear(rlKey);
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Public: list profiles (no passcode exposed)
// ---------------------------------------------------------------------------

app.get("/api/profiles", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM profiles ORDER BY createdAt ASC"
  ).all<ProfileRow>();
  return c.json(results.map(toPublic));
});

// ---------------------------------------------------------------------------
// Public: verify profile passcode
// ---------------------------------------------------------------------------

app.post("/api/profiles/:id/verify", async (c) => {
  const id = c.req.param("id");
  const ip = c.req.raw.headers.get("CF-Connecting-IP") ?? "unknown";
  const rlKey = `profile:${ip}:${id}`;
  const blocked = rlCheck(rlKey);
  if (blocked) return blocked;

  const body = await c.req.json<{ passcode: string }>();
  const row = await c.env.DB.prepare("SELECT * FROM profiles WHERE id = ?")
    .bind(id)
    .first<ProfileRow>();
  if (!row) return c.json({ detail: "Profile not found" }, 404);
  if (body.passcode !== row.passcode) {
    rlRecord(rlKey);
    return c.json({ detail: "Wrong passcode" }, 401);
  }
  rlClear(rlKey);
  return c.json(toPublic(row));
});

// ---------------------------------------------------------------------------
// Admin: list profiles (with passcode)
// ---------------------------------------------------------------------------

app.get("/api/admin/profiles", async (c) => {
  const ip = c.req.raw.headers.get("CF-Connecting-IP") ?? "unknown";
  const denied = requireAdmin(c.env.MASTER_PASSCODE, c.req.raw.headers, ip);
  if (denied) return denied;
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM profiles ORDER BY createdAt ASC"
  ).all<ProfileRow>();
  return c.json(results.map(toAdmin));
});

// ---------------------------------------------------------------------------
// Admin: create profile
// ---------------------------------------------------------------------------

app.post("/api/admin/profiles", async (c) => {
  const ip = c.req.raw.headers.get("CF-Connecting-IP") ?? "unknown";
  const denied = requireAdmin(c.env.MASTER_PASSCODE, c.req.raw.headers, ip);
  if (denied) return denied;

  const body = await c.req.json<{
    name: string; passcode: string; color: string; icon: string;
    sections?: string[]; theme?: string; backgroundUrl?: string | null;
  }>();

  if (!body.name?.trim()) return c.json({ detail: "name is required" }, 422);
  if (body.name.trim().length > MAX_NAME) return c.json({ detail: `name must be ${MAX_NAME} characters or fewer` }, 422);
  if (!PASSCODE_RE.test(body.passcode)) return c.json({ detail: "passcode must be 4 digits" }, 422);
  if (!HEX_RE.test(body.color)) return c.json({ detail: "color must be hex like #RRGGBB" }, 422);
  if (!body.icon?.trim()) return c.json({ detail: "icon is required" }, 422);
  if (body.icon.trim().length > MAX_ICON) return c.json({ detail: `icon must be ${MAX_ICON} characters or fewer` }, 422);
  if (body.backgroundUrl && !URL_RE.test(body.backgroundUrl)) {
    return c.json({ detail: "backgroundUrl must start with http:// or https://" }, 422);
  }
  if (body.backgroundUrl && body.backgroundUrl.length > MAX_URL) {
    return c.json({ detail: `backgroundUrl must be ${MAX_URL} characters or fewer` }, 422);
  }

  const sections = (body.sections ?? [])
    .map((s) => s.trim()).filter(Boolean).slice(0, 20);

  const now = nowIso();
  const id = randomId();

  await c.env.DB.prepare(
    `INSERT INTO profiles (id, name, passcode, color, icon, sections, theme, backgroundUrl, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, body.name.trim(), body.passcode, body.color, body.icon.trim(),
    JSON.stringify(sections), body.theme ?? "default",
    body.backgroundUrl ?? null, now, now
  ).run();

  const row = await c.env.DB.prepare("SELECT * FROM profiles WHERE id = ?")
    .bind(id).first<ProfileRow>();
  return c.json(toAdmin(row!), 201);
});

// ---------------------------------------------------------------------------
// Admin: update profile
// ---------------------------------------------------------------------------

app.put("/api/admin/profiles/:id", async (c) => {
  const ip = c.req.raw.headers.get("CF-Connecting-IP") ?? "unknown";
  const denied = requireAdmin(c.env.MASTER_PASSCODE, c.req.raw.headers, ip);
  if (denied) return denied;

  const id = c.req.param("id");
  const existing = await c.env.DB.prepare("SELECT * FROM profiles WHERE id = ?")
    .bind(id).first<ProfileRow>();
  if (!existing) return c.json({ detail: "Profile not found" }, 404);

  const body = await c.req.json<Partial<{
    name: string; passcode: string; color: string; icon: string;
    sections: string[]; theme: string; backgroundUrl: string | null;
  }>>();

  if (body.passcode !== undefined && !PASSCODE_RE.test(body.passcode)) {
    return c.json({ detail: "passcode must be 4 digits" }, 422);
  }
  if (body.color !== undefined && !HEX_RE.test(body.color)) {
    return c.json({ detail: "color must be hex like #RRGGBB" }, 422);
  }
  if (body.name !== undefined && body.name.trim().length > MAX_NAME) {
    return c.json({ detail: `name must be ${MAX_NAME} characters or fewer` }, 422);
  }
  if (body.icon !== undefined && body.icon.trim().length > MAX_ICON) {
    return c.json({ detail: `icon must be ${MAX_ICON} characters or fewer` }, 422);
  }
  if (body.backgroundUrl && !URL_RE.test(body.backgroundUrl)) {
    return c.json({ detail: "backgroundUrl must start with http:// or https://" }, 422);
  }
  if (body.backgroundUrl && body.backgroundUrl.length > MAX_URL) {
    return c.json({ detail: `backgroundUrl must be ${MAX_URL} characters or fewer` }, 422);
  }

  // Build only the fields that were actually sent
  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined)    { fields.push("name = ?");     values.push(body.name.trim()); }
  if (body.passcode !== undefined){ fields.push("passcode = ?"); values.push(body.passcode); }
  if (body.color !== undefined)   { fields.push("color = ?");    values.push(body.color); }
  if (body.icon !== undefined)    { fields.push("icon = ?");     values.push(body.icon.trim()); }
  if (body.theme !== undefined)   { fields.push("theme = ?");    values.push(body.theme); }
  if (body.sections !== undefined){
    const cleaned = body.sections.map((s) => s.trim()).filter(Boolean).slice(0, 20);
    fields.push("sections = ?"); values.push(JSON.stringify(cleaned));
  }
  if ("backgroundUrl" in body) {
    // null or empty string both clear the field
    fields.push("backgroundUrl = ?");
    values.push(body.backgroundUrl || null);
  }

  if (fields.length > 0) {
    fields.push("updatedAt = ?");
    values.push(nowIso());
    values.push(id);
    await c.env.DB.prepare(
      `UPDATE profiles SET ${fields.join(", ")} WHERE id = ?`
    ).bind(...values).run();
  }

  const row = await c.env.DB.prepare("SELECT * FROM profiles WHERE id = ?")
    .bind(id).first<ProfileRow>();
  return c.json(toAdmin(row!));
});

// ---------------------------------------------------------------------------
// Admin: delete profile (media cascades via FK)
// ---------------------------------------------------------------------------

app.delete("/api/admin/profiles/:id", async (c) => {
  const ip = c.req.raw.headers.get("CF-Connecting-IP") ?? "unknown";
  const denied = requireAdmin(c.env.MASTER_PASSCODE, c.req.raw.headers, ip);
  if (denied) return denied;

  const id = c.req.param("id");
  const result = await c.env.DB.prepare("DELETE FROM profiles WHERE id = ?")
    .bind(id).run();
  if (result.meta.changes === 0) return c.json({ detail: "Profile not found" }, 404);
  return c.json({ ok: true, deleted: id });
});

// ---------------------------------------------------------------------------
// Media: list
// ---------------------------------------------------------------------------

app.get("/api/profiles/:id/media", async (c) => {
  const profileId = c.req.param("id");
  const profile = await c.env.DB.prepare("SELECT id FROM profiles WHERE id = ?")
    .bind(profileId).first();
  if (!profile) return c.json({ detail: "Profile not found" }, 404);

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM media WHERE profileId = ?
     ORDER BY sectionLabel ASC, ordering ASC, createdAt ASC`
  ).bind(profileId).all<MediaRow>();

  return c.json(results.map(mediaToDict));
});

// ---------------------------------------------------------------------------
// Media: create
// ---------------------------------------------------------------------------

app.post("/api/profiles/:id/media", async (c) => {
  const profileId = c.req.param("id");
  const auth = await requireProfileOrAdmin(c.env.DB, c.env.MASTER_PASSCODE, c.req.raw.headers, profileId);
  if (auth instanceof Response) return auth;

  const body = await c.req.json<{
    title: string; description?: string; sectionLabel: string;
    sourceType: "direct" | "embed"; sourceUrl: string;
    posterUrl?: string | null; order?: number;
  }>();

  if (!body.title?.trim()) return c.json({ detail: "title is required" }, 422);
  if (body.title.trim().length > MAX_TITLE) return c.json({ detail: `title must be ${MAX_TITLE} characters or fewer` }, 422);
  if (!body.sectionLabel?.trim()) return c.json({ detail: "sectionLabel is required" }, 422);
  if (body.sectionLabel.trim().length > MAX_SECTION_LABEL) return c.json({ detail: `sectionLabel must be ${MAX_SECTION_LABEL} characters or fewer` }, 422);
  if (body.description && body.description.trim().length > MAX_DESC) return c.json({ detail: `description must be ${MAX_DESC} characters or fewer` }, 422);
  if (!["direct", "embed"].includes(body.sourceType)) return c.json({ detail: "invalid sourceType" }, 422);
  if (!URL_RE.test(body.sourceUrl)) return c.json({ detail: "sourceUrl must start with http:// or https://" }, 422);
  if (body.sourceUrl.length > MAX_URL) return c.json({ detail: `sourceUrl must be ${MAX_URL} characters or fewer` }, 422);
  if (body.posterUrl && !URL_RE.test(body.posterUrl)) {
    return c.json({ detail: "posterUrl must start with http:// or https://" }, 422);
  }
  if (body.posterUrl && body.posterUrl.length > MAX_URL) return c.json({ detail: `posterUrl must be ${MAX_URL} characters or fewer` }, 422);

  // Auto-assign order if not provided
  let ordering = body.order;
  if (ordering === undefined) {
    const countRow = await c.env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM media WHERE profileId = ? AND sectionLabel = ?"
    ).bind(profileId, body.sectionLabel.trim()).first<{ cnt: number }>();
    ordering = countRow?.cnt ?? 0;
  }

  const now = nowIso();
  const id = randomId();

  await c.env.DB.prepare(
    `INSERT INTO media (id, profileId, title, description, sectionLabel, sourceType, sourceUrl, posterUrl, ordering, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, profileId, body.title.trim(),
    body.description?.trim() || null,
    body.sectionLabel.trim(), body.sourceType, body.sourceUrl,
    body.posterUrl ?? null, ordering, now, now
  ).run();

  const row = await c.env.DB.prepare("SELECT * FROM media WHERE id = ?")
    .bind(id).first<MediaRow>();
  return c.json(mediaToDict(row!), 201);
});

// ---------------------------------------------------------------------------
// Media: reorder (must be registered BEFORE /:mediaId routes)
// ---------------------------------------------------------------------------

app.post("/api/profiles/:id/media/reorder", async (c) => {
  const profileId = c.req.param("id");
  const auth = await requireProfileOrAdmin(c.env.DB, c.env.MASTER_PASSCODE, c.req.raw.headers, profileId);
  if (auth instanceof Response) return auth;

  const body = await c.req.json<{ sectionLabel: string; mediaIds: string[] }>();
  const section = body.sectionLabel.trim();
  const now = nowIso();

  // Validate the ids belong to this profile + section
  const { results: existing } = await c.env.DB.prepare(
    `SELECT id FROM media WHERE profileId = ? AND sectionLabel = ?`
  ).bind(profileId, section).all<{ id: string }>();
  const validIds = new Set(existing.map((r) => r.id));

  const stmts = body.mediaIds
    .filter((mid) => validIds.has(mid))
    .map((mid, idx) =>
      c.env.DB.prepare("UPDATE media SET ordering = ?, updatedAt = ? WHERE id = ? AND profileId = ?")
        .bind(idx, now, mid, profileId)
    );

  if (stmts.length > 0) await c.env.DB.batch(stmts);
  return c.json({ ok: true, updated: stmts.length, section });
});

// ---------------------------------------------------------------------------
// Media: update
// ---------------------------------------------------------------------------

app.put("/api/profiles/:id/media/:mediaId", async (c) => {
  const profileId = c.req.param("id");
  const mediaId = c.req.param("mediaId");
  const auth = await requireProfileOrAdmin(c.env.DB, c.env.MASTER_PASSCODE, c.req.raw.headers, profileId);
  if (auth instanceof Response) return auth;

  const existing = await c.env.DB.prepare(
    "SELECT * FROM media WHERE id = ? AND profileId = ?"
  ).bind(mediaId, profileId).first<MediaRow>();
  if (!existing) return c.json({ detail: "Media not found" }, 404);

  const body = await c.req.json<Partial<{
    title: string; description: string; sectionLabel: string;
    sourceType: "direct" | "embed"; sourceUrl: string; posterUrl: string | null;
  }>>();

  if (body.sourceType !== undefined && !["direct", "embed"].includes(body.sourceType)) {
    return c.json({ detail: "invalid sourceType" }, 422);
  }
  if (body.title !== undefined && body.title.trim().length > MAX_TITLE) {
    return c.json({ detail: `title must be ${MAX_TITLE} characters or fewer` }, 422);
  }
  if (body.sectionLabel !== undefined && body.sectionLabel.trim().length > MAX_SECTION_LABEL) {
    return c.json({ detail: `sectionLabel must be ${MAX_SECTION_LABEL} characters or fewer` }, 422);
  }
  if (body.description !== undefined && body.description && body.description.trim().length > MAX_DESC) {
    return c.json({ detail: `description must be ${MAX_DESC} characters or fewer` }, 422);
  }
  if (body.sourceUrl !== undefined && !URL_RE.test(body.sourceUrl)) {
    return c.json({ detail: "sourceUrl must start with http:// or https://" }, 422);
  }
  if (body.sourceUrl !== undefined && body.sourceUrl.length > MAX_URL) {
    return c.json({ detail: `sourceUrl must be ${MAX_URL} characters or fewer` }, 422);
  }
  if (body.posterUrl && !URL_RE.test(body.posterUrl)) {
    return c.json({ detail: "posterUrl must start with http:// or https://" }, 422);
  }
  if (body.posterUrl && body.posterUrl.length > MAX_URL) {
    return c.json({ detail: `posterUrl must be ${MAX_URL} characters or fewer` }, 422);
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.title !== undefined)       { fields.push("title = ?");       values.push(body.title.trim()); }
  if (body.description !== undefined) { fields.push("description = ?"); values.push(body.description?.trim() || null); }
  if (body.sectionLabel !== undefined){ fields.push("sectionLabel = ?"); values.push(body.sectionLabel.trim()); }
  if (body.sourceType !== undefined)  { fields.push("sourceType = ?");  values.push(body.sourceType); }
  if (body.sourceUrl !== undefined)   { fields.push("sourceUrl = ?");   values.push(body.sourceUrl); }
  if ("posterUrl" in body)            { fields.push("posterUrl = ?");   values.push(body.posterUrl || null); }

  if (fields.length > 0) {
    fields.push("updatedAt = ?");
    values.push(nowIso());
    values.push(mediaId);
    values.push(profileId);
    await c.env.DB.prepare(
      `UPDATE media SET ${fields.join(", ")} WHERE id = ? AND profileId = ?`
    ).bind(...values).run();
  }

  const row = await c.env.DB.prepare(
    "SELECT * FROM media WHERE id = ? AND profileId = ?"
  ).bind(mediaId, profileId).first<MediaRow>();
  return c.json(mediaToDict(row!));
});

// ---------------------------------------------------------------------------
// Media: delete
// ---------------------------------------------------------------------------

app.delete("/api/profiles/:id/media/:mediaId", async (c) => {
  const profileId = c.req.param("id");
  const mediaId = c.req.param("mediaId");
  const auth = await requireProfileOrAdmin(c.env.DB, c.env.MASTER_PASSCODE, c.req.raw.headers, profileId);
  if (auth instanceof Response) return auth;

  const result = await c.env.DB.prepare(
    "DELETE FROM media WHERE id = ? AND profileId = ?"
  ).bind(mediaId, profileId).run();
  if (result.meta.changes === 0) return c.json({ detail: "Media not found" }, 404);
  return c.json({ ok: true, deleted: mediaId });
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default app;
