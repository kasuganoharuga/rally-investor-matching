from collections.abc import Generator

import psycopg
from psycopg import Connection

from app.core.config import settings

# Applies to every connection opened here, including open_connection(). A
# stuck TCP handshake must fail fast instead of holding up a request (or,
# worse, a request that's also holding an LLM call open) indefinitely.
CONNECT_TIMEOUT_SECONDS = 5


def check_database(database_url: str | None = None) -> None:
    """Open a short-lived connection and run SELECT 1 for readiness checks."""
    url = database_url or settings.database_url
    with psycopg.connect(url, connect_timeout=3) as connection:
        connection.execute("SELECT 1")


def open_connection() -> Connection:
    """Open a connection for a single bounded unit of DB work.

    Use as a context manager (`with open_connection() as connection:`)
    right around the queries that need it. Do not hold it open across a
    slow, non-DB operation (an LLM call, an outbound HTTP request) —
    under concurrent matching requests that exhausts the RDS connection
    limit long before it exhausts anything CPU-bound.
    """
    return psycopg.connect(
        settings.database_url, connect_timeout=CONNECT_TIMEOUT_SECONDS
    )


def get_connection() -> Generator[Connection, None, None]:
    """FastAPI dependency yielding a connection for the request's lifetime.

    Only suitable for routes that do DB work and nothing else. A route
    that also calls out to an LLM must not depend on this — open a
    connection with open_connection() at the point it's actually needed
    instead (see MatchService._run_database_match).
    """
    with open_connection() as connection:
        yield connection
