from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator


class MatchingWeights(BaseModel):
    stage_evidence_depth: int = Field(default=10, ge=0, le=100)
    geography_fit: int = Field(default=5, ge=0, le=100)
    sector_fit: int = Field(default=20, ge=0, le=100)
    theme_fit: int = Field(default=20, ge=0, le=100)
    recent_deal_similarity: int = Field(default=25, ge=0, le=100)
    customer_icp_fit: int = Field(default=5, ge=0, le=100)
    cheque_size_fit: int = Field(default=5, ge=0, le=100)
    lead_behavior_fit: int = Field(default=5, ge=0, le=100)
    data_quality_recency: int = Field(default=5, ge=0, le=100)

    @model_validator(mode="after")
    def validate_total(self) -> MatchingWeights:
        if sum(self.model_dump().values()) != 100:
            raise ValueError("Matching weights must total 100.")
        return self


class HardFilterSettings(BaseModel):
    stage: bool = True
    geography: bool = True


class MatchingConfiguration(BaseModel):
    weights: MatchingWeights = Field(default_factory=MatchingWeights)
    hard_filters: HardFilterSettings = Field(default_factory=HardFilterSettings)


class IntakeRequest(BaseModel):
    message: str = Field(..., min_length=1)
    follow_up_answer: str | None = None
    follow_up_count: int = Field(default=0, ge=0, le=1)
    matching_configuration: MatchingConfiguration | None = None


class IntakeResponse(BaseModel):
    status: str
    parsed_company_profile: dict[str, Any]
    missing_fields: list[str]
    follow_up_question: str | None
    follow_up_count: int
    matches: list[dict[str, Any]]
