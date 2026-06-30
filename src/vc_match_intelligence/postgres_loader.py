"""Load VC investor records into PostgreSQL/Aurora.

This loader is intentionally boring: it mirrors the canonical JSON into tables
and rebuilds derived RAG chunks on each import. Embeddings are handled by a
separate step so schema/data loading works before Bedrock credentials exist.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
from typing import Any

from psycopg import connect
from psycopg.types.json import Jsonb

from vc_match_intelligence.artifacts import (
    build_matching_profile,
    build_rag_chunks,
    build_sources,
    investor_id,
    load_json,
    normalize_confidence,
)


SOURCE_TYPES = {
    "official_vc_note",
    "official_portfolio_page",
    "portfolio_company_announcement",
    "independent_media",
    "free_public_database",
    "co_investor_announcement",
    "social_post",
    "official_fund_page",
    "official_team_page",
    "other",
}
SOURCE_ROLES = {"primary", "verification", "context", "claim", "routing", "other"}
SOURCE_STRENGTHS = {"strong", "medium", "weak", "unknown"}
REVIEW_STATUSES = {"draft", "open", "reviewed", "approved", "rejected", "stale"}
DATE_PRECISIONS = {"day", "month", "year", "unknown"}
BUSINESS_MODELS = {"B2B", "B2C", "B2B2C", "B2G", "B2D", "Marketplace", "Mixed", "Gap"}
DEAL_STATUSES = {
    "verified_named_round",
    "official_portfolio_supported",
    "provisional_named_round",
    "non_verified_followon_event",
    "unknown",
}


def env_database_url(value: str | None) -> str:
    database_url = value or os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is required")
    return database_url


def enum_value(value: Any, allowed: set[str], default: str) -> str:
    if value in allowed:
        return str(value)
    text = "" if value is None else str(value).strip()
    return text if text in allowed else default


def business_model(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if text.lower() == "gap":
        return "Gap"
    return text if text in BUSINESS_MODELS else None


def confidence(value: Any) -> str:
    return normalize_confidence(value)


def apply_schema(database_url: str, schema_path: Path) -> None:
    sql = schema_path.read_text(encoding="utf-8")
    with connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()


def delete_existing_child_rows(cur: Any, inv_id: str) -> None:
    tables = [
        "match_result_evidence",
        "match_results",
        "rag_chunk_sources",
        "rag_chunks",
        "sources",
        "missing_sources",
        "co_investment_edges",
        "partner_routing_hypotheses",
        "partners",
        "review_tasks",
        "validation_search_logs",
        "deals",
        "investor_fields",
        "investor_matching_profiles",
    ]
    # match_result_evidence and match_results do not have investor_id on every
    # table in the same way, so remove only what can be scoped cleanly.
    cur.execute(
        """
        DELETE FROM match_result_evidence mre
        USING match_results mr
        WHERE mre.match_result_id = mr.match_result_id
          AND mr.investor_id = %s
        """,
        (inv_id,),
    )
    cur.execute("DELETE FROM match_results WHERE investor_id = %s", (inv_id,))
    for table in tables[2:]:
        cur.execute(f"DELETE FROM {table} WHERE investor_id = %s", (inv_id,))


def insert_ingestion_file(cur: Any, record_path: Path, record: dict[str, Any]) -> str:
    raw_bytes = record_path.read_bytes()
    sha = hashlib.sha256(raw_bytes).hexdigest()
    inv_id = investor_id(record)
    cur.execute(
        """
        INSERT INTO ingestion_files (
          investor_id, source_path, source_sha256, raw_record
        )
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (investor_id, source_sha256)
        DO UPDATE SET imported_at = now(), raw_record = EXCLUDED.raw_record
        RETURNING ingestion_file_id
        """,
        (inv_id, str(record_path), sha, Jsonb(record)),
    )
    return str(cur.fetchone()[0])


def insert_investor(cur: Any, record: dict[str, Any]) -> None:
    inv = record.get("investor", {})
    cur.execute(
        """
        INSERT INTO investors (
          investor_id, investor_name, aliases, fund_type, founded_year,
          hq_location, offices, geography_focus, themes_claimed,
          sectors_actual, stages_actual, leads_rounds, archetype, note_profile,
          anz_mandate, confidence_overall, confidence_reviewed, review_status,
          record_last_updated
        )
        VALUES (
          %(investor_id)s, %(investor_name)s, %(aliases)s, %(fund_type)s,
          %(founded_year)s, %(hq_location)s, %(offices)s, %(geography_focus)s,
          %(themes_claimed)s, %(sectors_actual)s, %(stages_actual)s,
          %(leads_rounds)s, %(archetype)s, %(note_profile)s, %(anz_mandate)s,
          %(confidence_overall)s, %(confidence_reviewed)s, %(review_status)s,
          %(record_last_updated)s
        )
        ON CONFLICT (investor_id) DO UPDATE SET
          investor_name = EXCLUDED.investor_name,
          aliases = EXCLUDED.aliases,
          fund_type = EXCLUDED.fund_type,
          founded_year = EXCLUDED.founded_year,
          hq_location = EXCLUDED.hq_location,
          offices = EXCLUDED.offices,
          geography_focus = EXCLUDED.geography_focus,
          themes_claimed = EXCLUDED.themes_claimed,
          sectors_actual = EXCLUDED.sectors_actual,
          stages_actual = EXCLUDED.stages_actual,
          leads_rounds = EXCLUDED.leads_rounds,
          archetype = EXCLUDED.archetype,
          note_profile = EXCLUDED.note_profile,
          anz_mandate = EXCLUDED.anz_mandate,
          confidence_overall = EXCLUDED.confidence_overall,
          confidence_reviewed = EXCLUDED.confidence_reviewed,
          review_status = EXCLUDED.review_status,
          record_last_updated = EXCLUDED.record_last_updated
        """,
        {
            "investor_id": inv.get("investor_id"),
            "investor_name": inv.get("investor_name"),
            "aliases": inv.get("aliases", []),
            "fund_type": inv.get("fund_type", "VC"),
            "founded_year": inv.get("founded"),
            "hq_location": inv.get("hq_location"),
            "offices": inv.get("offices", []),
            "geography_focus": inv.get("geography_focus", []),
            "themes_claimed": inv.get("themes_claimed", []),
            "sectors_actual": inv.get("sectors_actual", []),
            "stages_actual": inv.get("stages_actual", []),
            "leads_rounds": inv.get("leads_rounds"),
            "archetype": Jsonb(inv.get("archetype", {})),
            "note_profile": Jsonb(inv.get("note_profile", {})),
            "anz_mandate": Jsonb(inv.get("anz_mandate", {})),
            "confidence_overall": confidence(inv.get("confidence_overall")),
            "confidence_reviewed": bool(inv.get("confidence_reviewed", False)),
            "review_status": enum_value(inv.get("review_status"), REVIEW_STATUSES, "draft"),
            "record_last_updated": inv.get("last_updated"),
        },
    )


def insert_investor_fields(cur: Any, record: dict[str, Any]) -> None:
    inv_id = investor_id(record)
    for item in record.get("investor_fields", []) or []:
        key = item.get("field")
        if not key:
            continue
        value = item.get("value")
        hard_filter_safe = bool(value.get("hard_filter_safe")) if isinstance(value, dict) else False
        cur.execute(
            """
            INSERT INTO investor_fields (
              investor_id, field_key, value, confidence, note, review_needed,
              hard_filter_safe, raw_field
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                inv_id,
                key,
                Jsonb(value),
                confidence(item.get("confidence")),
                item.get("note"),
                confidence(item.get("confidence")) in {"medium", "low", "gap", "unknown"},
                hard_filter_safe,
                Jsonb(item),
            ),
        )


