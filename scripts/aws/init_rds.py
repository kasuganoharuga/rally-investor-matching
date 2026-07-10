"""Initialize an AWS RDS PostgreSQL database for Rally Investor Matching.

This script avoids requiring the `psql` CLI. It uses the project's psycopg
dependency to apply the AWS bootstrap schema and, by default, the local MVP seed
data into the `mvp_compat` schema.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from psycopg import connect


def read_sql(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"SQL file not found: {path}")
    return path.read_text(encoding="utf-8")


def execute_sql_file(*, database_url: str, path: Path, label: str) -> None:
    sql = read_sql(path)
    print(f"Running {label}: {path}")
    with connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(sql)
        connection.commit()


def execute_seed_file(*, database_url: str, path: Path) -> None:
    sql = read_sql(path)
    print(f"Running MVP seed data into mvp_compat: {path}")
    with connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SET search_path TO mvp_compat, public")
            cursor.execute(sql)
        connection.commit()


def ensure_bootstrap_admin(
    *,
    database_url: str,
    admin_id: str,
    admin_email: str,
    admin_name: str,
) -> None:
    print(f"Ensuring bootstrap admin user exists: {admin_email}")
    with connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO public."user"
                  ("id", "name", "email", "emailVerified", "role", "createdAt", "updatedAt")
                VALUES
                  (%s, %s, %s, true, 'admin', now(), now())
                ON CONFLICT ("email") DO UPDATE SET
                  "name" = EXCLUDED."name",
                  "emailVerified" = true,
                  "role" = 'admin',
                  "updatedAt" = now()
                RETURNING "id"
                """,
                (admin_id, admin_name, admin_email),
            )
            user_id = cursor.fetchone()[0]
            name_parts = admin_name.split(maxsplit=1)
            first_name = name_parts[0] if name_parts else "Bootstrap"
            last_name = name_parts[1] if len(name_parts) > 1 else "Admin"
            cursor.execute(
                """
                INSERT INTO public.user_profiles
                  (user_id, first_name, last_name, role_at_company, onboarding_status)
                VALUES
                  (%s, %s, %s, 'operator', 'complete')
                ON CONFLICT (user_id) DO UPDATE SET
                  first_name = EXCLUDED.first_name,
                  last_name = EXCLUDED.last_name,
                  role_at_company = EXCLUDED.role_at_company,
                  onboarding_status = EXCLUDED.onboarding_status,
                  updated_at = now()
                """,
                (user_id, first_name, last_name),
            )
        connection.commit()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Apply AWS schema and MVP seed data to PostgreSQL."
    )
    parser.add_argument(
        "--database-url",
        required=True,
        help="PostgreSQL URL without search_path options.",
    )
    parser.add_argument(
        "--schema-path",
        type=Path,
        default=Path("data/schemas/vc_matching_schema_aws_with_mvp_compat.sql"),
    )
    parser.add_argument(
        "--seed-path",
        type=Path,
        default=Path("data/seeds/local_investors.sql"),
    )
    parser.add_argument("--skip-seed", action="store_true")
    parser.add_argument("--skip-bootstrap-admin", action="store_true")
    parser.add_argument("--admin-id", default="bootstrap-admin")
    parser.add_argument("--admin-email", default="admin@rally.local")
    parser.add_argument("--admin-name", default="Bootstrap Admin")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    execute_sql_file(
        database_url=args.database_url,
        path=args.schema_path,
        label="formal schema + MVP compatibility schema",
    )
    if not args.skip_seed:
        execute_seed_file(database_url=args.database_url, path=args.seed_path)
    if not args.skip_bootstrap_admin:
        ensure_bootstrap_admin(
            database_url=args.database_url,
            admin_id=args.admin_id,
            admin_email=args.admin_email,
            admin_name=args.admin_name,
        )

    print("RDS initialization complete.")
    print("Use search_path=mvp_compat,public for the current MVP app.")


if __name__ == "__main__":
    main()
