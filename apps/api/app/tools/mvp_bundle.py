"""Build frontend/API read-model files for the chatbot MVP."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

DEFAULT_WEIGHTS = {
    "geography_anz_mandate": 15,
    "stage_first_cheque_fit": 15,
    "sector_use_case_fit": 15,
    "recent_deal_similarity": 15,
    "business_model_icp_fit": 10,
    "cheque_round_size_fit": 8,
    "lead_behavior_fit": 8,
    "investor_activity_recency": 6,
    "ai_thesis_appetite": 4,
    "founder_traction_fit": 4,
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def money_label(value: dict[str, Any] | None) -> str:
    if not isinstance(value, dict):
        return "Gap"
    amount = value.get("value")
    if amount is None:
        return "Gap"
    return " ".join(
        str(part)
        for part in [value.get("currency"), amount, value.get("unit")]
        if part not in {None, ""}
    )


def make_investor_card(profile: dict[str, Any], detail_path: str) -> dict[str, Any]:
    cheque = profile.get("cheque_size") or {}
    return {
        "investor_id": profile.get("investor_id"),
        "investor_name": profile.get("investor_name"),
        "detail_path": detail_path,
        "au_anz_relevance": profile.get("au_anz_relevance"),
        "au_anz_relevance_confidence": profile.get("au_anz_relevance_confidence"),
        "local_au_anz_fund": profile.get("local_au_anz_fund"),
        "supported_stages": profile.get("supported_stages", []),
        "first_cheque_stages": profile.get("first_cheque_stages", []),
        "supported_sectors": profile.get("supported_sectors", []),
        "supported_business_models": profile.get("supported_business_models", []),
        "cheque_label": (
            f"{money_label(cheque.get('min'))} - {money_label(cheque.get('max'))}"
        ),
        "cheque_confidence": cheque.get("confidence"),
        "lead_behavior": profile.get("lead_behavior"),
        "warm_intro_required": profile.get("warm_intro_required"),
        "contact_path": profile.get("contact_path", {}),
        "review_needed_fields": profile.get("review_needed_fields", []),
    }


def summarize_deal(deal: dict[str, Any]) -> dict[str, Any]:
    return {
        "deal_id": deal.get("deal_id"),
        "company": deal.get("company"),
        "round_stage": deal.get("round_stage"),
        "round_amount": deal.get("round_amount"),
        "announced_date": deal.get("announced_date"),
        "role": deal.get("role"),
        "is_lead": deal.get("is_lead"),
        "company_hq_country": deal.get("company_hq_country"),
        "primary_market": deal.get("primary_market"),
        "company_anz_relevance": deal.get("company_anz_relevance"),
        "investor_mandate_fit": deal.get("investor_mandate_fit"),
        "business_model_orientation": deal.get("business_model_orientation"),
        "business_model_detail": deal.get("business_model_detail"),
        "verification_status": deal.get("verification_status"),
        "deal_confidence": deal.get("deal_confidence"),
        "source_urls": [
            source.get("url")
            for source in deal.get("deal_sources", [])
            if source.get("url")
        ],
    }


def build_detail(
    record: dict[str, Any], profile: dict[str, Any], chunks: list[dict[str, Any]]
) -> dict[str, Any]:
    investor = record.get("investor", {})
    investor_id = investor.get("investor_id")
    selected_chunks = [
        {
            "section_key": item.get("section_key"),
            "entity_type": item.get("entity_type"),
            "entity_id": item.get("entity_id"),
            "confidence": item.get("confidence"),
            "review_needed": item.get("review_needed"),
            "chunk_text": item.get("chunk_text"),
            "source_urls": item.get("source_urls", []),
        }
        for item in chunks
        if item.get("section_key")
        in {
            "claimed_position",
            "deal_evidence",
            "partner_routing",
            "routing_hypothesis",
            "review_gap",
        }
    ][:16]

    return {
        "investor_id": investor_id,
        "investor_name": investor.get("investor_name"),
        "aliases": investor.get("aliases", []),
        "fund_type": investor.get("fund_type"),
        "hq_location": investor.get("hq_location"),
        "offices": investor.get("offices", []),
        "geography_focus": investor.get("geography_focus", []),
        "themes_claimed": investor.get("themes_claimed", []),
        "matching_profile": profile,
        "deals": [summarize_deal(deal) for deal in record.get("deals", [])],
        "partners": record.get("partners", []),
        "partner_routing_hypotheses": record.get("partner_routing_hypotheses", []),
        "co_investment_edges": record.get("co_investment_edges", []),
        "review_tasks": record.get("review_tasks", []),
        "evidence_chunks": selected_chunks,
        "source_urls": record.get("sources_primary", []),
    }


def build_bundle(outputs_dir: Path, out_dir: Path) -> dict[str, Any]:
    investors = []
    details = []

    for profile_path in sorted(outputs_dir.glob("*/matching_profile.json")):
        investor_dir = profile_path.parent
        record_path = investor_dir / "record.json"
        chunks_path = investor_dir / "rag_chunks.jsonl"
        if not record_path.exists():
            continue

        profile = read_json(profile_path)
        record = read_json(record_path)
        chunks = read_jsonl(chunks_path)
        investor_id = profile["investor_id"]
        detail_rel = f"investors/{investor_id}/detail.json"

        detail = build_detail(record, profile, chunks)
        card = make_investor_card(profile, detail_rel)

        write_json(out_dir / detail_rel, detail)
        investors.append(card)
        details.append(detail)

    index = {
        "version": "mvp-v1",
        "description": (
            "Frontend/API read model for the VC Match Intelligence chatbot MVP."
        ),
        "investor_count": len(investors),
        "investors": investors,
    }

    config = {
        "version": "mvp-v1",
        "app_name": "VC Match Intelligence",
        "candidate_count": {
            "default": 5,
            "minimum": 3,
            "maximum": 5,
        },
        "matching_weights": DEFAULT_WEIGHTS,
        "hard_filter_policy": {
            "only_hard_filter_when_confidence_high": True,
            "only_hard_filter_when_field_is_hard_filter_safe": True,
            "otherwise_use_soft_score": True,
        },
        "detail_route_template": "/investors/{investor_id}",
        "data_files": {
            "investor_index": "investors/index.json",
            "chatbot_prompt": "prompts/chatbot_system_prompt.md",
            "api_contract": "api/chatbot_api_contract.json",
        },
    }

    api_contract = {
        "version": "mvp-v1",
        "endpoints": [
            {
                "method": "POST",
                "path": "/chat/match",
                "description": (
                    "Parse founder/company input and return 3-5 matched investors "
                    "with evidence."
                ),
                "request": {
                    "message": "Free-text company/founder description",
                    "candidate_count": "Optional integer 3-5",
                },
                "response": {
                    "parsed_company_profile": (
                        "Structured profile extracted from message"
                    ),
                    "matches": [
                        {
                            "investor_id": "airtree",
                            "rank": 1,
                            "score": 86,
                            "score_breakdown": DEFAULT_WEIGHTS,
                            "short_reason": "Why this investor matched",
                            "risks_or_gaps": ["Fields requiring review"],
                            "evidence": ["Source-grounded chunks"],
                            "detail_url": "/investors/airtree",
                        }
                    ],
                },
            },
            {
                "method": "GET",
                "path": "/investors/{investor_id}",
                "description": "Return investor detail page data.",
                "response_file_shape": "investors/{investor_id}/detail.json",
            },
        ],
    }

    prompt = """# VC Match Intelligence Chatbot Prompt

