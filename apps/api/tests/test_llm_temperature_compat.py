"""Regression: Anthropic SDK 1.x may reject Messages.create(temperature=...)."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.providers.llm import LLMClient, LLMConfig, classify_llm_error


def _config() -> LLMConfig:
    return LLMConfig(
        provider="anthropic",
        anthropic_model="claude-sonnet-4-6",
        bedrock_model_id=None,
        aws_region="ap-southeast-2",
        max_tokens=1200,
        temperature=0.0,
    )


def test_classify_llm_error_credit_balance() -> None:
    assert (
        classify_llm_error(
            RuntimeError("Your credit balance is too low to access the Anthropic API")
        )
        == "credit_balance"
    )


def test_anthropic_retries_without_temperature_when_sdk_rejects_it() -> None:
    text_block = SimpleNamespace(type="text", text="ok")
    message = SimpleNamespace(content=[text_block], usage=None)
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
            operation="test_retry",
        )

    assert result == "ok"
    assert create.call_count == 2
    assert "temperature" in create.call_args_list[0].kwargs
    assert "temperature" not in create.call_args_list[1].kwargs


def test_anthropic_passes_temperature_when_supported() -> None:
    text_block = SimpleNamespace(type="text", text="ok")
    usage = SimpleNamespace(input_tokens=11, output_tokens=3)
    message = SimpleNamespace(content=[text_block], usage=usage)
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
            operation="test_ok",
        )

    assert result == "ok"
    assert create.call_count == 1
    assert create.call_args.kwargs["temperature"] == 0.2


def test_anthropic_logs_classified_failure_without_raising_change() -> None:
    create = MagicMock(
        side_effect=RuntimeError(
            "Your credit balance is too low to access the Anthropic API"
        )
    )
    client = MagicMock()
    client.messages.create = create

    with (
        patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}),
        patch("app.providers.llm.Anthropic", return_value=client),
        patch("app.providers.llm.logger") as mock_logger,
    ):
        try:
            LLMClient(_config()).generate_text(
                system="sys",
                user="secret founder pitch",
                operation="founder_sector_pass",
            )
            raised = False
        except RuntimeError:
            raised = True

    assert raised
    mock_logger.error.assert_called_once()
    logged = " ".join(str(arg) for arg in mock_logger.error.call_args[0])
    assert "credit_balance" in logged
    assert "founder_sector_pass" in logged
    assert "secret founder pitch" not in logged
