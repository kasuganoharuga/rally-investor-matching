"""Regression: Anthropic SDK 1.x may reject Messages.create(temperature=...)."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.providers.llm import LLMClient, LLMConfig


def _config() -> LLMConfig:
    return LLMConfig(
        provider="anthropic",
        anthropic_model="claude-sonnet-4-6",
        bedrock_model_id=None,
        aws_region="ap-southeast-2",
        max_tokens=1200,
        temperature=0.0,
    )


def test_anthropic_retries_without_temperature_when_sdk_rejects_it() -> None:
    text_block = SimpleNamespace(type="text", text="ok")
    message = SimpleNamespace(content=[text_block])
    create = MagicMock(
        side_effect=[
            TypeError(
                "Messages.create() got an unexpected keyword argument 'temperature'"
            ),
            message,
        ]
    )
    client = MagicMock()
    client.messages.create = create

    with (
        patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}),
        patch("app.providers.llm.Anthropic", return_value=client),
    ):
        result = LLMClient(_config()).generate_text(
            system="sys",
            user="user",
            max_tokens=50,
        )

    assert result == "ok"
    assert create.call_count == 2
    assert "temperature" in create.call_args_list[0].kwargs
    assert "temperature" not in create.call_args_list[1].kwargs


def test_anthropic_passes_temperature_when_supported() -> None:
    text_block = SimpleNamespace(type="text", text="ok")
    message = SimpleNamespace(content=[text_block])
    create = MagicMock(return_value=message)
    client = MagicMock()
    client.messages.create = create

    with (
        patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}),
        patch("app.providers.llm.Anthropic", return_value=client),
    ):
        result = LLMClient(_config()).generate_text(
            system="sys",
            user="user",
            temperature=0.2,
        )

    assert result == "ok"
    assert create.call_count == 1
    assert create.call_args.kwargs["temperature"] == 0.2
