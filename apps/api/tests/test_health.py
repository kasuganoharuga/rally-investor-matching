import zipfile
from io import BytesIO

from fastapi.testclient import TestClient

import app.services.match_service as match_service_module
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


def make_docx_bytes(text: str) -> bytes:
    document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{text}</w:t></w:r></w:p>
  </w:body>
</w:document>
"""
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("word/document.xml", document_xml)
    return buffer.getvalue()


def make_pdf_bytes() -> bytes:
    page_object = (
        b"<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> "
        b"/MediaBox [0 0 612 792] /Contents 5 0 R >>"
    )
    return (
        b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
"""
        + page_object
        + b"""
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 56 >>
stream
BT /F1 18 Tf 72 720 Td (ClearRoute Robotics seed raise) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000241 00000 n
0000000311 00000 n
trailer
<< /Root 1 0 R /Size 6 >>
startxref
417
%%EOF
"""
    )


def investor_row(
    *,
    id_value: str = "10000000-0000-0000-0000-000000000001",
    name: str = "AirTree",
    slug: str = "airtree",
) -> dict[str, object]:
    return {
        "id": id_value,
        "name": name,
        "slug": slug,
        "investor_type": "VC",
        "website_url": "https://www.airtree.vc/",
        "linkedin_url": None,
        "founded_year": 2014,
        "hq_country": "AU",
        "hq_state": "NSW",
        "hq_city": "Sydney",
        "stage_focus": ["Seed"],
        "sector_focus": ["AI"],
        "geography_focus": ["AU", "NZ"],
        "business_model_focus": ["B2B"],
        "founder_fit": ["Aussie founders"],
        "cheque_ranges": [
            {
                "stage": "seed",
                "amount_min": 1000000,
                "amount_max": 5000000,
                "currency": "AUD",
            }
        ],
        "lead_behavior": "sometimes_leads",
        "ai_appetite": "high",
        "recent_deals": [],
        "entry_channels": ["direct_email"],
        "preferred_channel": "seedteam@airtree.vc",
        "screening_status": "reviewed_sample",
        "screening_priority": "high",
        "screening_notes": "Seeded from local AirTree JSON record.",
        "created_at": "2026-07-01T00:00:00",
        "updated_at": "2026-07-01T00:00:00",
    }


def test_health_endpoint() -> None:
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "rally-investor-matching-api",
    }


def test_v1_health_endpoint() -> None:
    client = TestClient(app)

    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "rally-investor-matching-api",
    }


def test_request_id_header_is_returned() -> None:
    client = TestClient(app)

    response = client.get("/health", headers={"X-Request-ID": "test-request-id"})

    assert response.headers["X-Request-ID"] == "test-request-id"


def test_error_response_shape_includes_request_id() -> None:
    client = TestClient(app)

    response = client.get("/missing", headers={"X-Request-ID": "test-request-id"})

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "HTTP_ERROR",
            "message": "Not Found",
            "request_id": "test-request-id",
        }
    }


def test_cors_allows_local_nextjs_origins() -> None:
    client = TestClient(app)

    for origin in ("http://localhost:3000", "http://127.0.0.1:3000"):
        response = client.options(
            "/api/v1/health",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            },
        )

        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == origin


def test_list_investors_endpoint() -> None:
    app.dependency_overrides[get_connection] = lambda: FakeConnection([investor_row()])
    try:
        client = TestClient(app)

        response = client.get("/api/v1/investors")

        assert response.status_code == 200
        assert len(response.json()["data"]["items"]) == 1
        assert response.json()["data"]["items"][0]["slug"] == "airtree"
    finally:
        app.dependency_overrides.clear()


def test_get_missing_investor_endpoint() -> None:
    app.dependency_overrides[get_connection] = lambda: FakeConnection([])
    try:
        client = TestClient(app)

        response = client.get("/api/v1/investors/missing")

        assert response.status_code == 404
        assert response.json()["error"]["message"] == "Investor 'missing' was not found"
    finally:
        app.dependency_overrides.clear()


def test_get_investor_endpoint() -> None:
    app.dependency_overrides[get_connection] = lambda: FakeConnection([investor_row()])
    try:
        client = TestClient(app)

        response = client.get("/api/v1/investors/airtree")

        assert response.status_code == 200
        assert response.json()["data"]["slug"] == "airtree"
        assert response.json()["data"]["chequeRanges"][0]["stage"] == "seed"
    finally:
        app.dependency_overrides.clear()


