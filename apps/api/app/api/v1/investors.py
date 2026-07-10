from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg import Connection

from app.db.connection import get_connection
from app.services.investor_service import investor_service

router = APIRouter(prefix="/investors", tags=["investors"])
DatabaseConnection = Annotated[Connection, Depends(get_connection)]


@router.get("")
def list_investors(connection: DatabaseConnection) -> dict[str, Any]:
    data = investor_service.list_summaries(connection)
    return {"data": data.model_dump(by_alias=True, mode="json")}


@router.get("/{slug}")
def get_investor(slug: str, connection: DatabaseConnection) -> dict[str, Any]:
    investor = investor_service.get_detail(connection, slug)
    if investor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investor '{slug}' was not found",
        )
    return {"data": investor.model_dump(by_alias=True, mode="json")}