def insert_matching_profile(cur: Any, record: dict[str, Any], ingestion_file_id: str) -> None:
    profile = build_matching_profile(record)
    cheque = profile.get("cheque_size", {})
    min_cheque = cheque.get("min") or {}
    max_cheque = cheque.get("max") or {}
    recent = profile.get("recent_activity", {})
    cur.execute(
        """
        INSERT INTO investor_matching_profiles (
          investor_id, local_au_anz_fund, au_anz_relevance,
          au_anz_relevance_confidence, supported_stages, first_cheque_stages,
          supported_sectors, supported_business_models,
          business_model_distribution, cheque_min_value, cheque_min_currency,
          cheque_min_unit, cheque_max_value, cheque_max_currency, cheque_max_unit,
          cheque_confidence, cheque_hard_filter_safe, lead_behavior,
          recent_activity_level, recent_activity_confidence, contact_path,
          warm_intro_required, evidence_completeness, review_needed_fields,
          field_confidences, derived_from_ingestion_file_id
        )
        VALUES (
          %(investor_id)s, %(local_au_anz_fund)s, %(au_anz_relevance)s,
          %(au_anz_relevance_confidence)s, %(supported_stages)s,
          %(first_cheque_stages)s, %(supported_sectors)s,
          %(supported_business_models)s, %(business_model_distribution)s,
          %(cheque_min_value)s, %(cheque_min_currency)s, %(cheque_min_unit)s,
          %(cheque_max_value)s, %(cheque_max_currency)s, %(cheque_max_unit)s,
          %(cheque_confidence)s, %(cheque_hard_filter_safe)s, %(lead_behavior)s,
          %(recent_activity_level)s, %(recent_activity_confidence)s,
          %(contact_path)s, %(warm_intro_required)s, %(evidence_completeness)s,
          %(review_needed_fields)s, %(field_confidences)s,
          %(derived_from_ingestion_file_id)s
        )
        """,
        {
            "investor_id": profile["investor_id"],
            "local_au_anz_fund": profile.get("local_au_anz_fund"),
            "au_anz_relevance": profile.get("au_anz_relevance"),
            "au_anz_relevance_confidence": profile.get("au_anz_relevance_confidence"),
            "supported_stages": profile.get("supported_stages", []),
            "first_cheque_stages": profile.get("first_cheque_stages", []),
            "supported_sectors": profile.get("supported_sectors", []),
            "supported_business_models": profile.get("supported_business_models", []),
            "business_model_distribution": Jsonb(profile.get("business_model_distribution", {})),
            "cheque_min_value": min_cheque.get("value"),
            "cheque_min_currency": min_cheque.get("currency"),
            "cheque_min_unit": min_cheque.get("unit"),
            "cheque_max_value": max_cheque.get("value"),
            "cheque_max_currency": max_cheque.get("currency"),
            "cheque_max_unit": max_cheque.get("unit"),
            "cheque_confidence": profile.get("cheque_size", {}).get("confidence", "unknown"),
            "cheque_hard_filter_safe": bool(profile.get("cheque_size", {}).get("hard_filter_safe")),
            "lead_behavior": profile.get("lead_behavior"),
            "recent_activity_level": str(recent.get("value", {}).get("in_window_rows_count"))
            if isinstance(recent.get("value"), dict)
            else None,
            "recent_activity_confidence": recent.get("confidence", "unknown"),
            "contact_path": Jsonb(profile.get("contact_path", {})),
            "warm_intro_required": profile.get("warm_intro_required"),
            "evidence_completeness": None,
            "review_needed_fields": profile.get("review_needed_fields", []),
            "field_confidences": Jsonb(profile.get("field_confidences", {})),
            "derived_from_ingestion_file_id": ingestion_file_id,
        },
    )


