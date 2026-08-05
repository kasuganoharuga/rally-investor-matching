from app.services.founder_parser_service import parse_founder_message


class _FakeLLM:
    def __init__(self) -> None:
        self.calls = 0

    def generate_json(self, *, system: str, user: str, max_tokens: int = 900) -> dict:
        self.calls += 1
        if self.calls == 1:
            assert "Do not select actual_themes" in system
            return {
                "company_name": "DiagCo",
                "company_hq_country": "Australia",
                "primary_market": "Australia",
                "founder_au_anz_connection": "yes",
                "stage": "seed",
                "round_type": "seed",
                "target_raise_value": 2,
                "target_raise_currency": "AUD",
                "target_raise_unit": "million",
                "sector": "enterprise AI workflow",
                "actual_sector": ["enterprise_software_data_security"],
                "customer_type": "B2B",
                "customer_types": ["B2B", "SME", "government", "consumer"],
                "business_model": "SaaS",
                "business_models": ["SaaS", "services", "licensing", "freemium"],
                "sales_motion": None,
                "technology_depth": None,
                "ai_relevance": "ai_enabled",
                "ai_usage_type": None,
                "ai_core_or_enabler": None,
                "lead_needed": True,
                "warm_intro_available": None,
                "traction_summary": None,
                "one_sentence_summary": "AI workflow automation for enterprises",
                "missing_information": [],
            }

        assert "primary_themes" in system
        assert "enterprise_software_data_security" in system
        assert "ai_compute_infrastructure" in system
        assert "healthcare_life_sciences" not in system
        return {
            "primary_themes": ["ai_compute_infrastructure"],
            "secondary_themes": [
                "cloud_data_infrastructure",
                "developer_tools_app_platforms",
            ],
            "actual_themes": [
                "ai_compute_infrastructure",
                "cloud_data_infrastructure",
                "developer_tools_app_platforms",
            ],
        }


def test_parse_founder_message_uses_two_passes_and_sector_gated_themes() -> None:
    llm = _FakeLLM()
    parsed = parse_founder_message(
        "We build AI workflow automation for enterprises", llm
    )
    assert llm.calls == 2
    assert parsed["actual_sector"] == ["enterprise_software_data_security"]
    assert parsed["primary_themes"] == ["ai_compute_infrastructure"]
    assert parsed["secondary_themes"] == [
        "cloud_data_infrastructure",
        "developer_tools_app_platforms",
    ]
    assert parsed["customer_type"] == "enterprise"
    assert parsed["customer_types"] == ["enterprise", "smb", "government"]
    assert parsed["business_model"] == "SaaS"
    assert parsed["business_models"] == ["SaaS", "services", "licensing"]
