"""Import canonical investor JSON records into the local Postgres database."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from psycopg import Connection, connect
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from app.tools.unified_db import database_url

ARRAY_FIELDS = {
    "stage_focus",
    "sector_focus",
    "geography_focus",
    "business_model_focus",
    "founder_fit",
    "entry_channels",
}

INVESTOR_COLUMNS = [
    "name",
    "slug",
    "investor_type",
    "website_url",
    "linkedin_url",
    "founded_year",
    "hq_country",
    "hq_state",
    "hq_city",
    "stage_focus",
    "sector_focus",
    "geography_focus",
    "business_model_focus",
    "founder_fit",
    "cheque_ranges",
    "lead_behavior",
    "ai_appetite",
    "recent_deals",
    "entry_channels",
    "preferred_channel",
    "screening_status",
    "screening_priority",
    "screening_notes",
]


def load_record(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def as_text_array(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    return [str(value)]


def normalize_number(value: Any) -> int | float | None:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return value
    try:
        number = float(str(value).replace(",", ""))
    except ValueError:
        return None
    return int(number) if number.is_integer() else number


def is_round_size_basis(value: Any) -> bool:
    text = str(value or "").lower()
    return "round_size" in text or "not_cheque" in text


def normalize_canonical_cheque_range(item: dict[str, Any]) -> dict[str, Any]:
    normalized = {
        "stage": item.get("stage"),
        "amount_min": normalize_number(item.get("amount_min")),
        "amount_max": normalize_number(item.get("amount_max")),
        "currency": str(item.get("currency") or "AUD").upper(),
    }
    for optional_key in ("basis", "hard_filter_safe"):
        if optional_key in item:
            normalized[optional_key] = item[optional_key]
    return normalized


def normalize_expanded_cheque_range(item: dict[str, Any]) -> list[dict[str, Any]]:
    stage = item.get("stage")
    basis = item.get("basis")
    ranges_by_currency: dict[str, dict[str, Any]] = {}

    for side in ("min", "max"):
        value = normalize_number(item.get(f"amount_{side}_value"))
        currency = item.get(f"amount_{side}_currency") or "AUD"
        if value is None:
            continue
        currency_key = str(currency).upper()
        normalized = ranges_by_currency.setdefault(
            currency_key,
            {
                "stage": stage,
                "amount_min": None,
                "amount_max": None,
                "currency": currency_key,
            },
        )
        normalized[f"amount_{side}"] = value

    normalized_ranges = list(ranges_by_currency.values())
    for normalized in normalized_ranges:
        if basis:
            normalized["basis"] = basis
        if is_round_size_basis(basis):
            normalized["hard_filter_safe"] = False
    return normalized_ranges


def normalize_cheque_ranges(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []

    normalized: list[dict[str, Any]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        if "amount_min" in item or "amount_max" in item or "currency" in item:
            normalized.append(normalize_canonical_cheque_range(item))
            continue
        normalized.extend(normalize_expanded_cheque_range(item))
    return normalized


def normalize_record(
    record: dict[str, Any],
    *,
    slug_overrides: dict[str, str],
) -> dict[str, Any]:
    normalized = {column: record.get(column) for column in INVESTOR_COLUMNS}
    source_slug = str(normalized.get("slug") or "").strip()
    normalized["slug"] = slug_overrides.get(source_slug, source_slug)
    normalized["cheque_ranges"] = normalize_cheque_ranges(record.get("cheque_ranges"))
    normalized["recent_deals"] = record.get("recent_deals") or []

    for field in ARRAY_FIELDS:
        normalized[field] = as_text_array(normalized.get(field))

    return normalized


def compact_entity_id(value: Any) -> str:
    text = str(value or "entity").strip().lower()
    cleaned = "".join(char if char.isalnum() else "-" for char in text)
    return "-".join(part for part in cleaned.split("-") if part) or "entity"


def chunk_source_urls(deal: dict[str, Any]) -> list[str]:
    url = deal.get("investor_evidence_url")
    return [str(url)] if url else []


def profile_chunk_text(record: dict[str, Any]) -> str:
    return (
        f"{record.get('name')} investor profile. "
        f"Stage focus: {', '.join(record.get('stage_focus') or [])}. "
        f"Sector focus: {', '.join(record.get('sector_focus') or [])}. "
        f"Geography focus: {', '.join(record.get('geography_focus') or [])}. "
        f"Business model focus: {', '.join(record.get('business_model_focus') or [])}. "
        "Cheque ranges: "
        f"{json.dumps(record.get('cheque_ranges') or [], ensure_ascii=False)}. "
        f"Lead behavior: {record.get('lead_behavior')}. "
        f"AI appetite: {record.get('ai_appetite')}. "
        f"Notes: {record.get('screening_notes') or ''}"
    )


def deal_chunk_text(record: dict[str, Any], deal: dict[str, Any]) -> str:
    amount = deal.get("amount_text") or deal.get("amount") or "unknown"
    geography = deal.get("company_geography") or deal.get("region") or "unknown"
    return (
        f"{record.get('name')} recent deal evidence. "
        f"Company: {deal.get('company') or 'unknown'}. "
        f"Round: {deal.get('round') or 'unknown'}. "
        f"Amount: {amount}. "
        f"Geography: {geography}. "
        f"Direction: {deal.get('direction') or 'unknown'}. "
        f"Business model: {deal.get('business_model') or 'unknown'}. "
        f"Role: {deal.get('role') or 'unknown'}. "
        f"Date: {deal.get('date') or 'unknown'}."
    )


def rag_chunks_for_record(
    *,
    investor_id: str,
    record: dict[str, Any],
) -> list[dict[str, Any]]:
    slug = str(record["slug"])
    chunks = [
        {
            "investor_id": investor_id,
            "investor_slug": slug,
            "entity_type": "investor",
            "entity_id": f"fund:{slug}",
            "section_key": "matching_profile",
            "chunk_text": profile_chunk_text(record),
            "source_urls": [],
            "metadata": {
                "source": "investor_importer.profile",
                "stage_focus": record.get("stage_focus") or [],
                "sector_focus": record.get("sector_focus") or [],
                "geography_focus": record.get("geography_focus") or [],
                "business_model_focus": record.get("business_model_focus") or [],
            },
            "confidence": "medium",
            "review_needed": False,
            "rag_allowed": True,
        }
    ]

    for index, deal in enumerate(record.get("recent_deals") or [], start=1):
        if not isinstance(deal, dict):
            continue
        chunks.append(
            {
                "investor_id": investor_id,
                "investor_slug": slug,
                "entity_type": "deal",
                "entity_id": (
                    f"{slug}:{index}:{compact_entity_id(deal.get('company'))}"
                ),
                "section_key": "recent_deal",
                "chunk_text": deal_chunk_text(record, deal),
                "source_urls": chunk_source_urls(deal),
                "metadata": {
                    "source": "investor_importer.recent_deals",
                    "company": deal.get("company"),
                    "round": deal.get("round"),
                    "amount_text": deal.get("amount_text") or deal.get("amount"),
                    "company_geography": deal.get("company_geography")
                    or deal.get("region"),
                    "business_model": deal.get("business_model"),
                    "role": deal.get("role"),
                    "date": deal.get("date"),
                },
                "confidence": "medium",
                "review_needed": False,
                "rag_allowed": True,
            }
        )

    return chunks


def parse_slug_overrides(values: list[str]) -> dict[str, str]:
    overrides: dict[str, str] = {}
    for value in values:
        if "=" not in value:
            raise ValueError("--slug-override must use source_slug=database_slug")
        source_slug, database_slug = value.split("=", 1)
        overrides[source_slug.strip()] = database_slug.strip()
    return overrides


def find_existing_id(connection: Connection, slug: str) -> str | None:
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute("SELECT id::text FROM investors WHERE slug = %s", (slug,))
        row = cursor.fetchone()
    return str(row["id"]) if row else None


def upsert_investor(connection: Connection, record: dict[str, Any]) -> dict[str, Any]:
    existing_id = find_existing_id(connection, str(record["slug"]))
    params = {
        **record,
        "id": existing_id,
        "cheque_ranges": Jsonb(record["cheque_ranges"]),
        "recent_deals": Jsonb(record["recent_deals"]),
    }
    assignments = ",\n  ".join(
        f"{column} = EXCLUDED.{column}" for column in INVESTOR_COLUMNS
    )
    columns_sql = ", ".join(["id", *INVESTOR_COLUMNS])
    placeholders_sql = ", ".join(
        ["COALESCE(%(id)s::uuid, gen_random_uuid())"]
        + [f"%({column})s" for column in INVESTOR_COLUMNS]
    )

    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            f"""
            INSERT INTO investors ({columns_sql})
            VALUES ({placeholders_sql})
            ON CONFLICT (id) DO UPDATE SET
              {assignments},
              updated_at = now()
            RETURNING id::text, name, slug
            """,
            params,
        )
        row = cursor.fetchone()
    connection.commit()
    return dict(row) if row else {}


def replace_rag_chunks(
    connection: Connection,
    *,
    investor_id: str,
    record: dict[str, Any],
) -> None:
    chunks = rag_chunks_for_record(investor_id=investor_id, record=record)
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM rag_chunks WHERE investor_id = %s", (investor_id,))
        for chunk in chunks:
            cursor.execute(
                """
                INSERT INTO rag_chunks (
                  investor_id,
                  investor_slug,
                  entity_type,
                  entity_id,
                  section_key,
                  chunk_text,
                  source_urls,
                  metadata,
                  confidence,
                  review_needed,
                  rag_allowed
                )
                VALUES (
                  %(investor_id)s,
                  %(investor_slug)s,
                  %(entity_type)s,
                  %(entity_id)s,
                  %(section_key)s,
                  %(chunk_text)s,
                  %(source_urls)s,
                  %(metadata)s,
                  %(confidence)s,
                  %(review_needed)s,
                  %(rag_allowed)s
                )
                """,
                {**chunk, "metadata": Jsonb(chunk["metadata"])},
            )
    connection.commit()


def import_records(
    *,
    paths: list[Path],
    database_url_value: str,
    slug_overrides: dict[str, str],
) -> list[dict[str, Any]]:
    imported = []
    with connect(database_url_value) as connection:
        for path in paths:
            record = normalize_record(load_record(path), slug_overrides=slug_overrides)
            imported_record = upsert_investor(connection, record)
            if imported_record:
                replace_rag_chunks(
                    connection,
                    investor_id=str(imported_record["id"]),
                    record=record,
                )
            imported.append(imported_record)
    return imported


def main() -> None:
    parser = argparse.ArgumentParser(description="Import investor JSON records.")
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument(
        "--database-url",
        default=None,
        help="PostgreSQL URL. Defaults to DATABASE_URL or the local Docker database.",
    )
    parser.add_argument(
        "--slug-override",
        action="append",
        default=[],
        help="Map source slug to database slug, e.g. airtree-ventures=airtree.",
    )
    args = parser.parse_args()

    imported = import_records(
        paths=args.paths,
        database_url_value=database_url(args.database_url),
        slug_overrides=parse_slug_overrides(args.slug_override),
    )
    print(json.dumps({"imported": imported}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
