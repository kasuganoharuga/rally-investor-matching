from collections.abc import Generator

import psycopg
from psycopg import Connection

from app.core.config import settings


def get_connection() -> Generator[Connection, None, None]:
    """Yield a PostgreSQL connection for read-focused matching workflows."""
    with psycopg.connect(settings.database_url) as connection:
        yield connection
