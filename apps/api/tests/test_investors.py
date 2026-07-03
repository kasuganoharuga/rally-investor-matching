from fastapi.testclient import TestClient

from app.db.connection import get_connection
from app.main import app


class FakeCursor:
    def __init__(self, rows: list[dict[str, object]]) -> None:
        self.rows = rows

    def __enter__(self) -> "FakeCursor":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def execute(self, query: str, params: tuple[object, ...] | None = None) -> None:
        self.query = query
        self.params = params

    def fetchall(self) -> list[dict[str, object]]:
        return self.rows

    def fetchone(self) -> dict[str, object] | None:
        return self.rows[0] if self.rows else None


class FakeConnection:
    def __init__(self, rows: list[dict[str, object]]) -> None:
        self.rows = rows

    def cursor(self, **kwargs: object) -> FakeCursor:
        return FakeCursor(self.rows)


def investor_summary_rows() -> list[dict[str, object]]:
    return [
        {
            "id": "22222222-2222-4222-8222-222222222222",
            "name": "Example Angel Syndicate",
            "slug": "example-angel-syndicate",
            "investor_type": "angel",
            "hq_country": "NZ",
            "stage_focus": ["seed"],
            "screening_status": "unscreened",
        },
        {
            "id": "11111111-1111-4111-8111-111111111111",
            "name": "Example Seed VC",
            "slug": "example-seed-vc",
            "investor_type": "vc",
            "hq_country": "AU",
            "stage_focus": ["pre_seed", "seed"],
            "screening_status": "screened",
        },
    ]


def test_list_investors_returns_data_envelope() -> None:
    app.dependency_overrides[get_connection] = lambda: FakeConnection(
        investor_summary_rows()
    )
    try:
        client = TestClient(app)

        response = client.get("/api/v1/investors")

        assert response.status_code == 200
        body = response.json()
        assert "data" in body
        assert len(body["data"]["items"]) == 2
        names = [item["name"] for item in body["data"]["items"]]
        assert names == sorted(names)
        assert "Example Seed VC" in names
        assert "Example Angel Syndicate" in names
        by_name = {item["name"]: item for item in body["data"]["items"]}
        assert by_name["Example Seed VC"]["investorType"] == "vc"
        assert by_name["Example Angel Syndicate"]["hqCountry"] == "NZ"
    finally:
        app.dependency_overrides.clear()
