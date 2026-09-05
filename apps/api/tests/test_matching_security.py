from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.api.dependencies import LOCAL_MATCHING_SECRET
from app.api.v1.match import match_service
from app.core.config import settings
from app.main import app
from app.schemas.match import IntakeResponse

TEST_SECRET = "test-only-matching-secret-not-a-production-credential"


@pytest.fixture
def secured_matching(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "rally_matching_api_secret", SecretStr(TEST_SECRET))
    monkeypatch.setattr(settings, "app_env", "production")

    def unexpected_connection() -> None:
        raise AssertionError("Unauthenticated request must not reach the database")

    # MatchService opens its own connection (see open_connection() in
    # app.db.connection) only once it's about to query investors, rather
    # than through a route-level dependency — so this is patched at its
    # import site in match_service, not as a FastAPI dependency override.
    monkeypatch.setattr(
        "app.services.match_service.open_connection", unexpected_connection
    )
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize("headers", [{}, {"X-Rally-Matching-Key": "forged"}])
def test_direct_matching_rejects_missing_or_forged_key(
    secured_matching: TestClient,
    headers: dict[str, str],
) -> None:
    response = secured_matching.post(
        "/api/v1/match/intake",
        headers=headers,
        json={
            "message": "A founder cannot bypass saved scoring through FastAPI.",
            "matching_configuration": {"result_limit": 30},
        },
    )
    assert response.status_code == 401
    assert "authenticated workspace" in response.json()["error"]["message"]
    assert TEST_SECRET not in response.text


@pytest.mark.parametrize("key", ["", "too-short", LOCAL_MATCHING_SECRET])
def test_deployed_matching_fails_closed_for_missing_or_unsafe_config(
    secured_matching: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    key: str,
) -> None:
    monkeypatch.setattr(settings, "rally_matching_api_secret", SecretStr(key))
    response = secured_matching.post(
        "/api/v1/match/intake",
        headers={"X-Rally-Matching-Key": key},
        json={"message": "Test"},
    )
    assert response.status_code == 503
    assert response.json()["error"]["message"] == "Matching service is not configured."


def test_trusted_proxy_key_allows_matching(
    secured_matching: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[dict[str, Any]] = []

    def fake_intake(**kwargs: Any) -> IntakeResponse:
        calls.append(kwargs)
        return IntakeResponse(
            status="matched",
            parsed_company_profile={},
            missing_fields=[],
            follow_up_question=None,
            follow_up_count=0,
            matches=[],
        )

    monkeypatch.setattr(match_service, "intake", fake_intake)
    response = secured_matching.post(
        "/api/v1/match/intake",
        headers={"X-Rally-Matching-Key": TEST_SECRET},
        json={"message": "Test"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "matched"
    assert len(calls) == 1
    assert calls[0]["request"].message == "Test"


def test_settings_repr_does_not_expose_matching_secret(
    secured_matching: TestClient,
) -> None:
    assert TEST_SECRET not in repr(settings)
