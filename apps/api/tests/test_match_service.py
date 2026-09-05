import pytest

from app.schemas.match import IntakeRequest
from app.services import match_service as match_service_module
from app.services.match_service import MatchService


def test_intake_does_not_open_a_connection_while_parsing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A PostgreSQL connection must not be held open across the LLM calls in
    parse_founder_message() — that's the exact pattern that exhausts RDS
    connections under a handful of concurrent matching requests."""

    def unexpected_connection() -> None:
        raise AssertionError("connection opened before/without a DB query")

    monkeypatch.setattr(match_service_module, "open_connection", unexpected_connection)
    monkeypatch.setattr(
        match_service_module,
        "parse_founder_message",
        lambda _message: (_ for _ in ()).throw(RuntimeError("boom from the LLM call")),
    )

    request = IntakeRequest(message="Sydney seed-stage healthtech, raising A$2m.")
    with pytest.raises(RuntimeError, match="boom from the LLM call"):
        MatchService().intake(request=request)


def test_needs_follow_up_never_opens_a_connection(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When the parsed profile is missing required fields and no follow-up
    has been supplied yet, intake() returns before ever touching the
    database — it must not open a connection just to throw the result away."""

    def unexpected_connection() -> None:
        raise AssertionError("connection opened on a needs_follow_up response")

    monkeypatch.setattr(match_service_module, "open_connection", unexpected_connection)
    monkeypatch.setattr(
        match_service_module,
        "parse_founder_message",
        lambda _message: {},
    )

    request = IntakeRequest(message="Just a name, nothing else.")
    response = MatchService().intake(request=request)

    assert response.status == "needs_follow_up"
    assert response.matches == []
