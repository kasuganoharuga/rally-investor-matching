from psycopg import Connection

from app.repositories.investor_repository import investor_repository
from app.schemas.investor import InvestorDetail, InvestorListData


class InvestorService:
    def __init__(self, repository=investor_repository) -> None:
        self._repository = repository

    def list_summaries(self, connection: Connection) -> InvestorListData:
        items = self._repository.list_summaries(connection)
        sorted_items = sorted(items, key=lambda investor: investor.name)
        return InvestorListData(items=sorted_items)

    def get_detail(self, connection: Connection, slug: str) -> InvestorDetail | None:
        return self._repository.get_detail(connection, slug)


investor_service = InvestorService()
