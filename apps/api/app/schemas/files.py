from pydantic import BaseModel


class FileExtractionResponse(BaseModel):
    file_name: str
    content_type: str | None
    extension: str
    text: str
    character_count: int
    truncated: bool
