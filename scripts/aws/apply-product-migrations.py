"""Apply additive product patches before activating a release. Never loads seeds."""

from __future__ import annotations

import argparse
import os
from pathlib import Path

import psycopg


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path)
    args = parser.parse_args()
    database_url = os.environ.get("DATABASE_URL", "")
    if args.env_file:
        for raw in args.env_file.read_text(encoding="utf-8").splitlines():
            key, _, value = raw.removeprefix("export ").partition("=")
            if key.strip() == "DATABASE_URL":
                value = value.strip()
                if len(value) > 1 and value[0] == value[-1] and value[0] in "\"'":
                    value = value[1:-1]
                database_url = value
                break
    if not database_url:
        raise SystemExit("DATABASE_URL is not configured")
    root = Path(__file__).resolve().parents[2]
    # Explicit allowlist: never replay destructive schema/bootstrap/seed scripts.
    patches = [
        "202609_registration_rate_limits.sql",
        "202609_matching_settings.sql",
    ]
    with psycopg.connect(database_url) as connection, connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(820260902)")
        for name in patches:
            text = (root / "data" / "patches" / name).read_text(encoding="utf-8")
            # Each file is independently usable by psql. Keep the outer
            # transaction/lock here so the deployment is all-or-nothing.
            statements = "\n".join(
                line
                for line in text.splitlines()
                if line.strip().upper() not in {"BEGIN;", "COMMIT;"}
            )
            cursor.execute(statements)
            print(f"Applied additive patch: {name}")


if __name__ == "__main__":
    main()
