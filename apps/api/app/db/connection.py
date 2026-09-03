from collections.abc import Generator

import psycopg
from psycopg import Connection

from app.core.config import settings


def check_database(database_url: str | None = None) -> None:
    """Open a short-lived connection and run SELECT 1 for readiness checks."""
    url = database_url or settings.database_url
    with psycopg.connect(url, connect_timeout=3) as connection:
        connection.execute("SELECT 1")


def get_connection() -> Generator[Connection, None, None]:
    """Yield a PostgreSQL connection for read-focused matching workflows."""
    with psycopg.connect(settings.database_url) as connection:
        yield connection
