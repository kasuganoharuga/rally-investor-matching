from typing import Annotated

from fastapi import APIRouter, File, UploadFile

from app.services.file_extraction_service import file_extraction_service

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/extract")
async def extract_file(file: Annotated[UploadFile, File(...)]) -> dict[str, object]:
    data = await file_extraction_service.extract(file)
    return {"data": data.model_dump(mode="json")}
