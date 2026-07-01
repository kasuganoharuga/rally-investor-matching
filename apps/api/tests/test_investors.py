from fastapi.testclient import TestClient

from app.main import app


def test_list_investors_returns_data_envelope() -> None:
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