def test_extract_txt_file_endpoint() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/files/extract",
        files={
            "file": ("profile.txt", b"ClearRoute Robotics seed raise", "text/plain")
        },
    )

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["extension"] == ".txt"
    assert "ClearRoute Robotics" in body["text"]


def test_extract_docx_file_endpoint() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/files/extract",
        files={
            "file": (
                "profile.docx",
                make_docx_bytes("ClearRoute Robotics warehouse automation"),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["extension"] == ".docx"
    assert "warehouse automation" in body["text"]


def test_extract_pdf_file_endpoint() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/files/extract",
        files={"file": ("profile.pdf", make_pdf_bytes(), "application/pdf")},
    )

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["extension"] == ".pdf"
    assert "ClearRoute Robotics" in body["text"]


def test_match_intake_asks_one_follow_up(monkeypatch: object) -> None:
    def fake_parse(message: str) -> dict[str, object]:
        return {
            "company_name": "Example AI Health",
            "company_hq_country": "australia",
            "primary_market": "australia",
            "stage": None,
            "sector": "ai",
            "business_model": None,
            "target_raise_value": None,
            "target_raise_currency": None,
            "target_raise_unit": None,
            "lead_needed": True,
            "missing_information": ["stage", "business_model", "target_raise_value"],
        }

    monkeypatch.setattr(match_service_module, "parse_founder_message", fake_parse)
    app.dependency_overrides[get_connection] = lambda: FakeConnection([investor_row()])
    try:
        client = TestClient(app)

        response = client.post(
            "/api/v1/match/intake",
            json={"message": "We are an AU AI health company."},
        )

        body = response.json()["data"]
        assert response.status_code == 200
        assert body["status"] == "needs_follow_up"
        assert body["follow_up_count"] == 1
        assert "stage" in body["missing_fields"]
        assert body["matches"] == []
    finally:
        app.dependency_overrides.clear()


def test_match_intake_matches_after_follow_up(monkeypatch: object) -> None:
    def fake_parse(message: str) -> dict[str, object]:
        return {
            "company_name": "Example AI Health",
            "company_hq_country": "australia",
            "primary_market": "australia",
            "stage": "seed",
            "round_type": "seed",
            "sector": "ai",
            "business_model": "b2b",
            "target_raise_value": 2.5,
            "target_raise_currency": "AUD",
            "target_raise_unit": "million",
            "lead_needed": True,
            "missing_information": [],
        }

    monkeypatch.setattr(match_service_module, "parse_founder_message", fake_parse)
    app.dependency_overrides[get_connection] = lambda: FakeConnection([investor_row()])
    try:
        client = TestClient(app)

        response = client.post(
            "/api/v1/match/intake",
            json={
                "message": "We are an AU AI health company.",
                "follow_up_answer": "Seed, B2B, raising A$2.5m.",
                "follow_up_count": 1,
            },
        )

        body = response.json()["data"]
        assert response.status_code == 200
        assert body["status"] == "matched"
        assert body["matches"][0]["investor_id"] == "airtree"
        assert body["matches"][0]["breakdown"]["cheque_round_size_fit"] == 8
        assert len(body["matches"][0]["breakdown"]) == 10
    finally:
        app.dependency_overrides.clear()


def test_match_intake_returns_expanded_direct_vc_matches(monkeypatch: object) -> None:
    def fake_parse(message: str) -> dict[str, object]:
        return {
            "company_name": "Example AI Health",
            "company_hq_country": "australia",
            "primary_market": "australia",
            "stage": "seed",
            "round_type": "seed",
            "sector": "ai",
            "business_model": "b2b",
            "target_raise_value": 2.5,
            "target_raise_currency": "AUD",
            "target_raise_unit": "million",
            "lead_needed": True,
            "missing_information": [],
        }

    monkeypatch.setattr(match_service_module, "parse_founder_message", fake_parse)
    app.dependency_overrides[get_connection] = lambda: FakeConnection(
        [
            investor_row(
                id_value=f"10000000-0000-0000-0000-{index:012d}",
                name=f"Investor {index}",
                slug=f"investor-{index}",
            )
            for index in range(1, 13)
        ]
    )
    try:
        client = TestClient(app)

        response = client.post(
            "/api/v1/match/intake",
            json={"message": "We are an AU AI health company."},
        )

        body = response.json()["data"]
        assert response.status_code == 200
        assert body["status"] == "matched"
        assert len(body["matches"]) == 12
    finally:
        app.dependency_overrides.clear()
