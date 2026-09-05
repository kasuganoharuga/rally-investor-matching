"""LLM provider abstraction for local Claude API and production Bedrock.

The rest of the app should call this module instead of importing Anthropic or
Bedrock directly. Switching provider is an environment setting:

- ``LLM_PROVIDER=anthropic`` for local development with an Anthropic API key.
- ``LLM_PROVIDER=bedrock`` for AWS production with IAM and Bedrock model access.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import time
from dataclasses import dataclass
from typing import Any

import boto3
from anthropic import Anthropic
from botocore.config import Config as BotocoreConfig
from dotenv import load_dotenv

DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6"
DEFAULT_MAX_TOKENS = 1200
DEFAULT_TEMPERATURE = 0.0
DEFAULT_AWS_REGION = "ap-southeast-2"

# Both SDKs default to timeouts far longer than any request should live:
# the Anthropic client waits 10 minutes, botocore 60s with up to 5 attempts.
# A matching request makes two of these calls back to back, so the ceiling
# here is what nginx's proxy_read_timeout and the Next.js AbortSignal are
# sized against — see scripts/aws/configure-https.sh and
# apps/web/src/features/matching/server/services/matching-history-service.ts.
# Worst case per call: LLM_TIMEOUT_SECONDS * (1 + LLM_MAX_RETRIES) + backoff.
LLM_TIMEOUT_SECONDS = 30.0
LLM_CONNECT_TIMEOUT_SECONDS = 5.0
# Retry is delegated to each SDK, which only retries genuinely transient
# failures (429/5xx/connection) with backoff — never a 400 for an exhausted
# credit balance or a 401 for a bad key, where a retry only doubles latency.
LLM_MAX_RETRIES = 1

logger = logging.getLogger(__name__)


class LLMProviderError(RuntimeError):
    """A failed LLM call, tagged with a stable class for triage.

    Raised instead of letting a raw provider exception reach FastAPI's
    catch-all handler, where an exhausted credit balance, a 429, a 529 and
    a malformed JSON reply all became the same opaque 500. The registered
    handler in app.core.errors maps `error_class` to a distinguishable
    status code; the original exception stays on `__cause__` for logs.
    """

    # Transient enough to be worth another attempt from the caller/user.
    RETRYABLE_CLASSES = frozenset({"rate_limit", "overloaded", "timeout"})

    def __init__(self, error_class: str) -> None:
        self.error_class = error_class
        self.retryable = error_class in self.RETRYABLE_CLASSES
        super().__init__(f"LLM provider call failed: {error_class}")


@dataclass(frozen=True)
class LLMConfig:
    provider: str
    anthropic_model: str
    bedrock_model_id: str | None
    aws_region: str
    max_tokens: int
    temperature: float


def load_config() -> LLMConfig:
    load_dotenv()
    provider = os.getenv("LLM_PROVIDER", "anthropic").strip().lower()
    if provider not in {"anthropic", "bedrock"}:
        raise ValueError("LLM_PROVIDER must be 'anthropic' or 'bedrock'")

    return LLMConfig(
        provider=provider,
        anthropic_model=os.getenv("ANTHROPIC_MODEL", DEFAULT_ANTHROPIC_MODEL),
        bedrock_model_id=os.getenv("BEDROCK_LLM_MODEL_ID") or None,
        aws_region=os.getenv("AWS_REGION", DEFAULT_AWS_REGION),
        max_tokens=int(os.getenv("LLM_MAX_TOKENS", str(DEFAULT_MAX_TOKENS))),
        temperature=float(os.getenv("LLM_TEMPERATURE", str(DEFAULT_TEMPERATURE))),
    )


def classify_llm_error(exc: BaseException) -> str:
    """Map provider failures to stable, PII-free error classes for ops grepping."""
    if isinstance(exc, LLMProviderError):
        return exc.error_class
    text = str(exc).lower()
    if "credit balance" in text or "too low to access" in text:
        return "credit_balance"
    if "rate limit" in text or "429" in text:
        return "rate_limit"
    if "authentication" in text or "invalid api key" in text or "unauthorized" in text:
        return "auth"
    if "overloaded" in text or "529" in text:
        return "overloaded"
    if isinstance(exc, TypeError) and "temperature" in text:
        return "temperature_unsupported"
    if "did not return json" in text:
        return "invalid_json"
    # Both SDKs surface a timeout as a distinct exception type rather than a
    # recognisable message, so match on the class name too.
    if "timeout" in text or "timeout" in type(exc).__name__.lower():
        return "timeout"
    if "use case details have not been submitted" in text:
        return "model_access_not_granted"
    if "accessdenied" in text.replace(" ", "") or "not authorized to perform" in text:
        return "auth"
    return type(exc).__name__


def _usage_tokens(usage: Any) -> tuple[int | None, int | None]:
    if usage is None:
        return None, None
    if isinstance(usage, dict):
        input_tokens = usage.get("input_tokens")
        output_tokens = usage.get("output_tokens")
    else:
        input_tokens = getattr(usage, "input_tokens", None)
        output_tokens = getattr(usage, "output_tokens", None)
    return (
        int(input_tokens) if input_tokens is not None else None,
        int(output_tokens) if output_tokens is not None else None,
    )


class LLMClient:
    def __init__(self, config: LLMConfig | None = None) -> None:
        self.config = config or load_config()

    def generate_text(
        self,
        *,
        system: str,
        user: str,
        max_tokens: int | None = None,
        temperature: float | None = None,
        operation: str | None = None,
    ) -> str:
        started = time.perf_counter()
        model = (
            self.config.anthropic_model
            if self.config.provider == "anthropic"
            else self.config.bedrock_model_id
        )
        try:
            if self.config.provider == "anthropic":
                text, input_tokens, output_tokens = self._generate_text_anthropic(
                    system=system,
                    user=user,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            else:
                text, input_tokens, output_tokens = self._generate_text_bedrock(
                    system=system,
                    user=user,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            latency_ms = int((time.perf_counter() - started) * 1000)
            logger.info(
                "llm_call_completed provider=%s model=%s operation=%s "
                "latency_ms=%s input_tokens=%s output_tokens=%s status=ok",
                self.config.provider,
                model or "unknown",
                operation or "unspecified",
                latency_ms,
                input_tokens if input_tokens is not None else "-",
                output_tokens if output_tokens is not None else "-",
            )
            return text
        except Exception as exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            error_class = classify_llm_error(exc)
            logger.error(
                "llm_call_failed provider=%s model=%s operation=%s "
                "latency_ms=%s error_class=%s",
                self.config.provider,
                model or "unknown",
                operation or "unspecified",
                latency_ms,
                error_class,
            )
            # Re-raise as a classified error so the API layer can answer with
            # a status that distinguishes "try again shortly" from "this
            # account is misconfigured", instead of one blanket 500. The
            # provider exception is preserved as __cause__ (never in the
            # message — it can echo the founder's prompt).
            raise LLMProviderError(error_class) from exc

    def generate_json(
        self,
        *,
        system: str,
        user: str,
        max_tokens: int | None = None,
        temperature: float | None = None,
        operation: str | None = None,
    ) -> dict[str, Any]:
        text = self.generate_text(
            system=system,
            user=user,
            max_tokens=max_tokens,
            temperature=temperature,
            operation=operation,
        )
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            start = text.find("{")
            end = text.rfind("}")
            if start >= 0 and end > start:
                try:
                    return json.loads(text[start : end + 1])
                except json.JSONDecodeError:
                    pass
            # Do not include model text in the exception — it may contain PII.
            logger.error(
                "llm_call_failed provider=%s model=%s operation=%s error_class=%s",
                self.config.provider,
                self.config.anthropic_model
                if self.config.provider == "anthropic"
                else (self.config.bedrock_model_id or "unknown"),
                operation or "unspecified",
                "invalid_json",
            )
            raise LLMProviderError("invalid_json") from exc

    def _generate_text_anthropic(
        self,
        *,
        system: str,
        user: str,
        max_tokens: int | None,
        temperature: float | None,
    ) -> tuple[str, int | None, int | None]:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError(
                "ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic"
            )

        # Without these the SDK waits up to 10 minutes per call and retries
        # up to twice on top of that — long past the point the browser,
        # nginx and the Next.js proxy have all given up on the request.
        client = Anthropic(
            api_key=api_key,
            timeout=LLM_TIMEOUT_SECONDS,
            max_retries=LLM_MAX_RETRIES,
        )
        # Anthropic SDK 1.x rejects `temperature` for some models
        # (e.g. claude-sonnet-4-6). Pass it when supported, otherwise omit.
        create_kwargs: dict[str, Any] = {
            "model": self.config.anthropic_model,
            "max_tokens": max_tokens or self.config.max_tokens,
            "system": system,
            "messages": [
                {
                    "role": "user",
                    "content": user,
                }
            ],
        }
        resolved_temperature = (
            self.config.temperature if temperature is None else temperature
        )
        try:
            message = client.messages.create(
                **create_kwargs,
                temperature=resolved_temperature,
            )
        except TypeError as exc:
            if "temperature" not in str(exc):
                raise
            message = client.messages.create(**create_kwargs)
        text = "".join(
            block.text
            for block in message.content
            if getattr(block, "type", None) == "text"
        ).strip()
        input_tokens, output_tokens = _usage_tokens(getattr(message, "usage", None))
        return text, input_tokens, output_tokens

    def _generate_text_bedrock(
        self,
        *,
        system: str,
        user: str,
        max_tokens: int | None,
        temperature: float | None,
    ) -> tuple[str, int | None, int | None]:
        if not self.config.bedrock_model_id:
            raise ValueError(
                "BEDROCK_LLM_MODEL_ID is required when LLM_PROVIDER=bedrock"
            )

        # botocore's defaults (60s read, up to 5 attempts) can stack to
        # minutes on a struggling endpoint; bound both explicitly. "standard"
        # retry mode only retries throttling/5xx, never an access-denied or
        # a validation error, so a misconfigured account fails fast.
        client = boto3.client(
            "bedrock-runtime",
            region_name=self.config.aws_region,
            config=BotocoreConfig(
                connect_timeout=LLM_CONNECT_TIMEOUT_SECONDS,
                read_timeout=LLM_TIMEOUT_SECONDS,
                retries={"max_attempts": LLM_MAX_RETRIES + 1, "mode": "standard"},
            ),
        )
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens or self.config.max_tokens,
            "temperature": self.config.temperature
            if temperature is None
            else temperature,
            "system": system,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": user,
                        }
                    ],
                }
            ],
        }
        response = client.invoke_model(
            modelId=self.config.bedrock_model_id,
            body=json.dumps(body),
            accept="application/json",
            contentType="application/json",
        )
        payload = json.loads(response["body"].read())
        text = "".join(
            block.get("text", "")
            for block in payload.get("content", [])
            if block.get("type") == "text"
        ).strip()
        input_tokens, output_tokens = _usage_tokens(payload.get("usage"))
        return text, input_tokens, output_tokens


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Smoke-test the configured LLM provider"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Ask for a small JSON response to test structured generation",
    )
    args = parser.parse_args()

    client = LLMClient()
    if args.json:
        result = client.generate_json(
            system="Return only valid compact JSON. No Markdown.",
            user=(
                "Extract this company profile: AU B2B AI healthtech startup, "
                "raising A$2.5m seed. Return keys: hq_country, sector, "
                "business_model, stage, raise_amount_aud_million."
            ),
            max_tokens=300,
            operation="smoke_json",
        )
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    print(
        client.generate_text(
            system="You are a concise VC matching assistant.",
            user="Say one sentence confirming the VC matching LLM provider works.",
            max_tokens=120,
            operation="smoke_text",
        )
    )


if __name__ == "__main__":
    main()
