from secrets import compare_digest
from typing import Annotated

from fastapi import Header, HTTPException, status

from app.core.config import settings

LOCAL_MATCHING_SECRET = "rally-local-only-matching-key-change-for-deployment"


def require_matching_server(
    matching_key: Annotated[str | None, Header(alias="X-Rally-Matching-Key")] = None,
) -> None:
    """Only the authenticated Next.js proxy may supply scoring configuration.

    The proxy validates the actual user's session and resolves their persisted
    global/personal settings. CORS and a hidden Step 4 alone cannot protect the
    publicly reachable FastAPI endpoint from forged scoring requests.
    """
    expected = settings.rally_matching_api_secret.get_secret_value()
    local_key_in_deployment = (
        expected == LOCAL_MATCHING_SECRET
        and settings.app_env not in {"local", "development", "test"}
    )
    if len(expected) < 32 or local_key_in_deployment:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Matching service is not configured.",
        )
    if matching_key is None or not compare_digest(
        matching_key.encode("utf-8"), expected.encode("utf-8")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Matching requests must use the authenticated workspace.",
        )
