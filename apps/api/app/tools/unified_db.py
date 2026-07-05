"""Initialize the unified local Rally Investor Matching database."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from psycopg import connect

DEFAULT_DATABASE_URL = (
    "postgresql://rally:rally_dev_password@localhost:5432/rally_investor_matching"
)
DEFAULT_SCHEMA_PATH = Path("data/schemas/rally_investor_matching.schema.sql")
DEFAULT_SEED_PATH = Path("data/seeds/local_investors.sql")


def database_url(value: str | None) -> str:
    return value or os.getenv("DATABASE_URL") or DEFAULT_DATABASE_URL


def redact_database_url(value: str) -> str:
    parsed = urlsplit(value)
    if not parsed.password:
        return value

    hostname = parsed.hostname or ""
    if ":" in hostname and not hostname.startswith("["):
        hostname = f"[{hostname}]"
    if parsed.port:
        hostname = f"{hostname}:{parsed.port}"

    username = f"{parsed.username}:***@" if parsed.username else ""
    return urlunsplit(
        (
            parsed.scheme,
            f"{username}{hostname}",
            parsed.path,
            parsed.query,
            parsed.fragment,
        )
    )


def execute_sql_file(database_url: str, path: Path) -> None:
    sql = path.read_text(encoding="utf-8")
    with connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(sql)
        connection.commit()


def initialize_database(
    *,
    database_url_value: str,
    schema_path: Path,
    seed_path: Path | None,
) -> dict[str, str | bool]:
    execute_sql_file(database_url_value, schema_path)
    seed_applied = False
    if seed_path is not None:
        execute_sql_file(database_url_value, seed_path)
        seed_applied = True
    return {
        "database_url": redact_database_url(database_url_value),
        "schema_path": str(schema_path),
        "seed_path": str(seed_path) if seed_path is not None else "",
        "seed_applied": seed_applied,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Apply the unified Rally Investor Matching schema and local seed data."
        )
    )
    parser.add_argument("--database-url", default=None, help="PostgreSQL DATABASE_URL")
    parser.add_argument("--schema", type=Path, default=DEFAULT_SCHEMA_PATH)
    parser.add_argument("--seed", type=Path, default=DEFAULT_SEED_PATH)
    parser.add_argument("--skip-seed", action="store_true")
    args = parser.parse_args()

    result = initialize_database(
        database_url_value=database_url(args.database_url),
        schema_path=args.schema,
        seed_path=None if args.skip_seed else args.seed,
    )
    for key, value in result.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