def insert_deals_and_missing_sources(cur: Any, record: dict[str, Any]) -> None:
    inv_id = investor_id(record)
    for deal in record.get("deals", []) or []:
        round_amount = deal.get("round_amount") or {}
        cheque = deal.get("investor_cheque_amount") or {}
        cur.execute(
            """
            INSERT INTO deals (
              deal_id, investor_id, company, round_stage, round_amount_value,
              round_amount_currency, round_amount_unit, round_amount_confidence,
              investor_cheque_value, investor_cheque_currency,
              investor_cheque_confidence, investor_cheque_note, announced_date,
              announced_date_precision, deal_date, role, is_lead,
              is_new_investment_for_investor, is_follow_on_for_investor,
              is_company_follow_on_round, company_hq_country, primary_market,
              is_australia_company, is_anz_company, is_australia_related_deal,
              company_level_australia_relevance_basis, investor_mandate_fit,
              investor_mandate_fit_basis, hq_or_primary_market_anz,
              company_anz_relevance, anz_connection_basis,
              business_model_orientation, business_model_detail,
              business_model_confidence, business_model_basis,
              verification_status, deal_confidence, in_window, notes, raw_deal
            )
            VALUES (
              %(deal_id)s, %(investor_id)s, %(company)s, %(round_stage)s,
              %(round_amount_value)s, %(round_amount_currency)s,
              %(round_amount_unit)s, %(round_amount_confidence)s,
              %(investor_cheque_value)s, %(investor_cheque_currency)s,
              %(investor_cheque_confidence)s, %(investor_cheque_note)s,
              %(announced_date)s, %(announced_date_precision)s, %(deal_date)s,
              %(role)s, %(is_lead)s, %(is_new_investment_for_investor)s,
              %(is_follow_on_for_investor)s, %(is_company_follow_on_round)s,
              %(company_hq_country)s, %(primary_market)s,
              %(is_australia_company)s, %(is_anz_company)s,
              %(is_australia_related_deal)s,
              %(company_level_australia_relevance_basis)s,
              %(investor_mandate_fit)s, %(investor_mandate_fit_basis)s,
              %(hq_or_primary_market_anz)s, %(company_anz_relevance)s,
              %(anz_connection_basis)s, %(business_model_orientation)s,
              %(business_model_detail)s, %(business_model_confidence)s,
              %(business_model_basis)s, %(verification_status)s,
              %(deal_confidence)s, %(in_window)s, %(notes)s, %(raw_deal)s
            )
            """,
            {
                "deal_id": deal.get("deal_id"),
                "investor_id": inv_id,
                "company": deal.get("company"),
                "round_stage": deal.get("round_stage"),
                "round_amount_value": round_amount.get("value"),
                "round_amount_currency": round_amount.get("currency"),
                "round_amount_unit": round_amount.get("unit"),
                "round_amount_confidence": confidence(round_amount.get("confidence")),
                "investor_cheque_value": cheque.get("value"),
                "investor_cheque_currency": cheque.get("currency"),
                "investor_cheque_confidence": confidence(cheque.get("confidence")),
                "investor_cheque_note": cheque.get("note"),
                "announced_date": deal.get("announced_date"),
                "announced_date_precision": enum_value(
                    deal.get("announced_date_precision"), DATE_PRECISIONS, "unknown"
                ),
                "deal_date": deal.get("deal_date"),
                "role": deal.get("role"),
                "is_lead": deal.get("is_lead"),
                "is_new_investment_for_investor": deal.get("is_new_investment_for_investor"),
                "is_follow_on_for_investor": deal.get("is_follow_on_for_investor"),
                "is_company_follow_on_round": deal.get("is_company_follow_on_round"),
                "company_hq_country": deal.get("company_hq_country"),
                "primary_market": deal.get("primary_market"),
                "is_australia_company": deal.get("is_australia_company"),
                "is_anz_company": deal.get("is_anz_company"),
                "is_australia_related_deal": deal.get("is_australia_related_deal"),
                "company_level_australia_relevance_basis": deal.get(
                    "company_level_australia_relevance_basis"
                ),
                "investor_mandate_fit": deal.get("investor_mandate_fit"),
                "investor_mandate_fit_basis": deal.get("investor_mandate_fit_basis"),
                "hq_or_primary_market_anz": deal.get("hq_or_primary_market_anz"),
                "company_anz_relevance": deal.get("company_anz_relevance"),
                "anz_connection_basis": deal.get("anz_connection_basis"),
                "business_model_orientation": business_model(deal.get("business_model_orientation")),
                "business_model_detail": deal.get("business_model_detail"),
                "business_model_confidence": confidence(deal.get("business_model_confidence")),
                "business_model_basis": deal.get("business_model_basis"),
                "verification_status": enum_value(
                    deal.get("verification_status"), DEAL_STATUSES, "unknown"
                ),
                "deal_confidence": confidence(deal.get("deal_confidence")),
                "in_window": bool(deal.get("in_window", False)),
                "notes": deal.get("notes"),
                "raw_deal": Jsonb(deal),
            },
        )
        for missing in deal.get("missing_sources", []) or []:
            cur.execute(
                """
                INSERT INTO missing_sources (
                  investor_id, entity_type, entity_id, source_role,
                  required_source_type, reason, status
                )
                VALUES (%s, 'deal', %s, %s, %s, %s, 'open')
                """,
                (
                    inv_id,
                    deal.get("deal_id"),
                    enum_value(missing.get("source_role"), SOURCE_ROLES, "verification"),
                    enum_value(missing.get("required_source_type"), SOURCE_TYPES, "other"),
                    missing.get("reason", "Missing source"),
                ),
            )


