from app.repositories.investor_repository import investor_repository
from app.schemas.investor import InvestorListData


class InvestorService:
    def __init__(self, repository=investor_repository) -> None:
        self._repository = repository

    async def list_summaries(self) -> InvestorListData:
        items = await self._repository.list_summaries()
        sorted_items = sorted(items, key=lambda investor: investor.name)
        return InvestorListData(items=sorted_items)


investor_service = InvestorService()
