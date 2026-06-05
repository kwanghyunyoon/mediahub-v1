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


# ---------- Media CRUD ----------
@pytest.fixture(scope="class")
def media_profile(request):
    """Create a profile with sections for media tests; cleanup after."""
    s = requests.Session()
    payload = {
        "name": "TEST_MediaProfile",
        "passcode": "5678",
        "color": "#3b82f6",
        "icon": "Film",
        "sections": ["Movies", "Music", "Podcasts"],
    }
    r = s.post(f"{API}/admin/profiles", json=payload, headers=ADMIN_HEADERS, timeout=10)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    request.cls.profile_id = pid
    yield pid
    try:
        s.delete(f"{API}/admin/profiles/{pid}", headers=ADMIN_HEADERS, timeout=10)
    except Exception:
        pass


@pytest.mark.usefixtures("media_profile")
class TestMediaCRUD:
    profile_id: str = ""

    def test_01_list_empty_for_new_profile(self, session):
        r = session.get(f"{API}/profiles/{self.profile_id}/media", timeout=10)
        assert r.status_code == 200
        assert r.json() == []

    def test_02_list_404_for_unknown_profile(self, session):
        r = session.get(f"{API}/profiles/does-not-exist-xyz/media", timeout=10)
        assert r.status_code == 404

    def test_03_create_direct_media(self, session):
        payload = {
            "title": "Big Buck Bunny",
            "description": "Open-source short film",
            "sectionLabel": "Movies",
            "sourceType": "direct",
            "sourceUrl": "https://example.com/bbb.mp4",
        }
        r = session.post(
            f"{API}/profiles/{self.profile_id}/media",
            json=payload, headers=JSON_HEADERS, timeout=10,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["title"] == "Big Buck Bunny"
        assert data["description"] == "Open-source short film"
        assert data["sectionLabel"] == "Movies"
        assert data["sourceType"] == "direct"
        assert data["sourceUrl"] == "https://example.com/bbb.mp4"
        assert "id" in data and isinstance(data["id"], str)
        assert data["profileId"] == self.profile_id
        TestMediaCRUD.direct_id = data["id"]

        # Verify via GET (persistence)
        r2 = session.get(f"{API}/profiles/{self.profile_id}/media", timeout=10)
        ids = [m["id"] for m in r2.json()]
        assert data["id"] in ids

    def test_04_create_embed_media(self, session):
        payload = {
            "title": "Cool Talk",
            "sectionLabel": "Podcasts",
            "sourceType": "embed",
            "sourceUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
        }
        r = session.post(
            f"{API}/profiles/{self.profile_id}/media",
            json=payload, headers=JSON_HEADERS, timeout=10,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["sourceType"] == "embed"
        assert data["description"] is None  # optional, not provided
        TestMediaCRUD.embed_id = data["id"]

    def test_05_reject_non_http_url_422(self, session):
        payload = {
            "title": "Bad", "sectionLabel": "Movies",
            "sourceType": "direct", "sourceUrl": "ftp://example.com/x.mp4",
        }
        r = session.post(
            f"{API}/profiles/{self.profile_id}/media",
            json=payload, headers=JSON_HEADERS, timeout=10,
        )
        assert r.status_code == 422

    def test_06_reject_bad_source_type_422(self, session):
        payload = {
            "title": "Bad", "sectionLabel": "Movies",
            "sourceType": "magnet", "sourceUrl": "https://example.com/x.mp4",
        }
        r = session.post(
            f"{API}/profiles/{self.profile_id}/media",
            json=payload, headers=JSON_HEADERS, timeout=10,
        )
        assert r.status_code == 422

    def test_07_reject_empty_title_422(self, session):
        payload = {
            "title": "", "sectionLabel": "Movies",
            "sourceType": "direct", "sourceUrl": "https://example.com/x.mp4",
        }
        r = session.post(
            f"{API}/profiles/{self.profile_id}/media",
            json=payload, headers=JSON_HEADERS, timeout=10,
        )
        assert r.status_code == 422

    def test_08_reject_empty_section_422(self, session):
        payload = {
            "title": "Ok", "sectionLabel": "",
            "sourceType": "direct", "sourceUrl": "https://example.com/x.mp4",
        }
        r = session.post(
            f"{API}/profiles/{self.profile_id}/media",
            json=payload, headers=JSON_HEADERS, timeout=10,
        )
        assert r.status_code == 422

    def test_09_create_on_unknown_profile_404(self, session):
        payload = {
            "title": "Ok", "sectionLabel": "Movies",
            "sourceType": "direct", "sourceUrl": "https://example.com/x.mp4",
        }
        r = session.post(
            f"{API}/profiles/missing-profile-id/media",
            json=payload, headers=JSON_HEADERS, timeout=10,
        )
        assert r.status_code == 404

    def test_10_partial_update_preserves_others(self, session):
        mid = TestMediaCRUD.direct_id
        r = session.put(
            f"{API}/profiles/{self.profile_id}/media/{mid}",
            json={"title": "Big Buck Bunny (HD)"},
            headers=JSON_HEADERS, timeout=10,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["title"] == "Big Buck Bunny (HD)"
        # Preserved
        assert data["sectionLabel"] == "Movies"
        assert data["sourceType"] == "direct"
        assert data["sourceUrl"] == "https://example.com/bbb.mp4"
        assert data["description"] == "Open-source short film"

    def test_11_update_unknown_media_404(self, session):
        r = session.put(
            f"{API}/profiles/{self.profile_id}/media/nonexistent-id",
            json={"title": "Whatever"},
            headers=JSON_HEADERS, timeout=10,
        )
        assert r.status_code == 404

    def test_12_delete_media_then_404(self, session):
        mid = TestMediaCRUD.embed_id
        r = session.delete(
            f"{API}/profiles/{self.profile_id}/media/{mid}", timeout=10
        )
        assert r.status_code == 200
        # subsequent GET excludes it
        r2 = session.get(f"{API}/profiles/{self.profile_id}/media", timeout=10)
        ids = [m["id"] for m in r2.json()]
        assert mid not in ids
        # delete again -> 404
        r3 = session.delete(
            f"{API}/profiles/{self.profile_id}/media/{mid}", timeout=10
        )
        assert r3.status_code == 404


# ---------- Theme field (iter 4) ----------
class TestThemeField:
    """POST/GET/PUT honors the theme field; defaults to 'default' when omitted."""

    def test_create_without_theme_defaults_to_default(self, session):
        payload = {
            "name": "TEST_ThemeDefault", "passcode": "4242",
            "color": "#10b981", "icon": "Film", "sections": ["A"],
        }
        r = session.post(f"{API}/admin/profiles", json=payload, headers=ADMIN_HEADERS, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("theme") == "default"
        pid = data["id"]

        # Public list exposes theme
        rp = session.get(f"{API}/profiles", timeout=10)
        assert rp.status_code == 200
        pub = [p for p in rp.json() if p["id"] == pid]
        assert len(pub) == 1
        assert pub[0].get("theme") == "default"

        # Verify endpoint also returns theme
        rv = session.post(f"{API}/profiles/{pid}/verify", json={"passcode": "4242"}, timeout=10)
        assert rv.status_code == 200
        assert rv.json().get("theme") == "default"

        session.delete(f"{API}/admin/profiles/{pid}", headers=ADMIN_HEADERS, timeout=10)

    def test_create_with_theme_western(self, session):
        payload = {
            "name": "TEST_ThemeWestern", "passcode": "4243",
            "color": "#C2410C", "icon": "Crown", "sections": ["X"],
            "theme": "western",
        }
        r = session.post(f"{API}/admin/profiles", json=payload, headers=ADMIN_HEADERS, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["theme"] == "western"
        pid = data["id"]

        # Public list shows theme
        rp = session.get(f"{API}/profiles", timeout=10)
        pub = [p for p in rp.json() if p["id"] == pid]
        assert pub[0]["theme"] == "western"

        session.delete(f"{API}/admin/profiles/{pid}", headers=ADMIN_HEADERS, timeout=10)

    def test_update_theme(self, session):
        payload = {
            "name": "TEST_ThemeMutable", "passcode": "4244",
            "color": "#10b981", "icon": "Film", "sections": ["A"],
        }
        r = session.post(f"{API}/admin/profiles", json=payload, headers=ADMIN_HEADERS, timeout=10)
        assert r.status_code == 200
        pid = r.json()["id"]
        assert r.json()["theme"] == "default"

        ru = session.put(
            f"{API}/admin/profiles/{pid}",
            json={"theme": "western"},
            headers=ADMIN_HEADERS, timeout=10,
        )
        assert ru.status_code == 200
        assert ru.json()["theme"] == "western"

        # Verify persisted
        rp = session.get(f"{API}/profiles", timeout=10)
        pub = [p for p in rp.json() if p["id"] == pid]
        assert pub[0]["theme"] == "western"

        session.delete(f"{API}/admin/profiles/{pid}", headers=ADMIN_HEADERS, timeout=10)


# ---------- Seed idempotency (iter 4) ----------
class TestSeedIdempotent:
    """Westwood Ranch is seeded exactly once and remains exactly one after reseed."""

    def test_westwood_ranch_exists_with_expected_shape(self, session):
        r = session.get(f"{API}/admin/profiles", headers=ADMIN_HEADERS, timeout=10)
        assert r.status_code == 200
        westwoods = [p for p in r.json() if p.get("name") == "Westwood Ranch" and p.get("theme") == "western"]
        assert len(westwoods) == 1, f"Expected exactly 1 Westwood Ranch, found {len(westwoods)}"
        w = westwoods[0]
        assert w["passcode"] == "1976"
        assert w["color"] == "#C2410C"
        assert w["icon"] == "Crown"
        assert w["sections"] == ["Best Moments", "Classic Scenes", "Hidden Gems"]

    def test_westwood_ranch_has_9_media_items(self, session):
        r = session.get(f"{API}/admin/profiles", headers=ADMIN_HEADERS, timeout=10)
        westwoods = [p for p in r.json() if p.get("name") == "Westwood Ranch" and p.get("theme") == "western"]
        pid = westwoods[0]["id"]
        rm = session.get(f"{API}/profiles/{pid}/media", timeout=10)
        assert rm.status_code == 200
        items = rm.json()
        assert len(items) == 9, f"Expected 9 seeded media items, got {len(items)}"
        by_section = {}
        for m in items:
            by_section.setdefault(m["sectionLabel"], []).append(m)
        for sec in ["Best Moments", "Classic Scenes", "Hidden Gems"]:
            assert sec in by_section, f"Missing section {sec}"
            assert len(by_section[sec]) == 3, f"{sec} should have 3 items, has {len(by_section[sec])}"
        # Mix of direct + embed
        types = {m["sourceType"] for m in items}
        assert types == {"direct", "embed"}

    def test_reseed_does_not_create_duplicates(self, session):
        """Call the seed coroutine directly and confirm count stays at 1."""
        import sys
        sys.path.insert(0, "/app/backend")
        import asyncio
        from server import _seed_westwood_ranch  # noqa

        # Run seed twice more
        async def _run():
            await _seed_westwood_ranch()
            await _seed_westwood_ranch()

        asyncio.run(_run())

        r = session.get(f"{API}/admin/profiles", headers=ADMIN_HEADERS, timeout=10)
        westwoods = [p for p in r.json() if p.get("name") == "Westwood Ranch" and p.get("theme") == "western"]
        assert len(westwoods) == 1, f"Reseed produced duplicates: {len(westwoods)}"

        # Media count still 9
        pid = westwoods[0]["id"]
        rm = session.get(f"{API}/profiles/{pid}/media", timeout=10)
        assert len(rm.json()) == 9


# ---------- Poster URL field (iter 5) ----------
@pytest.fixture(scope="class")
def poster_profile(request):
    s = requests.Session()
    payload = {
        "name": "TEST_PosterProfile", "passcode": "5151",
        "color": "#10b981", "icon": "Film", "sections": ["Movies"],
    }
    r = s.post(f"{API}/admin/profiles", json=payload, headers=ADMIN_HEADERS, timeout=10)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    request.cls.profile_id = pid
    yield pid
    try:
        s.delete(f"{API}/admin/profiles/{pid}", headers=ADMIN_HEADERS, timeout=10)
    except Exception:
        pass


@pytest.mark.usefixtures("poster_profile")
class TestPosterUrl:
    profile_id: str = ""

    def test_create_without_poster_returns_null(self, session):
        payload = {
            "title": "NoPoster", "sectionLabel": "Movies",
            "sourceType": "direct", "sourceUrl": "https://example.com/x.mp4",
        }
        r = session.post(f"{API}/profiles/{self.profile_id}/media", json=payload, headers=JSON_HEADERS, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "posterUrl" in data
        assert data["posterUrl"] is None
        # GET verifies persistence
        rg = session.get(f"{API}/profiles/{self.profile_id}/media", timeout=10)
        found = [m for m in rg.json() if m["id"] == data["id"]][0]
        assert found["posterUrl"] is None

    def test_create_with_valid_poster(self, session):
        url = "https://images.unsplash.com/photo-1502920514313-52581002a659"
        payload = {
            "title": "WithPoster", "sectionLabel": "Movies",
            "sourceType": "direct", "sourceUrl": "https://example.com/x.mp4",
            "posterUrl": url,
        }
        r = session.post(f"{API}/profiles/{self.profile_id}/media", json=payload, headers=JSON_HEADERS, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["posterUrl"] == url
        TestPosterUrl.media_id = data["id"]

    def test_create_with_empty_poster_treated_as_null(self, session):
        payload = {
            "title": "EmptyPoster", "sectionLabel": "Movies",
            "sourceType": "direct", "sourceUrl": "https://example.com/x.mp4",
            "posterUrl": "",
        }
        r = session.post(f"{API}/profiles/{self.profile_id}/media", json=payload, headers=JSON_HEADERS, timeout=10)
        assert r.status_code == 200, r.text
        assert r.json()["posterUrl"] is None

    def test_create_with_invalid_poster_422(self, session):
        payload = {
            "title": "BadPoster", "sectionLabel": "Movies",
            "sourceType": "direct", "sourceUrl": "https://example.com/x.mp4",
            "posterUrl": "ftp://example.com/p.jpg",
        }
        r = session.post(f"{API}/profiles/{self.profile_id}/media", json=payload, headers=JSON_HEADERS, timeout=10)
        assert r.status_code == 422

    def test_update_poster_clear_via_empty_string(self, session):
        mid = TestPosterUrl.media_id
        # Clear it
        r = session.put(
            f"{API}/profiles/{self.profile_id}/media/{mid}",
            json={"posterUrl": ""}, headers=JSON_HEADERS, timeout=10,
        )
        assert r.status_code == 200
        assert r.json()["posterUrl"] is None
        # Persisted
        rg = session.get(f"{API}/profiles/{self.profile_id}/media", timeout=10)
        found = [m for m in rg.json() if m["id"] == mid][0]
        assert found["posterUrl"] is None

    def test_update_poster_invalid_422(self, session):
        mid = TestPosterUrl.media_id
        r = session.put(
            f"{API}/profiles/{self.profile_id}/media/{mid}",
            json={"posterUrl": "notaurl"}, headers=JSON_HEADERS, timeout=10,
        )
        assert r.status_code == 422

    def test_update_poster_set_new_value(self, session):
        mid = TestPosterUrl.media_id
        new_url = "https://images.example.com/poster2.jpg"
        r = session.put(
            f"{API}/profiles/{self.profile_id}/media/{mid}",
            json={"posterUrl": new_url}, headers=JSON_HEADERS, timeout=10,
        )
        assert r.status_code == 200
        assert r.json()["posterUrl"] == new_url


# ---------- Westwood Ranch poster backfill (iter 5) ----------
class TestWestwoodRanchPosters:
    def test_all_9_items_have_posters(self, session):
        r = session.get(f"{API}/admin/profiles", headers=ADMIN_HEADERS, timeout=10)
        westwoods = [p for p in r.json() if p.get("name") == "Westwood Ranch" and p.get("theme") == "western"]
        assert len(westwoods) == 1
        pid = westwoods[0]["id"]
        rm = session.get(f"{API}/profiles/{pid}/media", timeout=10)
        assert rm.status_code == 200
        items = rm.json()
        assert len(items) == 9
        missing = [m for m in items if not m.get("posterUrl")]
        assert len(missing) == 0, f"Items missing posterUrl: {[m['title'] for m in missing]}"
        # All should be https unsplash URLs
        for m in items:
            assert m["posterUrl"].startswith("https://images.unsplash.com/"), m["posterUrl"]

    def test_backfill_is_idempotent(self, session):
        """After previous TestSeedIdempotent re-ran the seed twice, posters
        should still all be present (idempotent backfill — no clearing/dupe)."""
        r = session.get(f"{API}/admin/profiles", headers=ADMIN_HEADERS, timeout=10)
        westwoods = [p for p in r.json() if p.get("name") == "Westwood Ranch" and p.get("theme") == "western"]
        assert len(westwoods) == 1
        pid = westwoods[0]["id"]
        rm = session.get(f"{API}/profiles/{pid}/media", timeout=10)
        items = rm.json()
        assert len(items) == 9
        missing = [m for m in items if not m.get("posterUrl")]
        assert len(missing) == 0


# ---------- Cascade delete ----------
class TestCascadeDelete:
    def test_delete_profile_removes_media_and_returns_404(self, session):
        # Create dedicated profile
        payload = {
            "name": "TEST_CascadeProfile", "passcode": "9999",
            "color": "#f59e0b", "icon": "Music", "sections": ["S1"],
        }
        r = session.post(f"{API}/admin/profiles", json=payload, headers=ADMIN_HEADERS, timeout=10)
        assert r.status_code == 200
        pid = r.json()["id"]

        # Add 2 media items
        for i in range(2):
            mp = {
                "title": f"M{i}", "sectionLabel": "S1",
                "sourceType": "direct", "sourceUrl": f"https://example.com/{i}.mp4",
            }
            rr = session.post(f"{API}/profiles/{pid}/media", json=mp, headers=JSON_HEADERS, timeout=10)
            assert rr.status_code == 200

        # Sanity
        rg = session.get(f"{API}/profiles/{pid}/media", timeout=10)
        assert rg.status_code == 200 and len(rg.json()) == 2

        # Delete profile (cascade)
        rd = session.delete(f"{API}/admin/profiles/{pid}", headers=ADMIN_HEADERS, timeout=10)
        assert rd.status_code == 200

        # GET media -> 404 (profile gone)
        rg2 = session.get(f"{API}/profiles/{pid}/media", timeout=10)
        assert rg2.status_code == 404