def insert_sources(cur: Any, record: dict[str, Any]) -> None:
    for source in build_sources(record):
        cur.execute(
            """
            INSERT INTO sources (
              investor_id, entity_type, entity_id, url, source_type, source_role,
              publisher, source_strength, raw_source
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            (
                source.get("investor_id"),
                source.get("entity_type"),
                source.get("entity_id"),
                source.get("url"),
                enum_value(source.get("source_type"), SOURCE_TYPES, "other"),
                enum_value(source.get("source_role"), SOURCE_ROLES, "other"),
                source.get("publisher"),
                enum_value(source.get("source_strength"), SOURCE_STRENGTHS, "unknown"),
                Jsonb(source),
            ),
        )


def insert_people_and_edges(cur: Any, record: dict[str, Any]) -> None:
    inv_id = investor_id(record)
    for partner in record.get("partners", []) or []:
        linkedin = partner.get("linkedin") or {}
        cur.execute(
            """
            INSERT INTO partners (
              partner_id, investor_id, name, role, location, official_profile_url,
              linkedin_url, linkedin_status, linkedin_confidence, is_anz,
              is_active, raw_partner
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                partner.get("partner_id"),
                inv_id,
                partner.get("name"),
                partner.get("role"),
                partner.get("location"),
                partner.get("official_profile"),
                linkedin.get("url"),
                linkedin.get("status"),
                confidence(linkedin.get("confidence")),
                partner.get("is_anz"),
                partner.get("is_active"),
                Jsonb(partner),
            ),
        )

    for route in record.get("partner_routing_hypotheses", []) or []:
        cur.execute(
            """
            INSERT INTO partner_routing_hypotheses (
              investor_id, sector_or_use_case, suggested_partner_names,
              suggested_partner_ids, evidence_basis, confidence,
              reviewer_needed, raw_routing
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                inv_id,
                route.get("sector") or route.get("sector_or_use_case"),
                route.get("who", []) or route.get("suggested_partner_names", []),
                route.get("suggested_partner_ids", []),
                route.get("evidence_basis"),
                confidence(route.get("confidence")),
                bool(route.get("reviewer_needed", True)),
                Jsonb(route),
            ),
        )

    for edge in record.get("co_investment_edges", []) or []:
        cur.execute(
            """
            INSERT INTO co_investment_edges (
              investor_id, co_investor, related_company, related_deal_id,
              evidence_url, source_type, confidence, use_case, raw_edge
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                inv_id,
                edge.get("co_investor"),
                edge.get("related_company"),
                edge.get("related_deal_id"),
                edge.get("evidence_url"),
                enum_value(edge.get("source_type"), SOURCE_TYPES, "other"),
                confidence(edge.get("confidence")),
                edge.get("use", "context_only"),
                Jsonb(edge),
            ),
        )


