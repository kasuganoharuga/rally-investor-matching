from typing import Annotated, Any

from fastapi import APIRouter, Depends
from psycopg import Connection

from app.api.dependencies import require_matching_server
from app.db.connection import get_connection
from app.schemas.match import IntakeRequest
from app.services.match_service import match_service

router = APIRouter(
    prefix="/match",
    tags=["match"],
    dependencies=[Depends(require_matching_server)],
)
DatabaseConnection = Annotated[Connection, Depends(get_connection)]


@router.post("/intake")
def intake_match(
    request: IntakeRequest,
    connection: DatabaseConnection,
) -> dict[str, Any]:
    data = match_service.intake(request=request, connection=connection)
    return {"data": data.model_dump(mode="json")}
