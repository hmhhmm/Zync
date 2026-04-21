import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from unittest.mock import AsyncMock, patch, MagicMock


SAMPLE_DEPOSIT = {
    "location": "Bukit Merah, Perak",
    "state": "Perak",
    "clay_type": "laterite",
    "ree_grade": 0.08,
    "depth_m": 8.5,
    "esg_priority": "medium",
    "esg_notes": "Standard site",
}

MOCK_FLOWSHEET = {
    "lixiviant": "ammonium sulfate",
    "concentration_M": 0.5,
    "pH_range": "4.0-4.5",
    "temperature_C": 25,
    "contact_time_hrs": 2.0,
    "predicted_yield_pct": 68.0,
    "thorium_risk": "medium",
    "thorium_risk_reason": "pH range is within safe limits",
    "esg_flag": False,
    "esg_note": "Standard ammonium discharge treatment required",
    "sfiles_string": "IAC_Clay_Feed-(Heap_Leach/ammonium_sulfate,pH=4.0-4.5)-REE_Solution",
    "confidence": "high",
    "confidence_reason": "Based on historical cases from Perak",
    "reasoning_steps": [
        {"step": 1, "decision": "Select lixiviant", "scientific_basis": "Ammonium sulfate standard for laterite"},
        {"step": 2, "decision": "Set pH range", "scientific_basis": "pH 4.0-4.5 optimal for REE extraction"}
    ],
    "alternative_option": {"lixiviant": "magnesium sulfate", "note": "Lower ESG risk but 15% less yield"}
}

MOCK_COMPLIANCE = {
    "overall_status": "pass",
    "checks": [
        {"parameter": "thorium_232_bq_per_g", "proposed_value": "0.5 Bq/g",
         "limit": "1.0 Bq/g", "status": "pass",
         "regulation_cited": "AELB Regulations 1986, Regulation 26", "action_required": None},
        {"parameter": "discharge_pH", "proposed_value": "4.0-4.5",
         "limit": "6.0-9.0", "status": "pass",
         "regulation_cited": "EQA 1974, Schedule 10, Standard B", "action_required": None}
    ],
    "critical_failures": 0,
    "warnings": 0,
    "summary_bm": "Semua parameter lulus semakan pematuhan.",
    "summary_en": "All parameters passed compliance check."
}

MOCK_HISTORICAL = {
    "cases_found": 2,
    "cases": [
        {"site": "Lumut IAC Deposit", "clay_type": "laterite",
         "lixiviant": "ammonium sulfate", "yield_pct": 65.0,
         "compliance_status": "passed", "key_lesson": "Low thorium mobilization"}
    ],
    "summary": "2 historical cases found in Perak with similar laterite profile."
}


# ── Integration Tests ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_agent0_routes_deposit_to_full_pipeline():
    """Agent 0 should classify a deposit profile as full_pipeline."""
    with patch("agents.agent0_router.call_glm", new_callable=AsyncMock) as mock:
        mock.return_value = {"output": "full_pipeline", "reasoning": "", "tool_calls": []}
        from agents.agent0_router import route_request
        result = await route_request(str(SAMPLE_DEPOSIT))
        assert result == "full_pipeline"


@pytest.mark.asyncio
async def test_agent1_returns_structured_context():
    """Agent 1 should return structured historical context from graph."""
    with patch("agents.agent1_historian.query_historical_cases", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_HISTORICAL["cases"]
        from agents.agent1_historian import get_historical_context
        result = await get_historical_context(SAMPLE_DEPOSIT)
        assert "cases_found" in result
        assert "cases" in result
        assert "summary" in result
        assert result["cases_found"] >= 0


@pytest.mark.asyncio
async def test_agent2_structures_flowsheet_output():
    """Agent 2 should return a structured flowsheet dict from GLM response."""
    import json
    mock_glm_output = json.dumps(MOCK_FLOWSHEET)

    with patch("agents.agent2_chemist.stream_glm") as mock_stream:
        async def fake_stream(*args, **kwargs):
            yield {"type": "reasoning", "text": "Analysing deposit profile..."}
            yield {"type": "output", "text": mock_glm_output}
            yield {"type": "done", "output": mock_glm_output, "reasoning": "step by step"}
        mock_stream.return_value = fake_stream()

        from agents.agent2_chemist import run_chemist
        chunks = []
        async for chunk in run_chemist(SAMPLE_DEPOSIT, MOCK_HISTORICAL):
            chunks.append(chunk)

        done_chunk = next((c for c in chunks if c.get("type") == "done"), None)
        assert done_chunk is not None
        flowsheet = done_chunk.get("flowsheet", {})
        assert "lixiviant" in flowsheet
        assert "pH_range" in flowsheet
        assert "predicted_yield_pct" in flowsheet


@pytest.mark.asyncio
async def test_agent4_returns_compliance_result():
    """Agent 4 should return pass/fail compliance dict from GLM response."""
    import json
    with patch("agents.agent4_compliance.call_glm", new_callable=AsyncMock) as mock:
        mock.return_value = {
            "output": json.dumps(MOCK_COMPLIANCE),
            "reasoning": "",
            "tool_calls": []
        }
        from agents.agent4_compliance import check_compliance
        result = await check_compliance(MOCK_FLOWSHEET)
        assert "overall_status" in result
        assert "checks" in result
        assert "critical_failures" in result
        assert result["overall_status"] in ["pass", "fail", "error"]


@pytest.mark.asyncio
async def test_agent3_returns_iteration_table():
    """Agent 3 should return iteration table with best iteration."""
    with patch("agents.agent3_optimizer._store_iterations", new_callable=AsyncMock):
        from agents.agent3_optimizer import run_optimizer
        result = await run_optimizer(MOCK_FLOWSHEET, {})
        assert "iterations" in result
        assert "best_iteration" in result
        assert len(result["iterations"]) > 0
        assert result["best_iteration"]["thorium_ppm"] < 1.0


@pytest.mark.asyncio
async def test_agent5_assembles_report():
    """Agent 5 should return a structured report with all required fields."""
    import json

    mock_report = {
        "report_id": "EM-20260421-1234",
        "generated_at": "2026-04-21T08:00:00",
        "executive_summary_bm": "Laporan untuk Bukit Merah, Perak.",
        "executive_summary_en": "Report for Bukit Merah, Perak.",
        "deposit_summary": {"location": "Bukit Merah, Perak", "clay_type": "laterite",
                            "ree_grade": "0.08", "state": "Perak"},
        "recommended_flowsheet": {"lixiviant": "ammonium sulfate", "pH_range": "4.0-4.5",
                                   "predicted_yield_pct": 68.0, "sfiles_string": "IAC_Clay_Feed-..."},
        "compliance": {"overall_status": "pass", "critical_failures": 0, "checks_summary": ""},
        "risks": {"thorium_risk": "medium", "thorium_mitigation": "", "esg_flags": []},
        "next_steps": ["Conduct laboratory test", "Submit EIA to DOE"],
        "confidence": "high"
    }

    with patch("agents.agent5_reporter.call_glm", new_callable=AsyncMock) as mock:
        mock.return_value = {
            "output": json.dumps(mock_report),
            "reasoning": "",
            "tool_calls": []
        }
        from agents.agent5_reporter import generate_report
        result = await generate_report(SAMPLE_DEPOSIT, MOCK_FLOWSHEET, MOCK_COMPLIANCE, MOCK_HISTORICAL)
        assert "report_id" in result
        assert "executive_summary_en" in result
        assert "recommended_flowsheet" in result
        assert "compliance" in result
        assert "next_steps" in result