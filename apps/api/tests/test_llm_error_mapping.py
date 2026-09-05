"""LLM failures must stay distinguishable instead of collapsing into 500s.

Before this, an exhausted credit balance, a 429, a 529 and a malformed JSON
reply all reached the client as the same opaque "Internal server error", which
is what made the production outage so slow to diagnose.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

import app.services.match_service as match_service_module
from app.core.config import settings
from app.main import app
from app.providers.llm import LLMClient, LLMConfig, LLMProviderError


def _config(provider: str = "anthropic") -> LLMConfig:
    return LLMConfig(
        provider=provider,
        anthropic_model="claude-sonnet-4-6",
        bedrock_model_id="au.anthropic.claude-sonnet-4-6",
        aws_region="ap-southeast-2",
        max_tokens=1200,
        temperature=0.0,
    )


def matching_server_headers(monkeypatch: pytest.MonkeyPatch) -> dict[str, str]:
    key = "test-only-matching-server-key-with-32-characters"
    monkeypatch.setattr(settings, "rally_matching_api_secret", SecretStr(key))
    return {"X-Rally-Matching-Key": key}


@pytest.mark.parametrize(
    ("provider_message", "expected_class", "expected_retryable"),
    [
        (
            "Your credit balance is too low to access the Anthropic API",
            "credit_balance",
            False,
        ),
        ("rate limit exceeded", "rate_limit", True),
        ("Overloaded", "overloaded", True),
        ("authentication_error: invalid x-api-key", "auth", False),
        (
            "Model use case details have not been submitted for this account",
            "model_access_not_granted",
            False,
        ),
    ],
)
def test_provider_failures_are_classified(
    provider_message: str,
    expected_class: str,
    expected_retryable: bool,
) -> None:
    client = MagicMock()
    client.messages.create = MagicMock(side_effect=RuntimeError(provider_message))

    with (
        patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}),
        patch("app.providers.llm.Anthropic", return_value=client),
        pytest.raises(LLMProviderError) as raised,
    ):
        LLMClient(_config()).generate_text(system="sys", user="user", operation="t")

    assert raised.value.error_class == expected_class
    assert raised.value.retryable is expected_retryable
    # The provider exception survives for the logs, never in the message —
    # it can echo the founder's prompt back.
    assert isinstance(raised.value.__cause__, RuntimeError)
    assert provider_message not in str(raised.value)


def test_non_json_reply_is_classified_rather_than_crashing() -> None:
    text_block = SimpleNamespace(type="text", text="I'm sorry, I can't do that.")
    message = SimpleNamespace(content=[text_block], usage=None)
    client = MagicMock()
    client.messages.create = MagicMock(return_value=message)

    with (
        patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}),
        patch("app.providers.llm.Anthropic", return_value=client),
        pytest.raises(LLMProviderError) as raised,
    ):
        LLMClient(_config()).generate_json(system="sys", user="user", operation="t")

    assert raised.value.error_class == "invalid_json"


def test_anthropic_client_is_constructed_with_bounded_timeout_and_retries() -> None:
    text_block = SimpleNamespace(type="text", text="ok")
    message = SimpleNamespace(content=[text_block], usage=None)
    client = MagicMock()
    client.messages.create = MagicMock(return_value=message)

    with (
        patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}),
        patch("app.providers.llm.Anthropic", return_value=client) as constructor,
    ):
        LLMClient(_config()).generate_text(system="sys", user="user", operation="t")

    kwargs = constructor.call_args.kwargs
    # The SDK default is a 10-minute timeout with 2 retries on top — far past
    # the point nginx, the Next.js proxy and the browser have all given up.
    assert kwargs["timeout"] <= 60
    assert kwargs["max_retries"] <= 2


def test_bedrock_client_is_constructed_with_bounded_timeout_and_retries() -> None:
    body = MagicMock()
    body.read.return_value = b'{"content": [{"type": "text", "text": "ok"}]}'
    bedrock = MagicMock()
    bedrock.invoke_model = MagicMock(return_value={"body": body})

    with patch("app.providers.llm.boto3.client", return_value=bedrock) as constructor:
        LLMClient(_config("bedrock")).generate_text(
            system="sys", user="user", operation="t"
        )

    config = constructor.call_args.kwargs["config"]
    assert config.read_timeout <= 60
    assert config.connect_timeout <= 15
    assert config.retries["max_attempts"] <= 3


@pytest.mark.parametrize(
    ("error_class", "expected_status"),
    [
        ("credit_balance", 503),
        ("rate_limit", 503),
        ("overloaded", 503),
        ("auth", 503),
        ("model_access_not_granted", 503),
        ("invalid_json", 502),
        ("RuntimeError", 502),
    ],
)
def test_match_intake_maps_llm_failures_to_distinguishable_statuses(
    monkeypatch: pytest.MonkeyPatch,
    error_class: str,
    expected_status: int,
) -> None:
    def failing_parse(_message: str) -> dict[str, object]:
        raise LLMProviderError(error_class)

    monkeypatch.setattr(match_service_module, "parse_founder_message", failing_parse)
    headers = matching_server_headers(monkeypatch)

    response = TestClient(app, raise_server_exceptions=False).post(
        "/api/v1/match/intake",
        headers=headers,
        json={"message": "We are an AU AI health company raising a seed round."},
    )

    assert response.status_code == expected_status
    body = response.json()["error"]
    assert body["code"] == "LLM_PROVIDER_ERROR"
    # Never 500/"Internal server error" any more — the proxy and any monitor
    # can now tell "retry shortly" from "this will never succeed as sent".
    assert body["message"] != "Internal server error"
    # The failure class is ops information; it must not leak to the caller.
    assert error_class not in response.text