You are the conversation layer for a VC matching product.

Given a founder's company description, extract:

- company HQ and primary market
- founder AU/NZ connection
- stage and round type
- amount being raised
- sector
- business model
- whether they need a lead investor
- warm-intro availability

Use the structured matching engine results as the ranking authority.
Do not invent investors, cheque sizes, partner routes, or deal evidence.
Explain each match using retrieved evidence chunks only.
Always show gaps and low-confidence fields clearly.
Return 3-5 investors unless fewer candidates pass the matching policy.
"""

    write_json(out_dir / "investors" / "index.json", index)
    write_json(out_dir / "chatbot_config.json", config)
    write_json(out_dir / "api" / "chatbot_api_contract.json", api_contract)
    (out_dir / "prompts").mkdir(parents=True, exist_ok=True)
    (out_dir / "prompts" / "chatbot_system_prompt.md").write_text(
        prompt, encoding="utf-8"
    )

    return {
        "out_dir": str(out_dir),
        "investor_count": len(investors),
        "files": [
            str(path.relative_to(out_dir))
            for path in sorted(out_dir.rglob("*"))
            if path.is_file()
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build S3-ready MVP read-model bundle")
    parser.add_argument("--outputs", type=Path, default=Path("data/outputs/generated"))
    parser.add_argument(
        "--out", type=Path, default=Path("data/outputs/generated/mvp/v1")
    )
    args = parser.parse_args()

    result = build_bundle(args.outputs, args.out)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
