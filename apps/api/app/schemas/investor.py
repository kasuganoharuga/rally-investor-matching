from uuid import UUID

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class InvestorSummary(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: UUID
    name: str
    slug: str | None = None
    investor_type: str | None = None
    hq_country: str | None = None
    stage_focus: list[str] = []
    screening_status: str = "unscreened"


class InvestorListData(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    items: list[InvestorSummary]
