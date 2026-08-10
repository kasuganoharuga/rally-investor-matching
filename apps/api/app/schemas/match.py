from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

InvestorType = Literal[
    "vc_fund",
    "angel",
    "angel_group",
    "family_office",
    "corporate_vc",
    "accelerator",
    "government_fund",
    "other",
]


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
    result_limit: int = Field(default=20, ge=10, le=30)
    excluded_investor_types: list[InvestorType] = Field(
        default_factory=list,
        max_length=8,
    )

    @field_validator("excluded_investor_types")
    @classmethod
    def remove_duplicate_investor_types(
        cls,
        values: list[InvestorType],
    ) -> list[InvestorType]:
        return list(dict.fromkeys(values))


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
    investment_capacity: dict[str, Any] | None = None
