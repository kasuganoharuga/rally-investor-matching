from uuid import UUID

from app.schemas.investor import InvestorSummary


class InvestorRepository:
    async def list_summaries(self) -> list[InvestorSummary]:
        # TODO: replace seed data with PostgreSQL queries via app/db/connection.py
        return [
            InvestorSummary(
                id=UUID("11111111-1111-4111-8111-111111111111"),
                name="Example Seed VC",
                slug="example-seed-vc",
                investor_type="vc",
                hq_country="AU",
                stage_focus=["pre-seed", "seed"],
                screening_status="screened",
            ),
            InvestorSummary(
                id=UUID("22222222-2222-4222-8222-222222222222"),
                name="Example Angel Syndicate",
                slug="example-angel-syndicate",
                investor_type="angel",
                hq_country="NZ",
                stage_focus=["seed"],
                screening_status="unscreened",
            ),
        ]


investor_repository = InvestorRepository()
