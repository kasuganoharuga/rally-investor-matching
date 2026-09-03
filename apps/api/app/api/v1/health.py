import logging

from fastapi import APIRouter, HTTPException, status
from psycopg import OperationalError

from app.core.config import settings
from app.db.connection import check_database

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "rally-investor-matching-api"}


@router.get("/ready")
def ready() -> dict[str, str]:
    try:
        check_database(settings.database_url)
    except (OperationalError, OSError, ValueError) as exc:
        logger.error("readiness_db_failed error_class=%s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="database_unavailable",
        ) from exc
    return {"status": "ready", "service": "rally-investor-matching-api"}
