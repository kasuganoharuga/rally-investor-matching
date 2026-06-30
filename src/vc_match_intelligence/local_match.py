"""Simple local matcher for generated artifacts.

This is a deterministic smoke-test matcher. The production path should use the
database tables, but this helps tune fields before AWS is fully wired up.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def norm(value: Any) -> str:
    return str(value or "").strip().lower()


def contains_any(values: list[Any], target: Any) -> bool:
    needle = norm(target)
    return any(needle and needle in norm(value) for value in values)


def score_profile(founder: dict[str, Any], profile: dict[str, Any]) -> dict[str, Any]:
    score = 0
    breakdown: dict[str, Any] = {}
    strengths: list[str] = []
    risks: list[str] = []

    founder_country = norm(founder.get("company_hq_country"))
    is_anz_founder = founder_country in {"au", "australia", "nz", "new zealand"}
    local_au_anz = bool(profile.get("local_au_anz_fund"))
    if is_anz_founder and local_au_anz:
        score += 25
        breakdown["au_anz_mandate"] = 25
        strengths.append("AU/ANZ mandate appears aligned.")
    elif is_anz_founder:
        score += 10
        breakdown["au_anz_mandate"] = 10
        risks.append("AU/ANZ founder fit is not clearly local-fund level.")
    else:
        breakdown["au_anz_mandate"] = 0

    stage = founder.get("stage")
    supported_stages = profile.get("supported_stages", [])
    first_cheque_stages = profile.get("first_cheque_stages", [])
    if contains_any(first_cheque_stages, stage):
        score += 25
        breakdown["stage_fit"] = 25
        strengths.append("Stage matches observed first-cheque stages.")
    elif contains_any(supported_stages, stage):
        score += 18
        breakdown["stage_fit"] = 18
        strengths.append("Stage is inside the investor's broader observed range.")
    else:
        breakdown["stage_fit"] = 0
        risks.append("Stage fit is not obvious from structured data.")

    sector = founder.get("sector")
    if contains_any(profile.get("supported_sectors", []), sector):
        score += 15
        breakdown["sector_fit"] = 15
        strengths.append("Sector appears in observed investor activity.")
    else:
        breakdown["sector_fit"] = 0
        risks.append("Sector match needs manual review.")

    business_model = founder.get("business_model")
    if contains_any(profile.get("supported_business_models", []), business_model):
        score += 15
        breakdown["business_model_fit"] = 15
        strengths.append("Business model appears in recent deal evidence.")
    else:
        breakdown["business_model_fit"] = 0
        risks.append("Business model match is not directly supported.")

    lead_needed = founder.get("lead_needed")
    lead_behavior = norm(profile.get("lead_behavior"))
    if lead_needed is True and any(token in lead_behavior for token in ["lead", "sometimes", "both"]):
        score += 10
        breakdown["lead_fit"] = 10
        strengths.append("Lead behaviour may fit the round need.")
    elif lead_needed is False:
        score += 5
        breakdown["lead_fit"] = 5
    else:
        breakdown["lead_fit"] = 0

    contact_path = profile.get("contact_path") or {}
    if isinstance(contact_path, dict) and contact_path:
        score += 10
        breakdown["contact_path"] = 10
        strengths.append("Contact path exists in structured data.")
    else:
        breakdown["contact_path"] = 0
        risks.append("Contact path is missing or unclear.")

    return {
        "investor_id": profile.get("investor_id"),
        "investor_name": profile.get("investor_name"),
        "score": score,
        "breakdown": breakdown,
        "strengths": strengths,
        "risks": risks,
        "review_needed_fields": profile.get("review_needed_fields", []),
    }


def select_evidence(founder: dict[str, Any], chunks: list[dict[str, Any]], limit: int = 5) -> list[dict[str, Any]]:
    keywords = [
        founder.get("stage"),
        founder.get("sector"),
        founder.get("business_model"),
        founder.get("company_hq_country"),
    ]
    scored = []
    for item in chunks:
        text = norm(item.get("chunk_text"))
        score = sum(1 for keyword in keywords if keyword and norm(keyword) in text)
        if item.get("section_key") in {"deal_evidence", "partner_routing"}:
            score += 1
        if score > 0:
            scored.append((score, item))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [
        {
            "section_key": item.get("section_key"),
            "entity_type": item.get("entity_type"),
            "entity_id": item.get("entity_id"),
            "confidence": item.get("confidence"),
            "review_needed": item.get("review_needed"),
            "chunk_text": item.get("chunk_text"),
            "source_urls": item.get("source_urls", []),
        }
        for _, item in scored[:limit]
    ]


def run_match(founder_path: Path, artifacts_dir: Path) -> dict[str, Any]:
    founder = load_json(founder_path)
    results = []
    for profile_path in artifacts_dir.glob("*/matching_profile.json"):
        profile = load_json(profile_path)
        chunks = load_jsonl(profile_path.parent / "rag_chunks.jsonl")
        result = score_profile(founder, profile)
        result["evidence"] = select_evidence(founder, chunks)
        results.append(result)
    results.sort(key=lambda item: item["score"], reverse=True)
    for index, item in enumerate(results, start=1):
        item["rank"] = index
    return {"founder_profile": founder, "results": results}


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a local VC match over generated artifacts")
    parser.add_argument("--founder", required=True, type=Path, help="Founder profile JSON")
    parser.add_argument("--artifacts", default=Path("outputs"), type=Path, help="Artifacts directory")
    args = parser.parse_args()

    print(json.dumps(run_match(args.founder, args.artifacts), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
