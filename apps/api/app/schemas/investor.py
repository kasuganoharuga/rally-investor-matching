from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class InvestorSummary(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: UUID
    name: str
    slug: str | None = None
    investor_type: str | None = None
    website_url: str | None = None
    founded_year: int | None = None
    hq_country: str | None = None
    hq_state: str | None = None
    hq_city: str | None = None
    stage_focus: list[str] = Field(default_factory=list)
    sector_focus: list[str] = Field(default_factory=list)
    geography_focus: list[str] = Field(default_factory=list)
    business_model_focus: list[str] = Field(default_factory=list)
    cheque_ranges: list[dict[str, Any]] = Field(default_factory=list)
    lead_behavior: str | None = None
    screening_status: str = "unscreened"
    screening_priority: str | None = None
    screening_notes: str | None = None


class InvestorDetail(InvestorSummary):
    website_url: str | None = None
    linkedin_url: str | None = None
    founded_year: int | None = None
    hq_state: str | None = None
    hq_city: str | None = None
    sector_focus: list[str] = Field(default_factory=list)
    geography_focus: list[str] = Field(default_factory=list)
    business_model_focus: list[str] = Field(default_factory=list)
    founder_fit: list[str] = Field(default_factory=list)
    cheque_ranges: list[dict[str, Any]] = Field(default_factory=list)
    lead_behavior: str | None = None
    ai_appetite: str | None = None
    recent_deals: list[dict[str, Any]] = Field(default_factory=list)
    entry_channels: list[str] = Field(default_factory=list)
    preferred_channel: str | None = None
    screening_priority: str | None = None
    screening_notes: str | None = None
    stage_preferences: list[dict[str, Any]] = Field(default_factory=list)
    total_deals_used: int = 0
    stage_coverage: dict[str, Any] = Field(default_factory=dict)
    lead_ratio: float | None = None
    overall_confidence: float | None = None
    activity_summary: str | None = None
    data_quality: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class InvestorListData(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    items: list[InvestorSummary]
