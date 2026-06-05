"""MediaHub backend API tests.

Tests cover:
- Health check
- Admin verification
- Public profile listing
- Profile passcode verification
- Admin CRUD (create/list/update/delete) with header auth
"""
import os
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load frontend .env to get REACT_APP_BACKEND_URL (public URL)
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
MASTER = "1115"
ADMIN_HEADERS = {"X-Admin-Passcode": MASTER, "Content-Type": "application/json"}
JSON_HEADERS = {"Content-Type": "application/json"}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    yield s
    # Teardown: cleanup any TEST_ prefixed profiles
    try:
        r = s.get(f"{API}/admin/profiles", headers=ADMIN_HEADERS, timeout=10)
        if r.ok:
            for p in r.json():
                if p.get("name", "").startswith("TEST_"):
                    s.delete(f"{API}/admin/profiles/{p['id']}", headers=ADMIN_HEADERS, timeout=10)
    except Exception:
        pass


# ---------- Health ----------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"


# ---------- Admin verify ----------
class TestAdminVerify:
    def test_wrong_passcode_401(self, session):
        r = session.post(f"{API}/admin/verify", json={"passcode": "0000"}, timeout=10)
        assert r.status_code == 401

    def test_correct_passcode_200(self, session):
        r = session.post(f"{API}/admin/verify", json={"passcode": MASTER}, timeout=10)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- Profile creation validation ----------
class TestProfileCreateValidation:
    def test_create_without_header_401(self, session):
        payload = {"name": "TEST_NoAuth", "passcode": "1234", "color": "#10b981", "icon": "User", "sections": []}
        r = session.post(f"{API}/admin/profiles", json=payload, timeout=10)
        assert r.status_code == 401

    def test_create_invalid_passcode_422(self, session):
        payload = {"name": "TEST_BadPass", "passcode": "12", "color": "#10b981", "icon": "User", "sections": []}
        r = session.post(f"{API}/admin/profiles", json=payload, headers=ADMIN_HEADERS, timeout=10)
        assert r.status_code == 422

    def test_create_invalid_color_422(self, session):
        payload = {"name": "TEST_BadColor", "passcode": "1234", "color": "red", "icon": "User", "sections": []}
        r = session.post(f"{API}/admin/profiles", json=payload, headers=ADMIN_HEADERS, timeout=10)
        assert r.status_code == 422


# ---------- Full CRUD workflow ----------
class TestProfileCRUD:
    created_id = None

    def test_01_create_valid_profile(self, session):
        payload = {
            "name": "TEST_Demo",
            "passcode": "1234",
            "color": "#10b981",
            "icon": "Film",
            "sections": ["Movies", "Music"],
        }
        r = session.post(f"{API}/admin/profiles", json=payload, headers=ADMIN_HEADERS, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and isinstance(data["id"], str)
        assert data["name"] == "TEST_Demo"
        assert data["color"] == "#10b981"
        assert data["icon"] == "Film"
        assert data["sections"] == ["Movies", "Music"]
        assert data["passcode"] == "1234"  # admin response includes passcode
        TestProfileCRUD.created_id = data["id"]

    def test_02_public_list_excludes_passcode(self, session):
        r = session.get(f"{API}/profiles", timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        found = [p for p in items if p["id"] == TestProfileCRUD.created_id]
        assert len(found) == 1
        assert "passcode" not in found[0]
        assert found[0]["name"] == "TEST_Demo"

    def test_03_admin_list_includes_passcode(self, session):
        r = session.get(f"{API}/admin/profiles", headers=ADMIN_HEADERS, timeout=10)
        assert r.status_code == 200
        items = r.json()
        found = [p for p in items if p["id"] == TestProfileCRUD.created_id]
        assert len(found) == 1
        assert found[0]["passcode"] == "1234"

    def test_04_admin_list_without_header_401(self, session):
        r = session.get(f"{API}/admin/profiles", timeout=10)
        assert r.status_code == 401

    def test_05_verify_wrong_passcode_401(self, session):
        pid = TestProfileCRUD.created_id
        r = session.post(f"{API}/profiles/{pid}/verify", json={"passcode": "0000"}, timeout=10)
        assert r.status_code == 401

    def test_06_verify_correct_passcode_returns_profile_no_passcode(self, session):
        pid = TestProfileCRUD.created_id
        r = session.post(f"{API}/profiles/{pid}/verify", json={"passcode": "1234"}, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == pid
        assert "passcode" not in data
        assert data["name"] == "TEST_Demo"

    def test_07_update_preserves_untouched(self, session):
        pid = TestProfileCRUD.created_id
        r = session.put(
            f"{API}/admin/profiles/{pid}",
            json={"name": "TEST_DemoRenamed", "sections": ["Books"]},
            headers=ADMIN_HEADERS,
            timeout=10,
        )
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "TEST_DemoRenamed"
        assert data["sections"] == ["Books"]
        # Untouched fields preserved
        assert data["color"] == "#10b981"
        assert data["icon"] == "Film"
        assert data["passcode"] == "1234"

    def test_08_delete_profile(self, session):
        pid = TestProfileCRUD.created_id
        r = session.delete(f"{API}/admin/profiles/{pid}", headers=ADMIN_HEADERS, timeout=10)
        assert r.status_code == 200
        # Verify subsequent get excludes it
        r2 = session.get(f"{API}/profiles", timeout=10)
        assert r2.status_code == 200
        ids = [p["id"] for p in r2.json()]
        assert pid not in ids

    def test_09_verify_deleted_profile_404(self, session):
        pid = TestProfileCRUD.created_id
        r = session.post(f"{API}/profiles/{pid}/verify", json={"passcode": "1234"}, timeout=10)
        assert r.status_code == 404
