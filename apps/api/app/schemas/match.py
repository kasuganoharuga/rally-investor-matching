from typing import Any

from pydantic import BaseModel, Field


class IntakeRequest(BaseModel):
    message: str = Field(..., min_length=1)
    follow_up_answer: str | None = None
    follow_up_count: int = Field(default=0, ge=0, le=1)


class IntakeResponse(BaseModel):
    status: str
    parsed_company_profile: dict[str, Any]
    missing_fields: list[str]
    follow_up_question: str | None
    follow_up_count: int
    matches: list[dict[str, Any]]
