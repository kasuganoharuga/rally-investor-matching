"""Incrementally import audited recent-deal packages into the local formal DB.

The July 2026 delta packages contain new master records plus references to
investors already present in the database.  This importer therefore resolves
stable record keys, upserts on formal-schema natural keys, cleans text before
writing, and rebuilds the derived investor preference tables from the complete
local evidence set.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import unicodedata
from collections import Counter, defaultdict
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID

import import_formal_sample as formal
from psycopg import Connection, connect
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

DEFAULT_DATABASE_URL = (
    "postgresql://rally:rally_dev_password@localhost:5432/rally_investor_matching"
)
DEFAULT_SUMMARY_FILE = Path("data/generated/recent_deal_delta_import_summary.json")
DEFAULT_RETAINED_INVESTORS_FILE = Path("data/generated/retained_investors_cleaned.json")
PIPELINE_VERSION = "formal-incremental-2026-07-31-v1"

SUPPORTED_TABLES = {
    "investors",
    "investor_external_ids",
    "investor_web_profiles",
    "investor_programs",
    "investor_team_members",
    "investee_company_profiles",
    "investee_external_ids",
    "funding_rounds",
    "deal_investors",
}

MOJIBAKE_MARKERS = (
    "Ã",
    "Â",
    "â€",
    "â€™",
    "â€œ",
    "â€",
    "â€“",
    "â€”",
    "ï»¿",
    "ðŸ",
    "�",
    "闁",
    "閳",
    "鑺",
    "锟",
    "鐠",
    "闂",
)

COMMON_REPLACEMENTS = {
    "â€™": "’",
    "â€˜": "‘",
    "â€œ": "“",
    "â€": "”",
    "â€“": "–",
    "â€”": "—",
    "â€¦": "…",
    "Â ": " ",
    "ï»¿": "",
}


@dataclass
class ImportBundle:
    packages: list[dict[str, Any]] = field(default_factory=list)
    records: dict[str, dict[str, dict[str, Any]]] = field(
        default_factory=lambda: defaultdict(dict)
    )
    dependency_investor_keys: set[str] = field(default_factory=set)
    investor_alias_map: dict[str, str] = field(default_factory=dict)
    cleaning: Counter[str] = field(default_factory=Counter)
    duplicate_record_keys_replaced: Counter[str] = field(default_factory=Counter)
    unsupported_records: Counter[str] = field(default_factory=Counter)
    suspicious_samples: list[dict[str, str]] = field(default_factory=list)


@dataclass
class IdentityMaps:
    investor_keys: dict[str, set[str]] = field(default_factory=dict)
    investor_names: dict[str, set[str]] = field(default_factory=dict)
    investor_websites: dict[str, set[str]] = field(default_factory=dict)
    investor_linkedins: dict[str, set[str]] = field(default_factory=dict)
    company_keys: dict[str, str] = field(default_factory=dict)
    company_crunchbase_ids: dict[str, str] = field(default_factory=dict)
    company_name_sites: dict[tuple[str, str], str] = field(default_factory=dict)


def normalized_url(value: Any) -> str | None:
    if value in (None, ""):
        return None
    return str(value).strip().rstrip("/").lower() or None


def key_slug(record_key: str) -> str:
    return record_key.split(":", 1)[-1].strip().lower()


def add_candidate(mapping: dict[str, set[str]], key: str | None, value: str) -> None:
    if key:
        mapping.setdefault(key, set()).add(value)


def mojibake_score(value: str) -> int:
    score = sum(value.count(marker) for marker in MOJIBAKE_MARKERS)
    score += sum(
        2
        for character in value
        if unicodedata.category(character) == "Cc"
        and character not in {"\n", "\r", "\t"}
    )
    return score


def clean_text(value: str, bundle: ImportBundle, location: str) -> str:
    cleaned = unicodedata.normalize("NFC", value)
    if cleaned != value:
        bundle.cleaning["unicode_normalized"] += 1

    without_controls = "".join(
        character
        for character in cleaned
        if not (
            unicodedata.category(character) == "Cf"
            or (
                unicodedata.category(character) == "Cc"
                and character not in {"\n", "\r", "\t"}
            )
        )
    )
    if without_controls != cleaned:
        bundle.cleaning["format_or_control_characters_removed"] += 1
    cleaned = without_controls

    for broken, repaired in COMMON_REPLACEMENTS.items():
        if broken in cleaned:
            cleaned = cleaned.replace(broken, repaired)
            bundle.cleaning["known_mojibake_replacements"] += 1

    if mojibake_score(cleaned):
        best = cleaned
        best_score = mojibake_score(cleaned)
        for encoding in ("cp1252", "latin-1"):
            try:
                candidate = cleaned.encode(encoding).decode("utf-8")
            except (UnicodeEncodeError, UnicodeDecodeError):
                continue
            candidate_score = mojibake_score(candidate)
            if candidate_score < best_score:
                best = candidate
                best_score = candidate_score
        if best != cleaned:
            bundle.cleaning["encoding_round_trip_repairs"] += 1
            cleaned = best

    if mojibake_score(cleaned) and len(bundle.suspicious_samples) < 30:
        bundle.suspicious_samples.append({"location": location, "value": cleaned[:300]})
    return cleaned


def clean_value(value: Any, bundle: ImportBundle, location: str) -> Any:
    if isinstance(value, str):
        return clean_text(value, bundle, location)
    if isinstance(value, list):
        return [
            clean_value(item, bundle, f"{location}[{index}]")
            for index, item in enumerate(value)
        ]
    if isinstance(value, dict):
        return {
            key: clean_value(item, bundle, f"{location}.{key}")
            for key, item in value.items()
        }
    return value


def package_directories(input_root: Path) -> list[Path]:
    if (input_root / "manifest.json").is_file():
        return [input_root]
    return sorted(
        path
        for path in input_root.iterdir()
        if path.is_dir() and (path / "manifest.json").is_file()
    )


def load_bundle(input_root: Path) -> ImportBundle:
    bundle = ImportBundle()
    directories = package_directories(input_root)
    if not directories:
        raise ValueError(f"No package manifests found under {input_root}")

    for package_dir in directories:
        manifest = json.loads(
            (package_dir / "manifest.json").read_text(encoding="utf-8-sig")
        )
        validation = json.loads(
            (package_dir / "validation.json").read_text(encoding="utf-8-sig")
        )
        scope = json.loads((package_dir / "scope.json").read_text(encoding="utf-8-sig"))
        resolution_path = package_dir / "investor_resolution.json"
        if resolution_path.is_file():
            resolution = json.loads(resolution_path.read_text(encoding="utf-8-sig"))
            for field_name in ("historical_alias_map", "within_batch_alias_map"):
                aliases = resolution.get(field_name)
                if isinstance(aliases, dict):
                    bundle.investor_alias_map.update(
                        {str(key): str(value) for key, value in aliases.items()}
                    )
        if validation.get("status") != "passed":
            raise ValueError(f"Package validation did not pass: {package_dir.name}")
        bundle.packages.append(
            {
                "path": package_dir.name,
                "batch_id": manifest.get("batch_id"),
                "pipeline_version": manifest.get("pipeline_version"),
                "validation_status": validation.get("status"),
                "source_rows": scope.get("source_rows"),
            }
        )
        bundle.dependency_investor_keys.update(
            str(key) for key in scope.get("existing_database_investor_keys", [])
        )

        for folder in manifest.get("import_order", []):
            payload_dir = package_dir / folder
            if not payload_dir.is_dir():
                continue
            for path in sorted(payload_dir.glob("*.json")):
                payload = json.loads(path.read_text(encoding="utf-8-sig"))
                payload = clean_value(payload, bundle, str(path))
                table = str(payload.get("table") or folder)
                record_key = str(payload.get("record_key") or "")
                operation = payload.get("operation")
                if not record_key:
                    raise ValueError(f"Missing record_key: {path}")
                if operation != "upsert":
                    raise ValueError(f"Unsupported operation {operation!r}: {path}")
                if table not in SUPPORTED_TABLES:
                    bundle.unsupported_records[table] += 1
                    continue
                if record_key in bundle.records[table]:
                    bundle.duplicate_record_keys_replaced[table] += 1
                payload["_source_path"] = str(path)
                bundle.records[table][record_key] = payload

    if bundle.suspicious_samples:
        sample = json.dumps(bundle.suspicious_samples[:5], ensure_ascii=False)
        raise ValueError(f"Unresolved suspicious text remains: {sample}")
    return bundle


def load_retained_investors(
    path: Path, bundle: ImportBundle
) -> dict[str, dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8-sig"))
    cleaned = clean_value(payload, bundle, str(path))
    records = cleaned.get("records") if isinstance(cleaned, dict) else None
    if not isinstance(records, list):
        raise TypeError(f"Invalid retained investor export: {path}")
    by_key: dict[str, dict[str, Any]] = {}
    for row in records:
        if not isinstance(row, dict):
            continue
        name = str(row.get("Investor Name") or "").strip()
        if not name:
            continue
        key = f"investor:{formal.slugify(name)}"
        if key in by_key:
            raise ValueError(f"Duplicate retained investor slug: {key}")
        by_key[key] = row
    return by_key


def workbook_investor_type(value: Any) -> str:
    mapping = {
        "vc fund": "vc_fund",
        "angel investor": "angel",
        "angel group": "angel_group",
        "family office": "family_office",
        "corporate vc": "corporate_vc",
        "strategic corporate": "corporate_vc",
        "accelerator": "accelerator",
        "government fund": "government_fund",
        "university fund": "government_fund",
    }
    return mapping.get(str(value or "").strip().lower(), "other")


def normalize_website_status(value: Any) -> str:
    text = str(value or "").strip().lower()
    if text == "not_verified":
        return "unavailable"
    if text in {
        "ok",
        "unavailable",
        "redirected",
        "minimal_content",
        "blocked",
        "failed",
    }:
        return text
    return "failed"


def supplemental_envelopes(
    record_key: str,
    row: dict[str, Any],
    source_path: Path,
) -> tuple[dict[str, Any], dict[str, Any]]:
    name = str(row.get("Investor Name") or "").strip()
    website = row.get("Website") or None
    linkedin = row.get("LinkedIn") or None
    master = {
        "schema_version": "1.0.0",
        "table": "investors",
        "record_key": record_key,
        "operation": "upsert",
        "data": {
            "canonical_name": name,
            "aliases": [],
            "investor_type": workbook_investor_type(row.get("Investor Type")),
            "website_url": website,
            "linkedin_url": linkedin,
            "hq_country": row.get("HQ Country") or None,
            "hq_state": None,
            "hq_city": None,
            "offices": [],
            "status": "active",
            "review_status": "approved",
            "last_reviewed_at": None,
        },
        "refs": {},
        "provenance": {
            "source": "retained_investors_explorer.xlsx",
            "priority_tier": row.get("Priority Tier"),
            "eligible_deal_count": row.get("Eligible Deal Count"),
            "lead_deal_count": row.get("Lead Deal Count"),
        },
        "review": {"status": "approved", "issues": []},
        "_source_path": str(source_path),
    }
    source_urls = [value for value in (website, linkedin) if value]
    claimed_stages = [
        value.strip()
        for value in str(row.get("Observed Stages") or "").split(";")
        if value.strip()
    ]
    web_profile = {
        "schema_version": "1.0.0",
        "table": "investor_web_profiles",
        "record_key": f"investor_web_profile:retained:{key_slug(record_key)}",
        "operation": "upsert",
        "data": {
            "source_urls": source_urls,
            "retrieved_at": "2026-07-30T00:00:00+10:00",
            "website_status": "ok" if website else "minimal_content",
            "raw_content_hash": None,
            "raw_content_ref": None,
            "extraction_model": "retained-investors-workbook",
            "extraction_version": "2026-07-30",
            "confidence": "medium",
            "claimed_thesis": row.get("Investment Thesis") or None,
            "claimed_stages": claimed_stages,
            "claimed_sectors": [],
            "claimed_geographies": [row["HQ Country"]]
            if row.get("HQ Country")
            and str(row["HQ Country"]).strip().lower() != "unknown"
            else [],
            "claimed_business_models": [],
            "claimed_cheque_min": None,
            "claimed_cheque_max": None,
            "claimed_cheque_currency": None,
            "contact_emails": [],
            "application_url": row.get("Application URL") or None,
            "contact_notes": None,
            "is_current": True,
        },
        "refs": {"investor_key": record_key},
        "provenance": {"source": "retained_investors_explorer.xlsx"},
        "review": {"status": "approved", "issues": []},
        "_source_path": str(source_path),
    }
    return master, web_profile


def load_identity_maps(connection: Connection) -> IdentityMaps:
    maps = IdentityMaps()
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            """
            SELECT id::text, canonical_name, aliases, website_url, linkedin_url
            FROM investors
            WHERE deleted_at IS NULL
            """
        )
        investor_rows = cursor.fetchall()
        alias_rows: list[tuple[str, str]] = []
        for row in investor_rows:
            investor_id = row["id"]
            canonical_name = str(row["canonical_name"] or "")
            add_candidate(
                maps.investor_keys,
                f"investor:{formal.slugify(canonical_name)}",
                investor_id,
            )
            add_candidate(
                maps.investor_names, canonical_name.strip().lower(), investor_id
            )
            for alias in row["aliases"] if isinstance(row["aliases"], list) else []:
                alias_rows.append((str(alias), investor_id))
                add_candidate(
                    maps.investor_names, str(alias).strip().lower(), investor_id
                )
            add_candidate(
                maps.investor_websites,
                normalized_url(row["website_url"]),
                investor_id,
            )
            add_candidate(
                maps.investor_linkedins,
                normalized_url(row["linkedin_url"]),
                investor_id,
            )

        # A canonical-name key is stronger evidence than the same text appearing
        # as another record's alias (for example QIC).
        for alias, investor_id in alias_rows:
            alias_key = f"investor:{formal.slugify(alias)}"
            if alias_key not in maps.investor_keys:
                add_candidate(maps.investor_keys, alias_key, investor_id)

        cursor.execute(
            """
            SELECT investor_id::text, source_provider::text, external_id,
                   source_payload
            FROM investor_external_ids
            WHERE deleted_at IS NULL
            """
        )
        for row in cursor.fetchall():
            investor_id = row["investor_id"]
            external_id = str(row["external_id"] or "")
            payload = (
                row["source_payload"] if isinstance(row["source_payload"], dict) else {}
            )
            keys = [external_id, payload.get("investor_key"), payload.get("record_key")]
            if row["source_provider"] == "crunchbase" and external_id:
                keys.append(f"investor:{external_id}")
            for key in keys:
                if isinstance(key, str) and key.startswith("investor:"):
                    add_candidate(maps.investor_keys, key, investor_id)

        cursor.execute(
            """
            SELECT id::text, name, website_url, crunchbase_uuid
            FROM investee_company_profiles
            WHERE deleted_at IS NULL
            """
        )
        for row in cursor.fetchall():
            company_id = row["id"]
            if row["crunchbase_uuid"]:
                maps.company_crunchbase_ids[str(row["crunchbase_uuid"])] = company_id
            maps.company_name_sites[
                (
                    str(row["name"] or "").strip().lower(),
                    normalized_url(row["website_url"]) or "",
                )
            ] = company_id

        cursor.execute(
            """
            SELECT investee_company_id::text, external_id, source_payload
            FROM investee_external_ids
            WHERE deleted_at IS NULL
            """
        )
        for row in cursor.fetchall():
            payload = (
                row["source_payload"] if isinstance(row["source_payload"], dict) else {}
            )
            for key in (
                row["external_id"],
                payload.get("investee_company_key"),
                payload.get("record_key"),
            ):
                if isinstance(key, str) and key.startswith("company:"):
                    maps.company_keys[key] = row["investee_company_id"]
    return maps


def unique_candidate(candidates: Iterable[str], context: str) -> str | None:
    values = {value for value in candidates if value}
    if len(values) > 1:
        raise ValueError(f"Ambiguous identity for {context}: {sorted(values)}")
    return next(iter(values), None)


def candidate_values(mapping: dict[str, set[str]], key: str | None) -> set[str]:
    return mapping.get(key or "", set())


def resolve_investor(
    maps: IdentityMaps,
    record_key: str,
    data: dict[str, Any] | None = None,
) -> str | None:
    data = data or {}
    key_candidates = candidate_values(maps.investor_keys, record_key)
    if key_candidates:
        return unique_candidate(key_candidates, record_key)

    identity_candidates: set[str] = set()
    identity_candidates.update(
        candidate_values(
            maps.investor_websites, normalized_url(data.get("website_url"))
        )
    )
    identity_candidates.update(
        candidate_values(
            maps.investor_linkedins, normalized_url(data.get("linkedin_url"))
        )
    )
    if identity_candidates:
        return unique_candidate(identity_candidates, record_key)

    name_candidates = candidate_values(
        maps.investor_names,
        str(data.get("canonical_name") or "").strip().lower() or None,
    )
    return unique_candidate(name_candidates, record_key)


def register_investor(
    maps: IdentityMaps,
    record_key: str,
    investor_id: str,
    data: dict[str, Any],
) -> None:
    add_candidate(maps.investor_keys, record_key, investor_id)
    add_candidate(
        maps.investor_keys,
        f"investor:{formal.slugify(data.get('canonical_name'))}",
        investor_id,
    )
    add_candidate(
        maps.investor_names,
        str(data.get("canonical_name") or "").strip().lower(),
        investor_id,
    )
    for alias in data.get("aliases") or []:
        add_candidate(
            maps.investor_keys,
            f"investor:{formal.slugify(alias)}",
            investor_id,
        )
        add_candidate(maps.investor_names, str(alias).strip().lower(), investor_id)
    add_candidate(
        maps.investor_websites, normalized_url(data.get("website_url")), investor_id
    )
    add_candidate(
        maps.investor_linkedins, normalized_url(data.get("linkedin_url")), investor_id
    )


def dry_run_plan(
    connection: Connection,
    bundle: ImportBundle,
    retained_investors: dict[str, dict[str, Any]],
    retained_source_path: Path,
) -> dict[str, Any]:
    maps = load_identity_maps(connection)
    existing_master_matches = 0
    planned_new_masters = 0
    for record_key, envelope in sorted(bundle.records["investors"].items()):
        data = envelope["data"]
        investor_id = resolve_investor(maps, record_key, data)
        if investor_id:
            existing_master_matches += 1
        else:
            investor_id = f"planned:{record_key}"
            planned_new_masters += 1
        register_investor(maps, record_key, investor_id, data)

    missing_dependencies = sorted(
        key
        for key in bundle.dependency_investor_keys
        if not candidate_values(maps.investor_keys, key)
    )
    supplemental_count = 0
    missing_from_workbook: list[str] = []
    for record_key in missing_dependencies:
        row = retained_investors.get(record_key)
        if not row:
            source_alias = next(
                (
                    source_key
                    for source_key, resolved_key in bundle.investor_alias_map.items()
                    if resolved_key == record_key and source_key in retained_investors
                ),
                None,
            )
            row = retained_investors.get(source_alias or "")
        if not row:
            missing_from_workbook.append(record_key)
            continue
        master, web_profile = supplemental_envelopes(
            record_key, row, retained_source_path
        )
        bundle.records["investors"][record_key] = master
        bundle.records["investor_web_profiles"][web_profile["record_key"]] = web_profile
        investor_id = f"planned:{record_key}"
        register_investor(maps, record_key, investor_id, master["data"])
        planned_new_masters += 1
        supplemental_count += 1

    missing_dependencies = sorted(
        key
        for key in bundle.dependency_investor_keys
        if not candidate_values(maps.investor_keys, key)
    )
    ambiguous_dependencies = sorted(
        key
        for key in bundle.dependency_investor_keys
        if len(candidate_values(maps.investor_keys, key)) > 1
    )
    if missing_dependencies or ambiguous_dependencies or missing_from_workbook:
        raise ValueError(
            "Investor dependency check failed after merging package masters: "
            f"missing={missing_dependencies}, ambiguous={ambiguous_dependencies}, "
            f"missing_from_workbook={missing_from_workbook}"
        )

    unresolved_refs: list[str] = []
    for table in (
        "investor_web_profiles",
        "investor_programs",
        "investor_team_members",
    ):
        for envelope in bundle.records[table].values():
            investor_key = str((envelope.get("refs") or {}).get("investor_key") or "")
            if not candidate_values(maps.investor_keys, investor_key):
                unresolved_refs.append(f"{table}:{investor_key}")
    for envelope in bundle.records["deal_investors"].values():
        investor_key = str((envelope.get("refs") or {}).get("investor_key") or "")
        if not candidate_values(maps.investor_keys, investor_key):
            unresolved_refs.append(f"deal_investors:{investor_key}")
    if unresolved_refs:
        raise ValueError(f"Unresolved investor references: {unresolved_refs[:30]}")

    return {
        "dependency_investor_keys": len(bundle.dependency_investor_keys),
        "existing_master_matches": existing_master_matches,
        "planned_new_investor_masters": planned_new_masters,
        "workbook_dependency_supplements": supplemental_count,
        "record_counts": {
            table: len(records) for table, records in sorted(bundle.records.items())
        },
        "duplicate_record_keys_replaced": dict(bundle.duplicate_record_keys_replaced),
        "unsupported_records": dict(bundle.unsupported_records),
        "cleaning": dict(bundle.cleaning),
    }


def merged_aliases(existing: Any, incoming: Any) -> list[str]:
    values: list[str] = []
    for collection in (existing, incoming):
        for value in collection if isinstance(collection, list) else []:
            text = str(value).strip()
            if text and text.lower() not in {item.lower() for item in values}:
                values.append(text)
    return values


def persist_investor_key(
    connection: Connection,
    investor_id: str,
    record_key: str,
    envelope: dict[str, Any],
) -> None:
    connection.execute(
        """
        INSERT INTO investor_external_ids (
          investor_id, source_provider, external_id, source_payload
        ) VALUES (%s, 'other', %s, %s)
        ON CONFLICT (source_provider, external_id) WHERE deleted_at IS NULL
        DO UPDATE SET
          investor_id = EXCLUDED.investor_id,
          source_payload = EXCLUDED.source_payload,
          last_seen_at = now(),
          updated_at = now()
        """,
        (
            investor_id,
            record_key,
            Jsonb(
                {
                    "investor_key": record_key,
                    "source_path": envelope.get("_source_path"),
                    "provenance": envelope.get("provenance"),
                    "review": envelope.get("review"),
                }
            ),
        ),
    )


def upsert_investors(
    connection: Connection,
    bundle: ImportBundle,
    maps: IdentityMaps,
    stats: Counter[str],
) -> None:
    for record_key, envelope in sorted(bundle.records["investors"].items()):
        data = envelope["data"]
        investor_id = resolve_investor(maps, record_key, data)
        if investor_id:
            existing = connection.execute(
                "SELECT aliases FROM investors WHERE id = %s", (investor_id,)
            ).fetchone()
            aliases = merged_aliases(
                existing[0] if existing else [], data.get("aliases")
            )
            connection.execute(
                """
                UPDATE investors
                SET canonical_name = %s,
                    aliases = %s,
                    investor_type = %s,
                    website_url = %s,
                    linkedin_url = %s,
                    hq_country = %s,
                    hq_state = %s,
                    hq_city = %s,
                    offices = %s,
                    status = %s,
                    review_status = %s,
                    last_reviewed_at = %s,
                    updated_at = now(),
                    deleted_at = NULL
                WHERE id = %s
                """,
                (
                    data.get("canonical_name"),
                    Jsonb(aliases),
                    formal.normalize_investor_type(data.get("investor_type")),
                    formal.normalize_identity_url(data.get("website_url")),
                    formal.normalize_identity_url(data.get("linkedin_url")),
                    data.get("hq_country"),
                    data.get("hq_state"),
                    data.get("hq_city"),
                    Jsonb(data.get("offices") or []),
                    data.get("status") or "active",
                    formal.normalize_review_status(data.get("review_status")),
                    formal.as_datetime_text(data.get("last_reviewed_at")),
                    investor_id,
                ),
            )
            stats["investors_updated_or_merged"] += 1
        else:
            row = connection.execute(
                """
                INSERT INTO investors (
                  canonical_name, aliases, investor_type, website_url,
                  linkedin_url, hq_country, hq_state, hq_city, offices,
                  status, review_status, last_reviewed_at
                ) VALUES (
                  %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING id::text
                """,
                (
                    data.get("canonical_name"),
                    Jsonb(data.get("aliases") or []),
                    formal.normalize_investor_type(data.get("investor_type")),
                    formal.normalize_identity_url(data.get("website_url")),
                    formal.normalize_identity_url(data.get("linkedin_url")),
                    data.get("hq_country"),
                    data.get("hq_state"),
                    data.get("hq_city"),
                    Jsonb(data.get("offices") or []),
                    data.get("status") or "active",
                    formal.normalize_review_status(data.get("review_status")),
                    formal.as_datetime_text(data.get("last_reviewed_at")),
                ),
            ).fetchone()
            investor_id = str(row[0])
            stats["investors_inserted"] += 1
        persist_investor_key(connection, investor_id, record_key, envelope)
        register_investor(maps, record_key, investor_id, data)


def investor_id_for_ref(maps: IdentityMaps, envelope: dict[str, Any]) -> str:
    investor_key = str((envelope.get("refs") or {}).get("investor_key") or "")
    investor_id = unique_candidate(
        candidate_values(maps.investor_keys, investor_key), investor_key
    )
    if not investor_id:
        raise ValueError(f"Missing investor reference: {investor_key}")
    return investor_id


def upsert_web_profiles(
    connection: Connection,
    bundle: ImportBundle,
    maps: IdentityMaps,
    stats: Counter[str],
) -> None:
    envelopes = sorted(
        bundle.records["investor_web_profiles"].values(),
        key=lambda item: str(item.get("data", {}).get("retrieved_at") or ""),
    )
    for envelope in envelopes:
        data = envelope["data"]
        investor_id = investor_id_for_ref(maps, envelope)
        row = connection.execute(
            """
            SELECT id::text
            FROM investor_web_profiles
            WHERE investor_id = %s AND is_current AND deleted_at IS NULL
            ORDER BY retrieved_at DESC NULLS LAST, created_at DESC
            LIMIT 1
            """,
            (investor_id,),
        ).fetchone()
        values = (
            Jsonb(data.get("source_urls") or []),
            formal.as_datetime_text(data.get("retrieved_at")),
            normalize_website_status(data.get("website_status")),
            data.get("raw_content_hash"),
            data.get("raw_content_ref"),
            data.get("extraction_model"),
            data.get("extraction_version"),
            formal.normalize_confidence(data.get("confidence")),
            data.get("claimed_thesis"),
            Jsonb(data.get("claimed_stages") or []),
            Jsonb(data.get("claimed_sectors") or []),
            Jsonb(data.get("claimed_geographies") or []),
            Jsonb(data.get("claimed_business_models") or []),
            data.get("claimed_cheque_min"),
            data.get("claimed_cheque_max"),
            formal.normalize_currency(data.get("claimed_cheque_currency")),
            Jsonb(data.get("contact_emails") or []),
            data.get("application_url"),
            data.get("contact_notes"),
        )
        if row:
            connection.execute(
                """
                UPDATE investor_web_profiles
                SET source_urls=%s, retrieved_at=%s, website_status=%s,
                    raw_content_hash=%s, raw_content_ref=%s,
                    extraction_model=%s, extraction_version=%s, confidence=%s,
                    claimed_thesis=%s, claimed_stages=%s, claimed_sectors=%s,
                    claimed_geographies=%s, claimed_business_models=%s,
                    claimed_cheque_min=%s, claimed_cheque_max=%s,
                    claimed_cheque_currency=%s, contact_emails=%s,
                    application_url=%s, contact_notes=%s, is_current=true,
                    superseded_at=NULL, deleted_at=NULL
                WHERE id=%s
                """,
                (*values, row[0]),
            )
            stats["investor_web_profiles_updated"] += 1
        else:
            connection.execute(
                """
                INSERT INTO investor_web_profiles (
                  investor_id, source_urls, retrieved_at, website_status,
                  raw_content_hash, raw_content_ref, extraction_model,
                  extraction_version, confidence, claimed_thesis,
                  claimed_stages, claimed_sectors, claimed_geographies,
                  claimed_business_models, claimed_cheque_min,
                  claimed_cheque_max, claimed_cheque_currency, contact_emails,
                  application_url, contact_notes, is_current
                ) VALUES (
                  %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,true
                )
                """,
                (investor_id, *values),
            )
            stats["investor_web_profiles_inserted"] += 1


def upsert_team_members(
    connection: Connection,
    bundle: ImportBundle,
    maps: IdentityMaps,
    stats: Counter[str],
) -> None:
    for envelope in bundle.records["investor_team_members"].values():
        data = envelope["data"]
        investor_id = investor_id_for_ref(maps, envelope)
        full_name = str(
            data.get("full_name")
            or " ".join(
                part for part in (data.get("first_name"), data.get("last_name")) if part
            )
        ).strip()
        linkedin = formal.normalize_identity_url(data.get("linkedin_url"))
        if linkedin:
            row = connection.execute(
                """
                SELECT id::text FROM investor_team_members
                WHERE investor_id=%s AND lower(linkedin_url)=lower(%s)
                  AND deleted_at IS NULL
                LIMIT 1
                """,
                (investor_id, linkedin),
            ).fetchone()
        else:
            row = connection.execute(
                """
                SELECT id::text FROM investor_team_members
                WHERE investor_id=%s AND lower(coalesce(full_name,''))=lower(%s)
                  AND lower(coalesce(role_title,''))=lower(%s)
                  AND deleted_at IS NULL
                LIMIT 1
                """,
                (investor_id, full_name, data.get("role_title") or ""),
            ).fetchone()
        seniority = (
            data.get("seniority")
            if data.get("seniority")
            in {"partner", "principal", "associate", "analyst", "operator", "other"}
            else "other"
        )
        values = (
            data.get("first_name") or "Unknown",
            data.get("last_name"),
            data.get("role_title"),
            seniority,
            linkedin,
            Jsonb(data.get("claimed_focus") or []),
            data.get("bio_summary"),
            data.get("source_url"),
            formal.as_datetime_text(data.get("retrieved_at")),
            bool(data.get("is_active", True)),
        )
        if row:
            connection.execute(
                """
                UPDATE investor_team_members
                SET first_name=%s,last_name=%s,role_title=%s,
                    seniority=%s,linkedin_url=%s,claimed_focus=%s,
                    bio_summary=%s,source_url=%s,retrieved_at=%s,is_active=%s,
                    updated_at=now(),deleted_at=NULL
                WHERE id=%s
                """,
                (*values, row[0]),
            )
            stats["investor_team_members_updated"] += 1
        else:
            connection.execute(
                """
                INSERT INTO investor_team_members (
                  investor_id,first_name,last_name,role_title,
                  seniority,linkedin_url,claimed_focus,bio_summary,source_url,
                  retrieved_at,is_active
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (investor_id, *values),
            )
            stats["investor_team_members_inserted"] += 1


def merge_investor_programs(
    connection: Connection,
    bundle: ImportBundle,
    maps: IdentityMaps,
    stats: Counter[str],
) -> None:
    for record_key, envelope in bundle.records["investor_programs"].items():
        data = envelope["data"]
        investor_id = investor_id_for_ref(maps, envelope)
        row = connection.execute(
            """
            SELECT id::text, source_urls, contact_notes, application_url
            FROM investor_web_profiles
            WHERE investor_id=%s AND is_current AND deleted_at IS NULL
            ORDER BY retrieved_at DESC, created_at DESC
            LIMIT 1
            """,
            (investor_id,),
        ).fetchone()
        evidence_urls = [
            str(value)
            for value in (
                data.get("evidence_source_urls")
                or ([data.get("source_url")] if data.get("source_url") else [])
            )
            if value
        ]
        marker = f"Program import [{record_key}]"
        note = (
            f"{marker}: {data.get('name') or 'Unnamed program'}; "
            f"type={data.get('program_type') or 'unknown'}; "
            f"status={data.get('status') or 'unknown'}; "
            f"eligibility_mode={data.get('eligibility_mode') or 'unknown'}; "
            "eligibility_rules_status="
            f"{data.get('eligibility_rules_status') or 'unknown'}; "
            f"review_notes={data.get('review_notes') or 'none'}."
        )
        if row:
            existing_sources = row[1] if isinstance(row[1], list) else []
            source_urls = list(existing_sources)
            for source_url in evidence_urls:
                if source_url not in source_urls:
                    source_urls.append(source_url)
            existing_notes = str(row[2] or "").strip()
            contact_notes = (
                existing_notes
                if marker in existing_notes
                else "\n\n".join(value for value in (existing_notes, note) if value)
            )
            connection.execute(
                """
                UPDATE investor_web_profiles
                SET source_urls=%s,
                    application_url=COALESCE(%s, application_url),
                    contact_notes=%s
                WHERE id=%s
                """,
                (
                    Jsonb(source_urls),
                    data.get("application_url"),
                    contact_notes,
                    row[0],
                ),
            )
            stats["investor_programs_merged"] += 1
        else:
            connection.execute(
                """
                INSERT INTO investor_web_profiles (
                  investor_id,source_urls,retrieved_at,website_status,
                  extraction_model,extraction_version,confidence,
                  application_url,contact_notes,is_current
                ) VALUES (%s,%s,%s,'minimal_content',%s,%s,'low',%s,%s,true)
                """,
                (
                    investor_id,
                    Jsonb(evidence_urls),
                    formal.as_datetime_text(data.get("last_verified_at"))
                    or "2026-07-30T00:00:00+10:00",
                    "investor-program-import",
                    "2026-07-30",
                    data.get("application_url"),
                    note,
                ),
            )
            stats["investor_programs_inserted_as_web_profile"] += 1


def register_company(
    maps: IdentityMaps, record_key: str, company_id: str, data: dict[str, Any]
) -> None:
    maps.company_keys[record_key] = company_id
    if data.get("crunchbase_uuid"):
        maps.company_crunchbase_ids[str(data["crunchbase_uuid"])] = company_id
    maps.company_name_sites[
        (
            str(data.get("name") or "").strip().lower(),
            normalized_url(data.get("website_url")) or "",
        )
    ] = company_id


def persist_company_key(
    connection: Connection,
    company_id: str,
    record_key: str,
    envelope: dict[str, Any],
) -> None:
    connection.execute(
        """
        INSERT INTO investee_external_ids (
          investee_company_id, source_provider, external_id, source_payload
        ) VALUES (%s, 'other', %s, %s)
        ON CONFLICT (source_provider, external_id) WHERE deleted_at IS NULL
        DO UPDATE SET
          investee_company_id=EXCLUDED.investee_company_id,
          source_payload=EXCLUDED.source_payload,
          last_seen_at=now(),updated_at=now()
        """,
        (
            company_id,
            record_key,
            Jsonb(
                {
                    "investee_company_key": record_key,
                    "source_path": envelope.get("_source_path"),
                    "provenance": envelope.get("provenance"),
                    "review": envelope.get("review"),
                }
            ),
        ),
    )


def upsert_companies(
    connection: Connection,
    bundle: ImportBundle,
    maps: IdentityMaps,
    stats: Counter[str],
) -> None:
    for record_key, envelope in bundle.records["investee_company_profiles"].items():
        data = envelope["data"]
        candidates = {
            value
            for value in (
                maps.company_keys.get(record_key),
                maps.company_crunchbase_ids.get(str(data.get("crunchbase_uuid") or "")),
                maps.company_name_sites.get(
                    (
                        str(data.get("name") or "").strip().lower(),
                        normalized_url(data.get("website_url")) or "",
                    )
                ),
            )
            if value
        }
        company_id = unique_candidate(candidates, record_key)
        sector_secondary = (
            json.dumps(data.get("sector_secondary"), ensure_ascii=False)
            if isinstance(data.get("sector_secondary"), list)
            else data.get("sector_secondary")
        )
        values = (
            data.get("name"),
            data.get("website_url"),
            data.get("crunchbase_uuid"),
            data.get("hq_country"),
            data.get("hq_state"),
            data.get("hq_city"),
            data.get("is_anz"),
            data.get("sector_primary"),
            sector_secondary,
            data.get("use_case_primary"),
            Jsonb(data.get("use_case_secondary") or []),
            formal.normalize_customer_type(data.get("customer_type")),
            formal.normalize_business_model(data.get("business_model")),
            formal.normalize_sales_motion(data.get("sales_motion")),
            formal.normalize_technology_depth(data.get("technology_depth")),
            formal.normalize_ai_relevance(data.get("ai_relevance")),
            formal.normalize_ai_usage_type(data.get("ai_usage_type")),
            formal.normalize_ai_core_or_enabler(data.get("ai_core_or_enabler")),
            data.get("company_summary"),
            Jsonb(data.get("source_urls") or []),
            formal.as_datetime_text(data.get("retrieved_at")),
            data.get("raw_content_hash"),
            data.get("extraction_model"),
            data.get("extraction_version"),
            formal.normalize_confidence(data.get("confidence")),
        )
        if company_id:
            connection.execute(
                """
                UPDATE investee_company_profiles SET
                  name=%s,website_url=%s,crunchbase_uuid=%s,hq_country=%s,
                  hq_state=%s,hq_city=%s,is_anz=%s,sector_primary=%s,
                  sector_secondary=%s,use_case_primary=%s,use_case_secondary=%s,
                  customer_type=%s,business_model=%s,sales_motion=%s,
                  technology_depth=%s,ai_relevance=%s,ai_usage_type=%s,
                  ai_core_or_enabler=%s,company_summary=%s,source_urls=%s,
                  retrieved_at=%s,raw_content_hash=%s,extraction_model=%s,
                  extraction_version=%s,confidence=%s,updated_at=now(),deleted_at=NULL
                WHERE id=%s
                """,
                (*values, company_id),
            )
            stats["investee_company_profiles_updated"] += 1
        else:
            row = connection.execute(
                """
                INSERT INTO investee_company_profiles (
                  name,website_url,crunchbase_uuid,hq_country,hq_state,hq_city,
                  is_anz,sector_primary,sector_secondary,use_case_primary,
                  use_case_secondary,customer_type,business_model,sales_motion,
                  technology_depth,ai_relevance,ai_usage_type,ai_core_or_enabler,
                  company_summary,source_urls,retrieved_at,raw_content_hash,
                  extraction_model,extraction_version,confidence
                ) VALUES (
                  %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                  %s,%s,%s,%s,%s,%s,%s
                ) RETURNING id::text
                """,
                values,
            ).fetchone()
            company_id = str(row[0])
            stats["investee_company_profiles_inserted"] += 1
        persist_company_key(connection, company_id, record_key, envelope)
        register_company(maps, record_key, company_id, data)


def upsert_external_ids(
    connection: Connection,
    bundle: ImportBundle,
    maps: IdentityMaps,
    stats: Counter[str],
) -> None:
    configs = (
        ("investor_external_ids", "investor_id", "investor_key"),
        ("investee_external_ids", "investee_company_id", "investee_company_key"),
    )
    for table, fk_column, ref_name in configs:
        for envelope in bundle.records[table].values():
            data = envelope["data"]
            ref_key = str((envelope.get("refs") or {}).get(ref_name) or "")
            if table == "investor_external_ids":
                parent_id = unique_candidate(
                    candidate_values(maps.investor_keys, ref_key), ref_key
                )
            else:
                parent_id = maps.company_keys.get(ref_key)
            if not parent_id:
                raise ValueError(f"Missing {table} parent: {ref_key}")
            source_provider = formal.normalize_source_provider(
                data.get("source_provider")
            )
            source_payload = {
                "record_key": envelope.get("record_key"),
                ref_name: ref_key,
                "provenance": envelope.get("provenance"),
                "review": envelope.get("review"),
            }
            connection.execute(
                f"""
                INSERT INTO {table} (
                  {fk_column},source_provider,external_id,external_url,
                  first_seen_at,last_seen_at,source_payload
                ) VALUES (%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (source_provider,external_id) WHERE deleted_at IS NULL
                DO UPDATE SET
                  {fk_column}=EXCLUDED.{fk_column},external_url=EXCLUDED.external_url,
                  last_seen_at=EXCLUDED.last_seen_at,source_payload=EXCLUDED.source_payload,
                  updated_at=now()
                """,
                (
                    parent_id,
                    source_provider,
                    data.get("external_id"),
                    data.get("external_url"),
                    formal.as_datetime_text(data.get("first_seen_at")),
                    formal.as_datetime_text(data.get("last_seen_at")),
                    Jsonb(source_payload),
                ),
            )
            stats[f"{table}_upserted"] += 1


def upsert_rounds(
    connection: Connection,
    bundle: ImportBundle,
    maps: IdentityMaps,
    stats: Counter[str],
) -> dict[str, str]:
    round_ids: dict[str, str] = {}
    for record_key, envelope in bundle.records["funding_rounds"].items():
        data = envelope["data"]
        company_key = str(
            (envelope.get("refs") or {}).get("investee_company_key") or ""
        )
        company_id = maps.company_keys.get(company_key)
        if not company_id:
            raise ValueError(f"Missing company reference: {company_key}")
        provider = formal.normalize_source_provider(data.get("source_provider"))
        source_record_id = data.get("source_record_id")
        row = connection.execute(
            """
            SELECT id::text FROM funding_rounds
            WHERE source_provider=%s AND source_record_id=%s AND deleted_at IS NULL
            LIMIT 1
            """,
            (provider, source_record_id),
        ).fetchone()
        source_payload = dict(data.get("source_payload") or {})
        verification = {
            key: data.get(key)
            for key in (
                "verification_status",
                "verification_source_url",
                "verification_notes",
                "verification_checked_at",
            )
            if data.get(key) is not None
        }
        if verification:
            source_payload["_rally_verification"] = verification
        values = (
            provider,
            source_record_id,
            data.get("dedupe_key"),
            data.get("source_url"),
            Jsonb(source_payload),
            company_id,
            data.get("investee_name_raw") or "Unknown",
            data.get("org_location_raw"),
            data.get("org_website_raw"),
            data.get("org_industries_raw"),
            data.get("round_type_raw"),
            formal.normalize_stage(data.get("round_stage")),
            data.get("funding_stage_raw"),
            formal.as_date(data.get("announced_date")),
            data.get("money_raised_raw"),
            data.get("amount"),
            formal.normalize_currency(data.get("currency")),
            data.get("amount_usd"),
            data.get("pre_money_valuation_raw"),
            data.get("pre_money_valuation"),
            formal.normalize_currency(data.get("valuation_currency")),
            data.get("valuation_usd"),
            data.get("equity_only"),
            data.get("total_funding_raw"),
            data.get("investor_names_raw"),
            data.get("lead_investor_names_raw"),
            formal.as_datetime_text(data.get("imported_at")),
            data.get("import_batch_id"),
        )
        if row:
            round_id = str(row[0])
            connection.execute(
                """
                UPDATE funding_rounds SET
                  source_provider=%s,source_record_id=%s,dedupe_key=%s,source_url=%s,
                  source_payload=%s,investee_company_id=%s,investee_name_raw=%s,
                  org_location_raw=%s,org_website_raw=%s,org_industries_raw=%s,
                  round_type_raw=%s,round_stage=%s,funding_stage_raw=%s,
                  announced_date=%s,money_raised_raw=%s,amount=%s,currency=%s,
                  amount_usd=%s,pre_money_valuation_raw=%s,pre_money_valuation=%s,
                  valuation_currency=%s,valuation_usd=%s,equity_only=%s,
                  total_funding_raw=%s,investor_names_raw=%s,lead_investor_names_raw=%s,
                  imported_at=%s,import_batch_id=%s,deleted_at=NULL
                WHERE id=%s
                """,
                (*values, round_id),
            )
            stats["funding_rounds_updated"] += 1
        else:
            row = connection.execute(
                """
                INSERT INTO funding_rounds (
                  source_provider,source_record_id,dedupe_key,source_url,source_payload,
                  investee_company_id,investee_name_raw,org_location_raw,org_website_raw,
                  org_industries_raw,round_type_raw,round_stage,funding_stage_raw,
                  announced_date,money_raised_raw,amount,currency,amount_usd,
                  pre_money_valuation_raw,pre_money_valuation,valuation_currency,
                  valuation_usd,equity_only,total_funding_raw,investor_names_raw,
                  lead_investor_names_raw,imported_at,import_batch_id
                ) VALUES (
                  %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                  %s,%s,%s,%s,%s,%s,%s,%s,%s,%s
                ) RETURNING id::text
                """,
                values,
            ).fetchone()
            round_id = str(row[0])
            stats["funding_rounds_inserted"] += 1
        round_ids[record_key] = round_id
    return round_ids


def upsert_deal_investors(
    connection: Connection,
    bundle: ImportBundle,
    maps: IdentityMaps,
    round_ids: dict[str, str],
    stats: Counter[str],
) -> None:
    for envelope in bundle.records["deal_investors"].values():
        data = envelope["data"]
        refs = envelope.get("refs") or {}
        deal_key = str(refs.get("deal_key") or "")
        investor_key = str(refs.get("investor_key") or "")
        deal_id = round_ids.get(deal_key)
        investor_id = unique_candidate(
            candidate_values(maps.investor_keys, investor_key), investor_key
        )
        if not deal_id or not investor_id:
            raise ValueError(
                f"Unresolved deal-investor refs: deal={deal_key}, investor={investor_key}"
            )
        row = connection.execute(
            """
            SELECT id::text FROM deal_investors
            WHERE deal_id=%s AND investor_id=%s AND deleted_at IS NULL
            LIMIT 1
            """,
            (deal_id, investor_id),
        ).fetchone()
        values = (
            data.get("raw_name") or "Unknown",
            formal.one_of(data.get("role"), formal.ALLOWED_DEAL_ROLES, "unknown"),
            formal.one_of(
                data.get("participation_status"),
                formal.ALLOWED_PARTICIPATION,
                "unknown",
            ),
            formal.one_of(
                data.get("resolution"), formal.ALLOWED_RESOLUTION, "unresolved"
            ),
            formal.normalize_confidence(data.get("resolution_confidence")),
        )
        if row:
            connection.execute(
                """
                UPDATE deal_investors SET
                  raw_name=%s,role=%s,participation_status=%s,resolution=%s,
                  resolution_confidence=%s,deleted_at=NULL
                WHERE id=%s
                """,
                (*values, row[0]),
            )
            stats["deal_investors_updated"] += 1
        else:
            connection.execute(
                """
                INSERT INTO deal_investors (
                  deal_id,investor_id,raw_name,role,participation_status,
                  resolution,resolution_confidence
                ) VALUES (%s,%s,%s,%s,%s,%s,%s)
                """,
                (deal_id, investor_id, *values),
            )
            stats["deal_investors_inserted"] += 1


def state_from_database(connection: Connection) -> formal.ImportState:
    state = formal.ImportState(
        record_ids={},
        records=defaultdict(dict),
        skipped=Counter(),
        manual_review_items=[],
    )
    investor_key_by_id: dict[str, str] = {}
    company_key_by_id: dict[str, str] = {}
    round_key_by_id: dict[str, str] = {}
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute("SELECT * FROM investors WHERE deleted_at IS NULL")
        for row in cursor.fetchall():
            investor_id = str(row["id"])
            key = f"investor:db:{investor_id}"
            investor_key_by_id[investor_id] = key
            state.record_ids[key] = investor_id
            state.records["investors"][key] = {
                "record_key": key,
                "data": json_safe(dict(row)),
            }

        cursor.execute(
            "SELECT * FROM investor_web_profiles WHERE deleted_at IS NULL AND is_current"
        )
        for row in cursor.fetchall():
            investor_key = investor_key_by_id.get(str(row["investor_id"]))
            if investor_key:
                key = f"investor_web_profile:db:{row['id']}"
                state.records["investor_web_profiles"][key] = {
                    "record_key": key,
                    "refs": {"investor_key": investor_key},
                    "data": json_safe(dict(row)),
                }

        cursor.execute(
            "SELECT * FROM investee_company_profiles WHERE deleted_at IS NULL"
        )
        for row in cursor.fetchall():
            company_id = str(row["id"])
            key = f"company:db:{company_id}"
            company_key_by_id[company_id] = key
            state.records["investee_company_profiles"][key] = {
                "record_key": key,
                "data": json_safe(dict(row)),
            }

        cursor.execute("SELECT * FROM funding_rounds WHERE deleted_at IS NULL")
        for row in cursor.fetchall():
            round_id = str(row["id"])
            key = f"funding_round:db:{round_id}"
            round_key_by_id[round_id] = key
            state.records["funding_rounds"][key] = {
                "record_key": key,
                "refs": {
                    "investee_company_key": company_key_by_id.get(
                        str(row["investee_company_id"])
                    )
                },
                "data": json_safe(dict(row)),
            }

        cursor.execute("SELECT * FROM deal_investors WHERE deleted_at IS NULL")
        for row in cursor.fetchall():
            investor_key = investor_key_by_id.get(str(row["investor_id"]))
            round_key = round_key_by_id.get(str(row["deal_id"]))
            if not investor_key or not round_key:
                continue
            key = f"deal_investor:db:{row['id']}"
            state.records["deal_investors"][key] = {
                "record_key": key,
                "refs": {"deal_key": round_key, "investor_key": investor_key},
                "data": json_safe(dict(row)),
            }
    return state


def json_safe(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    if isinstance(value, dict):
        return {key: json_safe(item) for key, item in value.items()}
    return value


def rebuild_preferences(connection: Connection) -> dict[str, int]:
    formal.PIPELINE_VERSION = PIPELINE_VERSION
    state = state_from_database(connection)
    evidence = formal.build_deal_evidence(state)
    stage_preferences = formal.insert_stage_preferences(connection, evidence)
    formal.insert_investor_preferences(connection, state, evidence, stage_preferences)
    formal.insert_manual_review_items(connection, state)
    return {
        "evidence_rows": len(evidence),
        "investors_with_stage_preferences": len(stage_preferences),
        "manual_review_items": len(state.manual_review_items),
    }


def database_counts(connection: Connection) -> dict[str, int]:
    tables = (
        "investors",
        "investor_external_ids",
        "investor_web_profiles",
        "investor_team_members",
        "investee_company_profiles",
        "investee_external_ids",
        "funding_rounds",
        "deal_investors",
        "investor_actual_preferences",
        "investor_actual_stage_preferences",
        "classification_manual_review_items",
    )
    counts: dict[str, int] = {}
    for table in tables:
        counts[table] = int(
            connection.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
        )
    return counts


def scan_database_for_mojibake(connection: Connection) -> list[dict[str, str]]:
    queries = {
        "investors": "concat_ws(' | ',canonical_name,aliases::text,hq_state,hq_city)",
        "investor_web_profiles": "concat_ws(' | ',claimed_thesis,contact_notes,source_urls::text)",
        "investor_team_members": "concat_ws(' | ',first_name,last_name,full_name,role_title,bio_summary)",
        "investee_company_profiles": "concat_ws(' | ',name,company_summary,sector_primary,sector_secondary,use_case_primary,use_case_secondary::text)",
        "funding_rounds": "concat_ws(' | ',investee_name_raw,investor_names_raw,lead_investor_names_raw,source_payload::text)",
        "deal_investors": "raw_name",
    }
    samples: list[dict[str, str]] = []
    marker_pattern = re.compile(
        "|".join(re.escape(marker) for marker in MOJIBAKE_MARKERS)
    )
    for table, expression in queries.items():
        rows = connection.execute(
            f"SELECT id::text, {expression} AS value FROM {table} WHERE deleted_at IS NULL"
        ).fetchall()
        for row_id, value in rows:
            text = str(value or "")
            if marker_pattern.search(text):
                samples.append({"table": table, "id": row_id, "value": text[:300]})
                if len(samples) >= 30:
                    return samples
    return samples


def apply_import(
    connection: Connection, bundle: ImportBundle
) -> tuple[dict[str, int], dict[str, int]]:
    stats: Counter[str] = Counter()
    maps = load_identity_maps(connection)
    upsert_investors(connection, bundle, maps, stats)
    upsert_web_profiles(connection, bundle, maps, stats)
    merge_investor_programs(connection, bundle, maps, stats)
    upsert_team_members(connection, bundle, maps, stats)
    upsert_companies(connection, bundle, maps, stats)
    upsert_external_ids(connection, bundle, maps, stats)
    round_ids = upsert_rounds(connection, bundle, maps, stats)
    upsert_deal_investors(connection, bundle, maps, round_ids, stats)
    connection.commit()
    derived = rebuild_preferences(connection)
    return dict(stats), derived


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Incrementally import audited recent-deal delta packages."
    )
    parser.add_argument("--input-root", required=True, type=Path)
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL") or DEFAULT_DATABASE_URL,
    )
    parser.add_argument("--summary-file", type=Path, default=DEFAULT_SUMMARY_FILE)
    parser.add_argument(
        "--retained-investors-json",
        type=Path,
        default=DEFAULT_RETAINED_INVESTORS_FILE,
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    bundle = load_bundle(args.input_root)
    retained_investors = load_retained_investors(args.retained_investors_json, bundle)
    with connect(args.database_url) as connection:
        plan = dry_run_plan(
            connection,
            bundle,
            retained_investors,
            args.retained_investors_json,
        )
        before = database_counts(connection)
        if args.dry_run:
            print(
                json.dumps(
                    {"plan": plan, "before": before}, indent=2, ensure_ascii=False
                )
            )
            return

        imported, derived = apply_import(connection, bundle)
        after = database_counts(connection)
        suspicious_after = scan_database_for_mojibake(connection)
        if suspicious_after:
            raise RuntimeError(
                "Suspicious text remains after import: "
                + json.dumps(suspicious_after[:5], ensure_ascii=False)
            )

    summary = {
        "pipeline_version": PIPELINE_VERSION,
        "generated_at": datetime.now().astimezone().isoformat(),
        "input_root": args.input_root.name,
        "packages": bundle.packages,
        "plan": plan,
        "cleaning": dict(bundle.cleaning),
        "imported": imported,
        "derived": derived,
        "before": before,
        "after": after,
        "suspicious_text_after_import": suspicious_after,
    }
    args.summary_file.parent.mkdir(parents=True, exist_ok=True)
    args.summary_file.write_text(
        json.dumps(summary, indent=2, ensure_ascii=False, default=str),
        encoding="utf-8",
    )
    print(json.dumps(summary, indent=2, ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
