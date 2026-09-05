from typing import Any

from fastapi import APIRouter, Depends

from app.api.dependencies import require_matching_server
from app.schemas.match import IntakeRequest
from app.services.match_service import match_service

router = APIRouter(
    prefix="/match",
    tags=["match"],
    dependencies=[Depends(require_matching_server)],
)


@router.post("/intake")
def intake_match(request: IntakeRequest) -> dict[str, Any]:
    # No DB connection is opened here — parse_founder_message() alone can run
    # two LLM calls; MatchService opens a connection only once it's about to
    # query investors, well after those calls finish. See
    # MatchService._run_database_match / app/db/connection.open_connection.
    data = match_service.intake(request=request)
    return {"data": data.model_dump(mode="json")}
