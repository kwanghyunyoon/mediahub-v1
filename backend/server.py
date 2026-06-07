"""
MediaHub backend — single-file FastAPI app.

LAYOUT (top to bottom):
  1. Imports + env + Mongo client
  2. lifespan handler (idempotent seed + backfills on startup)
  3. Rate limiter (in-memory) for the two passcode-verify endpoints
  4. Per-profile passcode dependency (gates the media endpoints)
  5. Pydantic models (Profile, Media, Reorder bodies)
  6. Helpers (now, to_public, to_admin, media_to_dict)
  7. Routes:
       - public:  GET /api/profiles, /api/profiles/{id}/verify, /api/admin/verify
       - admin:   /api/admin/profiles* (header X-Admin-Passcode)
       - media:   /api/profiles/{id}/media* (header X-Profile-Passcode)
       - sections: /api/profiles/{id}/sections/reorder (header X-Profile-Passcode)
       - oembed:  GET /api/oembed?url=... (YouTube/Vimeo metadata proxy)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import time
import json
import asyncio
import urllib.request
import urllib.parse
from collections import defaultdict
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

MASTER_PASSCODE = os.environ.get('MASTER_PASSCODE', '1115')


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup: idempotent seed + backfills
    try:
        await _seed_westwood_ranch()
        await _backfill_media_order()
    except Exception as e:
        logger.exception(f"Startup tasks failed: {e}")
    yield
    # Shutdown
    client.close()


app = FastAPI(title="MediaHub API", lifespan=lifespan)
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
PASSCODE_RE = re.compile(r'^\d{4}$')
HEX_RE = re.compile(r'^#[0-9A-Fa-f]{6}$')


class ProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    passcode: str
    color: str
    icon: str = Field(min_length=1, max_length=40)
    sections: List[str] = Field(default_factory=list)
    theme: str = Field(default="default", max_length=30)
    backgroundUrl: Optional[str] = Field(default=None, max_length=2048)

    @field_validator('passcode')
    @classmethod
    def _v_pass(cls, v: str) -> str:
        if not PASSCODE_RE.match(v):
            raise ValueError('passcode must be 4 digits')
        return v

    @field_validator('color')
    @classmethod
    def _v_color(cls, v: str) -> str:
        if not HEX_RE.match(v):
            raise ValueError('color must be hex like #RRGGBB')
        return v

    @field_validator('sections')
    @classmethod
    def _v_sections(cls, v: List[str]) -> List[str]:
        cleaned = [s.strip() for s in v if s and s.strip()]
        return cleaned[:20]

    @field_validator('backgroundUrl')
    @classmethod
    def _v_bg(cls, v):
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        if not (v.startswith('http://') or v.startswith('https://')):
            raise ValueError('backgroundUrl must start with http:// or https://')
        return v


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=40)
    passcode: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = Field(default=None, min_length=1, max_length=40)
    sections: Optional[List[str]] = None
    theme: Optional[str] = Field(default=None, max_length=30)
    backgroundUrl: Optional[str] = Field(default=None, max_length=2048)

    @field_validator('passcode')
    @classmethod
    def _v_pass(cls, v):
        if v is None:
            return v
        if not PASSCODE_RE.match(v):
            raise ValueError('passcode must be 4 digits')
        return v

    @field_validator('color')
    @classmethod
    def _v_color(cls, v):
        if v is None:
            return v
        if not HEX_RE.match(v):
            raise ValueError('color must be hex like #RRGGBB')
        return v

    @field_validator('sections')
    @classmethod
    def _v_sections(cls, v):
        if v is None:
            return v
        cleaned = [s.strip() for s in v if s and s.strip()]
        return cleaned[:20]

    @field_validator('backgroundUrl')
    @classmethod
    def _v_bg(cls, v):
        if v is None:
            return None
        v = v.strip()
        if v == "":
            return ""  # sentinel: clear the background
        if not (v.startswith('http://') or v.startswith('https://')):
            raise ValueError('backgroundUrl must start with http:// or https://')
        return v


class Profile(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    color: str
    icon: str
    sections: List[str]
    createdAt: str
    updatedAt: str


class ProfilePublic(BaseModel):
    """Profile data exposed without passcode."""
    id: str
    name: str
    color: str
    icon: str
    sections: List[str]
    theme: str = "default"
    backgroundUrl: Optional[str] = None


class PasscodeVerify(BaseModel):
    passcode: str


class AdminVerify(BaseModel):
    passcode: str


class MediaCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    sectionLabel: str = Field(min_length=1, max_length=50)
    sourceType: Literal["direct", "embed"]
    sourceUrl: str = Field(min_length=1, max_length=2048)
    posterUrl: Optional[str] = Field(default=None, max_length=2048)
    order: Optional[int] = Field(default=None, ge=0)

    @field_validator('sourceUrl')
    @classmethod
    def _v_url(cls, v: str) -> str:
        v = v.strip()
        if not (v.startswith('http://') or v.startswith('https://')):
            raise ValueError('sourceUrl must start with http:// or https://')
        return v

    @field_validator('posterUrl')
    @classmethod
    def _v_poster(cls, v):
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        if not (v.startswith('http://') or v.startswith('https://')):
            raise ValueError('posterUrl must start with http:// or https://')
        return v


class MediaUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    sectionLabel: Optional[str] = Field(default=None, min_length=1, max_length=50)
    sourceType: Optional[Literal["direct", "embed"]] = None
    sourceUrl: Optional[str] = Field(default=None, min_length=1, max_length=2048)
    posterUrl: Optional[str] = Field(default=None, max_length=2048)

    @field_validator('sourceUrl')
    @classmethod
    def _v_url(cls, v):
        if v is None:
            return v
        v = v.strip()
        if not (v.startswith('http://') or v.startswith('https://')):
            raise ValueError('sourceUrl must start with http:// or https://')
        return v

    @field_validator('posterUrl')
    @classmethod
    def _v_poster(cls, v):
        if v is None:
            return None
        v = v.strip()
        if v == "":
            # Treat empty string as "clear the poster"
            return ""
        if not (v.startswith('http://') or v.startswith('https://')):
            raise ValueError('posterUrl must start with http:// or https://')
        return v


# ---------- Helpers ----------
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _to_public(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "name": doc["name"],
        "color": doc["color"],
        "icon": doc["icon"],
        "sections": doc.get("sections", []),
        "theme": doc.get("theme", "default"),
        "backgroundUrl": doc.get("backgroundUrl"),
    }


def _to_admin(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "name": doc["name"],
        "color": doc["color"],
        "icon": doc["icon"],
        "sections": doc.get("sections", []),
        "theme": doc.get("theme", "default"),
        "backgroundUrl": doc.get("backgroundUrl"),
        "passcode": doc["passcode"],
        "createdAt": doc.get("createdAt"),
        "updatedAt": doc.get("updatedAt"),
    }


def _require_admin(x_admin_passcode: Optional[str]) -> None:
    if not x_admin_passcode or x_admin_passcode != MASTER_PASSCODE:
        raise HTTPException(status_code=401, detail="Invalid admin passcode")


# ---------- Simple rate limiter for passcode verify endpoints ----------
# Tracks failed attempts per IP. After 5 fails in 5 minutes -> 429 for that IP.
_FAIL_LOG: dict = defaultdict(list)
_FAIL_WINDOW = 300   # 5 minutes
_FAIL_MAX = 5


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate(ip: str) -> None:
    now = time.time()
    fresh = [t for t in _FAIL_LOG[ip] if now - t < _FAIL_WINDOW]
    _FAIL_LOG[ip] = fresh
    if len(fresh) >= _FAIL_MAX:
        retry = int(_FAIL_WINDOW - (now - fresh[0]))
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. Try again in {retry}s.",
            headers={"Retry-After": str(max(retry, 1))},
        )


def _record_fail(ip: str) -> None:
    _FAIL_LOG[ip].append(time.time())


def _clear_fails(ip: str) -> None:
    _FAIL_LOG.pop(ip, None)


# ---------- Media access gate (per-profile passcode header) ----------
async def verify_profile_access(
    profile_id: str,
    x_profile_passcode: Optional[str] = Header(default=None),
) -> None:
    """Dependency: requires X-Profile-Passcode matching the profile."""
    if not x_profile_passcode:
        raise HTTPException(status_code=401, detail="X-Profile-Passcode header required")
    doc = await db.profiles.find_one({"id": profile_id}, {"_id": 0, "passcode": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Profile not found")
    if doc["passcode"] != x_profile_passcode:
        raise HTTPException(status_code=401, detail="Invalid profile passcode")


def _media_to_dict(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "profileId": doc["profileId"],
        "title": doc["title"],
        "description": doc.get("description"),
        "sectionLabel": doc["sectionLabel"],
        "sourceType": doc["sourceType"],
        "sourceUrl": doc["sourceUrl"],
        "posterUrl": doc.get("posterUrl"),
        "order": doc.get("order", 0),
        "createdAt": doc.get("createdAt"),
        "updatedAt": doc.get("updatedAt"),
    }


async def _ensure_profile_exists(profile_id: str) -> None:
    exists = await db.profiles.find_one({"id": profile_id}, {"_id": 0, "id": 1})
    if not exists:
        raise HTTPException(status_code=404, detail="Profile not found")


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "MediaHub API", "status": "ok"}


@api_router.post("/admin/verify")
async def admin_verify(body: AdminVerify, request: Request):
    ip = _client_ip(request)
    _check_rate(ip)
    if body.passcode != MASTER_PASSCODE:
        _record_fail(ip)
        raise HTTPException(status_code=401, detail="Invalid master passcode")
    _clear_fails(ip)
    return {"ok": True}


@api_router.get("/profiles", response_model=List[ProfilePublic])
async def list_profiles_public():
    cursor = db.profiles.find({}, {"_id": 0, "passcode": 0}).sort("createdAt", 1)
    docs = await cursor.to_list(500)
    return [_to_public(d) for d in docs]


@api_router.post("/profiles/{profile_id}/verify", response_model=ProfilePublic)
async def verify_profile_passcode(profile_id: str, body: PasscodeVerify, request: Request):
    ip = _client_ip(request)
    _check_rate(ip)
    doc = await db.profiles.find_one({"id": profile_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Profile not found")
    if body.passcode != doc.get("passcode"):
        _record_fail(ip)
        raise HTTPException(status_code=401, detail="Wrong passcode")
    _clear_fails(ip)
    return _to_public(doc)


# --- Admin routes ---
@api_router.get("/admin/profiles")
async def list_profiles_admin(x_admin_passcode: Optional[str] = Header(default=None)):
    _require_admin(x_admin_passcode)
    cursor = db.profiles.find({}, {"_id": 0}).sort("createdAt", 1)
    docs = await cursor.to_list(500)
    return [_to_admin(d) for d in docs]


@api_router.post("/admin/profiles")
async def create_profile(
    body: ProfileCreate,
    x_admin_passcode: Optional[str] = Header(default=None),
):
    _require_admin(x_admin_passcode)
    now = _now_iso()
    doc = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "passcode": body.passcode,
        "color": body.color,
        "icon": body.icon,
        "sections": body.sections,
        "theme": body.theme,
        "backgroundUrl": body.backgroundUrl,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.profiles.insert_one(doc)
    doc.pop("_id", None)
    return _to_admin(doc)


@api_router.put("/admin/profiles/{profile_id}")
async def update_profile(
    profile_id: str,
    body: ProfileUpdate,
    x_admin_passcode: Optional[str] = Header(default=None),
):
    _require_admin(x_admin_passcode)
    existing = await db.profiles.find_one({"id": profile_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Profile not found")
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if "name" in updates:
        updates["name"] = updates["name"].strip()
    # Empty string means "clear the background image"
    if "backgroundUrl" in body.model_dump(exclude_unset=True) and body.backgroundUrl == "":
        updates["backgroundUrl"] = None
    updates["updatedAt"] = _now_iso()
    await db.profiles.update_one({"id": profile_id}, {"$set": updates})
    doc = await db.profiles.find_one({"id": profile_id}, {"_id": 0})
    return _to_admin(doc)


@api_router.delete("/admin/profiles/{profile_id}")
async def delete_profile(
    profile_id: str,
    x_admin_passcode: Optional[str] = Header(default=None),
):
    _require_admin(x_admin_passcode)
    result = await db.profiles.delete_one({"id": profile_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    # Cascade: remove all media items belonging to this profile
    await db.media.delete_many({"profileId": profile_id})
    return {"ok": True, "deleted": profile_id}


# --- Media routes (scoped by profile, gated by per-profile passcode) ---
@api_router.get(
    "/profiles/{profile_id}/media",
    dependencies=[Depends(verify_profile_access)],
)
async def list_media(profile_id: str):
    await _ensure_profile_exists(profile_id)
    cursor = db.media.find({"profileId": profile_id}, {"_id": 0}).sort(
        [("sectionLabel", 1), ("order", 1), ("createdAt", 1)]
    )
    docs = await cursor.to_list(2000)
    return [_media_to_dict(d) for d in docs]


@api_router.post(
    "/profiles/{profile_id}/media",
    dependencies=[Depends(verify_profile_access)],
)
async def create_media(profile_id: str, body: MediaCreate):
    await _ensure_profile_exists(profile_id)
    now = _now_iso()
    next_order = body.order
    if next_order is None:
        next_order = await db.media.count_documents(
            {"profileId": profile_id, "sectionLabel": body.sectionLabel.strip()}
        )
    doc = {
        "id": str(uuid.uuid4()),
        "profileId": profile_id,
        "title": body.title.strip(),
        "description": (body.description or "").strip() or None,
        "sectionLabel": body.sectionLabel.strip(),
        "sourceType": body.sourceType,
        "sourceUrl": body.sourceUrl,
        "posterUrl": body.posterUrl,
        "order": next_order,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.media.insert_one(doc)
    doc.pop("_id", None)
    return _media_to_dict(doc)


@api_router.put(
    "/profiles/{profile_id}/media/{media_id}",
    dependencies=[Depends(verify_profile_access)],
)
async def update_media(profile_id: str, media_id: str, body: MediaUpdate):
    existing = await db.media.find_one(
        {"id": media_id, "profileId": profile_id}, {"_id": 0}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Media not found")
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    for str_field in ("title", "sectionLabel"):
        if str_field in updates:
            updates[str_field] = updates[str_field].strip()
    if "description" in updates:
        updates["description"] = (updates["description"] or "").strip() or None
    # posterUrl: empty string from client means "clear the poster"
    if "posterUrl" in updates and updates["posterUrl"] == "":
        updates["posterUrl"] = None
    updates["updatedAt"] = _now_iso()
    await db.media.update_one(
        {"id": media_id, "profileId": profile_id}, {"$set": updates}
    )
    doc = await db.media.find_one(
        {"id": media_id, "profileId": profile_id}, {"_id": 0}
    )
    return _media_to_dict(doc)


@api_router.delete(
    "/profiles/{profile_id}/media/{media_id}",
    dependencies=[Depends(verify_profile_access)],
)
async def delete_media(profile_id: str, media_id: str):
    result = await db.media.delete_one({"id": media_id, "profileId": profile_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Media not found")
    return {"ok": True, "deleted": media_id}


class MediaReorder(BaseModel):
    sectionLabel: str = Field(min_length=1, max_length=50)
    mediaIds: List[str] = Field(min_length=1, max_length=2000)


@api_router.post(
    "/profiles/{profile_id}/media/reorder",
    dependencies=[Depends(verify_profile_access)],
)
async def reorder_media(profile_id: str, body: MediaReorder):
    """Set the order of media items within one section, by id sequence."""
    from pymongo import UpdateOne
    await _ensure_profile_exists(profile_id)
    section = body.sectionLabel.strip()
    now = _now_iso()
    # Verify the ids belong to this profile + section to avoid cross-section drift
    existing = await db.media.find(
        {"profileId": profile_id, "sectionLabel": section, "id": {"$in": body.mediaIds}},
        {"_id": 0, "id": 1},
    ).to_list(len(body.mediaIds) + 1)
    valid_ids = {d["id"] for d in existing}
    ops = [
        UpdateOne(
            {"id": mid, "profileId": profile_id},
            {"$set": {"order": idx, "updatedAt": now}},
        )
        for idx, mid in enumerate(body.mediaIds)
        if mid in valid_ids
    ]
    updated = 0
    if ops:
        result = await db.media.bulk_write(ops, ordered=False)
        updated = result.modified_count
    return {"ok": True, "updated": updated, "section": section}


# --- Section reorder (profile-passcode gated) ---
class SectionReorder(BaseModel):
    sections: List[str] = Field(min_length=1, max_length=20)


@api_router.post(
    "/profiles/{profile_id}/sections/reorder",
    dependencies=[Depends(verify_profile_access)],
)
async def reorder_sections(profile_id: str, body: SectionReorder):
    """Reorder a profile's sections. Only reordering is allowed (no add/remove
    via this endpoint — those still go through the admin endpoints)."""
    doc = await db.profiles.find_one(
        {"id": profile_id}, {"_id": 0, "sections": 1}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Profile not found")
    new = [s.strip() for s in body.sections if s and s.strip()]
    if set(new) != set(doc.get("sections", [])):
        raise HTTPException(
            status_code=400,
            detail="Sections must be a reorder of existing names (no add/remove here)",
        )
    await db.profiles.update_one(
        {"id": profile_id},
        {"$set": {"sections": new, "updatedAt": _now_iso()}},
    )
    return {"ok": True, "sections": new}


# --- oEmbed metadata proxy (public; for the MediaForm "Fetch from URL" button) ---
@api_router.get("/oembed")
async def oembed_lookup(url: str):
    """Fetch oEmbed metadata for a YouTube or Vimeo URL.
    Returns {provider, title, description, thumbnail_url, author_name}."""
    url = (url or "").strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="Invalid URL")

    low = url.lower()
    if "youtube.com" in low or "youtu.be" in low:
        endpoint = (
            "https://www.youtube.com/oembed?format=json&url="
            + urllib.parse.quote(url, safe=":/?&=")
        )
        provider = "youtube"
    elif "vimeo.com" in low:
        endpoint = (
            "https://vimeo.com/api/oembed.json?url="
            + urllib.parse.quote(url, safe=":/?&=")
        )
        provider = "vimeo"
    else:
        raise HTTPException(
            status_code=400, detail="Only YouTube and Vimeo URLs are supported"
        )

    def _fetch():
        req = urllib.request.Request(
            endpoint, headers={"User-Agent": "MediaHub/1.0"}
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            return json.loads(resp.read().decode("utf-8"))

    try:
        data = await asyncio.to_thread(_fetch)
    except Exception as e:
        logger.warning(f"oEmbed failed for {url}: {e}")
        raise HTTPException(status_code=502, detail="Could not fetch metadata")

    return {
        "provider": provider,
        "title": data.get("title", "") or "",
        "description": data.get("description", "") or "",
        "thumbnail_url": data.get("thumbnail_url", "") or "",
        "author_name": data.get("author_name", "") or "",
    }


app.include_router(api_router)

# ---------- Seed example profile (Westwood Ranch) ----------
WESTERN_NAME = "Westwood Ranch"


async def _seed_westwood_ranch() -> None:
    """Create a richly themed example profile if it doesn't already exist.
    Also runs a one-shot poster backfill for any seeded items that lack one."""

    # Title -> Unsplash poster URL. Used for both fresh seeding and backfill.
    poster_by_title = {
        "Showdown at High Noon":
            "https://images.unsplash.com/photo-1502920514313-52581002a659?auto=format&fit=crop&w=900&q=70",
        "The Lone Rider's Last Ride":
            "https://images.unsplash.com/photo-1547753413-2cfdb1e0d2c1?auto=format&fit=crop&w=900&q=70",
        "Saloon Doors Swing Open":
            "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?auto=format&fit=crop&w=900&q=70",
        "Sunset on Monument Valley":
            "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=70",
        "Cattle Drive Across the Plains":
            "https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=900&q=70",
        "The Stagecoach Chase":
            "https://images.unsplash.com/photo-1583195763986-0ed2fcedee49?auto=format&fit=crop&w=900&q=70",
        "Whisper of the Coyote":
            "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=900&q=70",
        "Campfire Songs":
            "https://images.unsplash.com/photo-1525824236856-8c0a31dfe3be?auto=format&fit=crop&w=900&q=70",
        "The Forgotten Trail":
            "https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=900&q=70",
    }

    existing = await db.profiles.find_one(
        {"name": WESTERN_NAME, "theme": "western"}, {"_id": 0, "id": 1}
    )
    if existing:
        # Idempotent poster backfill — only fill items that don't have one yet.
        existing_pid = existing["id"]
        backfilled = 0
        async for doc in db.media.find(
            {"profileId": existing_pid, "$or": [
                {"posterUrl": {"$exists": False}}, {"posterUrl": None}
            ]},
            {"_id": 0, "id": 1, "title": 1},
        ).limit(1000):
            url = poster_by_title.get(doc["title"])
            if url:
                await db.media.update_one(
                    {"id": doc["id"]}, {"$set": {"posterUrl": url, "updatedAt": _now_iso()}}
                )
                backfilled += 1
        if backfilled:
            logger.info(f"Backfilled posters on {backfilled} Westwood Ranch media items.")
        return

    now = _now_iso()
    pid = str(uuid.uuid4())
    await db.profiles.insert_one({
        "id": pid,
        "name": WESTERN_NAME,
        "passcode": "1976",
        "color": "#C2410C",  # burnt orange
        "icon": "Crown",
        "sections": ["Best Moments", "Classic Scenes", "Hidden Gems"],
        "theme": "western",
        "createdAt": now,
        "updatedAt": now,
    })

    # Placeholder media: a mix of direct (Google public sample MP4s, always
    # reachable) and embed (YouTube watch links). The cards exist to showcase
    # layout; their actual playback is incidental.
    GOOG = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample"
    YT = "https://www.youtube.com/watch?v="

    items = [
        # Best Moments
        ("Showdown at High Noon",
         "The clock ticks, dust hangs in the air, and two riders square off in the empty street.",
         "Best Moments", "embed", f"{YT}enuOArEfqGo"),
        ("The Lone Rider's Last Ride",
         "A drifter takes one final ride into the setting sun over the open plains.",
         "Best Moments", "direct", f"{GOOG}/BigBuckBunny.mp4"),
        ("Saloon Doors Swing Open",
         "Boots on creaking floorboards, a hush over the room, and trouble walks in.",
         "Best Moments", "embed", f"{YT}lqAyrJ4qmtg"),

        # Classic Scenes
        ("Sunset on Monument Valley",
         "Mesa silhouettes burn red against an amber sky.",
         "Classic Scenes", "direct", f"{GOOG}/ElephantsDream.mp4"),
        ("Cattle Drive Across the Plains",
         "Hooves, dust, and the slow patience of a long trail north.",
         "Classic Scenes", "embed", f"{YT}ucPS_NXyXcQ"),
        ("The Stagecoach Chase",
         "Reins snap, wheels spin, and a six-horse team thunders across the river.",
         "Classic Scenes", "direct", f"{GOOG}/ForBiggerBlazes.mp4"),

        # Hidden Gems
        ("Whisper of the Coyote",
         "A moonlit ridge, a long howl, and the night listens back.",
         "Hidden Gems", "embed", f"{YT}YV9htC1NtBE"),
        ("Campfire Songs",
         "A harmonica, a ring of light, and stories older than the trail.",
         "Hidden Gems", "direct", f"{GOOG}/ForBiggerEscapes.mp4"),
        ("The Forgotten Trail",
         "A washed-out path winds through buttes nobody's named in a hundred years.",
         "Hidden Gems", "embed", f"{YT}R-NhP3HQfaA"),
    ]

    docs = []
    section_counters = {}
    for title, desc, section, src_type, src_url in items:
        order_idx = section_counters.get(section, 0)
        section_counters[section] = order_idx + 1
        docs.append({
            "id": str(uuid.uuid4()),
            "profileId": pid,
            "title": title,
            "description": desc,
            "sectionLabel": section,
            "sourceType": src_type,
            "sourceUrl": src_url,
            "posterUrl": poster_by_title.get(title),
            "order": order_idx,
            "createdAt": now,
            "updatedAt": now,
        })
    if docs:
        await db.media.insert_many(docs)

    logger.info(f"Seeded example profile '{WESTERN_NAME}' with {len(docs)} media items.")


@app.on_event("startup")
async def _startup_seed():
    # superseded by the lifespan handler; kept as a no-op for any pre-existing tooling
    return


async def _backfill_media_order() -> None:
    """Assign sequential `order` to any media items missing it, grouped by
    (profileId, sectionLabel), sorted by createdAt. Idempotent."""
    missing = await db.media.count_documents(
        {"$or": [{"order": {"$exists": False}}, {"order": None}]}
    )
    if missing == 0:
        return
    # Build the assignment by iterating all media in a stable order
    cursor = db.media.find({}, {"_id": 0, "id": 1, "profileId": 1, "sectionLabel": 1, "order": 1}).sort(
        [("profileId", 1), ("sectionLabel", 1), ("createdAt", 1)]
    ).limit(10000)
    counters: dict = {}
    now = _now_iso()
    fixed = 0
    async for doc in cursor:
        key = (doc["profileId"], doc["sectionLabel"])
        idx = counters.get(key, 0)
        counters[key] = idx + 1
        if doc.get("order") is None:
            await db.media.update_one(
                {"id": doc["id"]}, {"$set": {"order": idx, "updatedAt": now}}
            )
            fixed += 1
    if fixed:
        logger.info(f"Backfilled order on {fixed} media items.")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    # kept for any process managers that still send shutdown signals
    pass