def insert_review_and_validation(cur: Any, record: dict[str, Any]) -> None:
    inv_id = investor_id(record)
    for task in record.get("review_tasks", []) or []:
        cur.execute(
            """
            INSERT INTO review_tasks (
              investor_id, entity_type, entity_id, field_key, priority,
              reason, suggested_action, status, raw_task
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                inv_id,
                task.get("entity_type"),
                task.get("entity_id"),
                task.get("field"),
                task.get("priority", "medium"),
                task.get("reason"),
                task.get("suggested_action"),
                enum_value(task.get("status"), REVIEW_STATUSES, "open"),
                Jsonb(task),
            ),
        )

    for log in record.get("validation_search_log", []) or []:
        cur.execute(
            """
            INSERT INTO validation_search_logs (
              investor_id, entity_id, search_status, queries_used, result, raw_log
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                inv_id,
                log.get("entity_id"),
                log.get("search_status"),
                log.get("queries_used", []),
                log.get("result"),
                Jsonb(log),
            ),
        )


def insert_rag_chunks(cur: Any, record: dict[str, Any]) -> None:
    for item in build_rag_chunks(record):
        cur.execute(
            """
            INSERT INTO rag_chunks (
              investor_id, entity_type, entity_id, section_key, chunk_text,
              fact_kind, region_scope, confidence, review_needed, rag_allowed,
              metadata
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                item["investor_id"],
                item["entity_type"],
                item["entity_id"],
                item["section_key"],
                item["chunk_text"],
                enum_value(item.get("fact_kind"), {"fact", "claim", "inference", "mixed"}, "mixed"),
                item.get("metadata", {}).get("region_scope"),
                confidence(item.get("confidence")),
                bool(item.get("review_needed")),
                bool(item.get("rag_allowed", True)),
                Jsonb({**item.get("metadata", {}), "source_urls": item.get("source_urls", [])}),
            ),
        )


def load_record(database_url: str, record_path: Path, schema_path: Path | None = None) -> dict[str, Any]:
    record = load_json(record_path)
    inv_id = investor_id(record)

    if schema_path:
        apply_schema(database_url, schema_path)

    with connect(database_url) as conn:
        with conn.cursor() as cur:
            ingestion_file_id = insert_ingestion_file(cur, record_path, record)
            insert_investor(cur, record)
            delete_existing_child_rows(cur, inv_id)
            insert_investor_fields(cur, record)
            insert_matching_profile(cur, record, ingestion_file_id)
            insert_deals_and_missing_sources(cur, record)
            insert_sources(cur, record)
            insert_people_and_edges(cur, record)
            insert_review_and_validation(cur, record)
            insert_rag_chunks(cur, record)
        conn.commit()

    return {
        "investor_id": inv_id,
        "loaded": True,
        "schema_applied": bool(schema_path),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Load a VC record into PostgreSQL")
    parser.add_argument("--record", required=True, type=Path, help="Path to <investor_id>-record.json")
    parser.add_argument("--database-url", default=None, help="PostgreSQL DATABASE_URL")
    parser.add_argument("--schema", type=Path, default=None, help="Optional schema SQL path to apply first")
    args = parser.parse_args()

    database_url = env_database_url(args.database_url)
    result = load_record(database_url, args.record, args.schema)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
