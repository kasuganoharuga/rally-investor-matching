from fastapi import APIRouter

from app.services.investor_service import investor_service

router = APIRouter(prefix="/investors", tags=["investors"])


@router.get("")
async def list_investors() -> dict[str, dict]:
    data = await investor_service.list_summaries()
    return {"data": data.model_dump(by_alias=True)}
