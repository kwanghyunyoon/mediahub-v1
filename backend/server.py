from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

MASTER_PASSCODE = os.environ.get('MASTER_PASSCODE', '1115')

app = FastAPI(title="MediaHub API")
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


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=40)
    passcode: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = Field(default=None, min_length=1, max_length=40)
    sections: Optional[List[str]] = None

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


class PasscodeVerify(BaseModel):
    passcode: str


class AdminVerify(BaseModel):
    passcode: str


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
    }


def _to_admin(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "name": doc["name"],
        "color": doc["color"],
        "icon": doc["icon"],
        "sections": doc.get("sections", []),
        "passcode": doc["passcode"],
        "createdAt": doc.get("createdAt"),
        "updatedAt": doc.get("updatedAt"),
    }


def _require_admin(x_admin_passcode: Optional[str]) -> None:
    if not x_admin_passcode or x_admin_passcode != MASTER_PASSCODE:
        raise HTTPException(status_code=401, detail="Invalid admin passcode")


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "MediaHub API", "status": "ok"}


@api_router.post("/admin/verify")
async def admin_verify(body: AdminVerify):
    if body.passcode != MASTER_PASSCODE:
        raise HTTPException(status_code=401, detail="Invalid master passcode")
    return {"ok": True}


@api_router.get("/profiles", response_model=List[ProfilePublic])
async def list_profiles_public():
    cursor = db.profiles.find({}, {"_id": 0, "passcode": 0}).sort("createdAt", 1)
    docs = await cursor.to_list(500)
    return [_to_public(d) for d in docs]


@api_router.post("/profiles/{profile_id}/verify", response_model=ProfilePublic)
async def verify_profile_passcode(profile_id: str, body: PasscodeVerify):
    doc = await db.profiles.find_one({"id": profile_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Profile not found")
    if body.passcode != doc.get("passcode"):
        raise HTTPException(status_code=401, detail="Wrong passcode")
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
    return {"ok": True, "deleted": profile_id}


app.include_router(api_router)

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
    client.close()
