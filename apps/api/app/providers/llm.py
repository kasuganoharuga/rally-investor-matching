"""LLM provider abstraction for local Claude API and production Bedrock.

The rest of the app should call this module instead of importing Anthropic or
Bedrock directly. Switching provider is an environment setting:

- ``LLM_PROVIDER=anthropic`` for local development with an Anthropic API key.
- ``LLM_PROVIDER=bedrock`` for AWS production with IAM and Bedrock model access.
"""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from typing import Any

import boto3
from anthropic import Anthropic
from dotenv import load_dotenv

DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6"
DEFAULT_MAX_TOKENS = 1200
DEFAULT_TEMPERATURE = 0.0
DEFAULT_AWS_REGION = "ap-southeast-2"


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
    ) -> str:
        if self.config.provider == "anthropic":
            return self._generate_text_anthropic(
                system=system,
                user=user,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        return self._generate_text_bedrock(
            system=system,
            user=user,
            max_tokens=max_tokens,
            temperature=temperature,
        )

    def generate_json(
        self,
        *,
        system: str,
        user: str,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> dict[str, Any]:
        text = self.generate_text(
            system=system,
            user=user,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}")
            if start >= 0 and end > start:
                return json.loads(text[start : end + 1])
            raise ValueError(f"LLM did not return JSON: {text}") from None

    def _generate_text_anthropic(
        self,
        *,
        system: str,
        user: str,
        max_tokens: int | None,
        temperature: float | None,
    ) -> str:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError(
                "ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic"
            )

        client = Anthropic(api_key=api_key)
        message = client.messages.create(
            model=self.config.anthropic_model,
            max_tokens=max_tokens or self.config.max_tokens,
            temperature=self.config.temperature if temperature is None else temperature,
            system=system,
            messages=[
                {
                    "role": "user",
                    "content": user,
                }
            ],
        )
        return "".join(
            block.text
            for block in message.content
            if getattr(block, "type", None) == "text"
        ).strip()

    def _generate_text_bedrock(
        self,
        *,
        system: str,
        user: str,
        max_tokens: int | None,
        temperature: float | None,
    ) -> str:
        if not self.config.bedrock_model_id:
            raise ValueError(
                "BEDROCK_LLM_MODEL_ID is required when LLM_PROVIDER=bedrock"
            )

        client = boto3.client("bedrock-runtime", region_name=self.config.aws_region)
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
        return "".join(
            block.get("text", "")
            for block in payload.get("content", [])
            if block.get("type") == "text"
        ).strip()


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
        )
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    print(
        client.generate_text(
            system="You are a concise VC matching assistant.",
            user="Say one sentence confirming the VC matching LLM provider works.",
            max_tokens=120,
        )
    )


if __name__ == "__main__":
    main()
