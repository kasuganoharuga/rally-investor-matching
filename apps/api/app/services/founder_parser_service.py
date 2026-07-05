"""Parse founder/company chat input into a structured matching profile."""

from __future__ import annotations

import argparse
import json

from app.providers.llm import LLMClient

SYSTEM_PROMPT = """You extract founder/company profiles for VC matching.

Return only valid JSON. Do not include Markdown.

Use null when a field is not available from the user text.
Do not invent facts.
Preserve numeric amounts exactly. For example:
- "A$2.5m" means target_raise_value 2.5, target_raise_currency "AUD",
  target_raise_unit "million".
- "$750k" means target_raise_value 750, target_raise_unit "thousand".
- Do not drop leading digits from decimal amounts.
Primary market is geographic, such as "Australia", "New Zealand", "ANZ",
"US", or "Global".
Do not put business model labels such as B2B or B2C in primary_market.

Required JSON keys:
- company_name
- company_hq_country
- primary_market
- founder_au_anz_connection
- stage
- round_type
- target_raise_value
- target_raise_currency
- target_raise_unit
- sector
- business_model
- lead_needed
- warm_intro_available
- traction_summary
- one_sentence_summary
- missing_information
"""


def parse_founder_message(message: str, client: LLMClient | None = None) -> dict:
    llm = client or LLMClient()
    return llm.generate_json(
        system=SYSTEM_PROMPT,
        user=f"Founder/company description:\n\n{message}",
        max_tokens=900,
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Parse founder/company input with the configured LLM"
    )
    parser.add_argument(
        "message", nargs="+", help="Founder/company free-text description"
    )
    args = parser.parse_args()

    parsed = parse_founder_message(" ".join(args.message))
    print(json.dumps(parsed, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
