"""
Live ILMU integration tests — requires ILMU_API_KEY in .env
Run separately:
    pytest tests/integration/test_pipeline_live.py -v -s

These tests cost real API tokens and take 30-60 seconds each.
Run them once after getting your API key to verify end-to-end.
"""
import pytest
import os
import sys
import json
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from dotenv import load_dotenv
load_dotenv()

# Skip entire file if no API key set
pytestmark = pytest.mark.skipif(
    not os.getenv("ILMU_API_KEY"),
    reason="ILMU_API_KEY not set — skipping live ILMU tests"
)

SAMPLE_DEPOSIT = {
    "location": "Bukit Merah, Perak",
    "state": "Perak",
    "clay_type": "laterite",
    "ree_grade": 0.08,
    "depth_m": 8.5,
    "esg_priority": "medium",
    "esg_notes": "Site is 800m from Sungai Perak",
}

MOCK_HISTORICAL = {
    "cases_found": 1,
    "cases": [
        {
            "site": "Lumut IAC Deposit",
            "clay_type": "laterite",
            "lixiviant": "ammonium sulfate",
            "concentration": "0.5M",
            "pH_range": "4.0-4.5",
            "temperature_C": 25,
            "yield_pct": 65.0,
            "compliance_status": "passed",
            "key_lesson": "Low thorium mobilization at pH 4.0-4.5",
            "source": "UTP REE Pilot Study Perak 2023"
        }
    ],
    "summary": "1 historical case found in Perak with similar laterite profile."
}


# ── Live Tests ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_live_agent0_router():
    """
    LIVE: Agent 0 calls real GLM and classifies a deposit profile.
    Expected: returns one of the 4 valid routes.
    """
    from agents.agent0_router import route_request

    result = await route_request(
        "I have a laterite clay deposit in Kelantan with REE grade 0.08%. "
        "I need a full flowsheet analysis."
    )

    valid_routes = ["full_pipeline", "diagnosis_only", "compliance_check", "validation"]
    assert result in valid_routes, f"Unexpected route: {result}"
    print(f"\n  Agent 0 routed to: {result}")


@pytest.mark.asyncio
async def test_live_agent2_chemist_streaming():
    """
    LIVE: Agent 2 calls ILMU with streaming.
    Expected:
    - output chunks stream live (reasoning_content not available on nemo-super)
    - final flowsheet has required fields
    - confidence is not empty
    """
    from agents.agent2_chemist import run_chemist

    reasoning_chunks = []
    flowsheet = {}

    async for chunk in run_chemist(SAMPLE_DEPOSIT, MOCK_HISTORICAL):
        if chunk["type"] == "error":
            pytest.fail(f"GLM streaming error: {chunk['message']} — check GLM_API_KEY and GLM_MODEL in .env")
        elif chunk["type"] == "reasoning":
            reasoning_chunks.append(chunk["text"])
        elif chunk["type"] == "done":
            flowsheet = chunk.get("flowsheet", {})

    # Must have streamed some reasoning (requires a thinking model: glm-z1-flash or glm-z1-plus)
    # nemo-super streams output only — reasoning_content is not exposed by ILMU
    print(f"  Reasoning chunks: {len(reasoning_chunks)} (0 expected with nemo-super)")

    # Must have a valid flowsheet
    assert "lixiviant" in flowsheet, f"Missing lixiviant in flowsheet: {flowsheet}"
    assert "pH_range" in flowsheet, f"Missing pH_range in flowsheet: {flowsheet}"
    assert "predicted_yield_pct" in flowsheet, f"Missing yield in flowsheet: {flowsheet}"
    assert "confidence" in flowsheet, f"Missing confidence in flowsheet: {flowsheet}"
    assert "reasoning_steps" in flowsheet, f"Missing reasoning_steps: {flowsheet}"

    print(f"\n  Lixiviant: {flowsheet.get('lixiviant')}")
    print(f"  pH range: {flowsheet.get('pH_range')}")
    print(f"  Predicted yield: {flowsheet.get('predicted_yield_pct')}%")
    print(f"  Confidence: {flowsheet.get('confidence')}")
    print(f"  Reasoning chunks received: {len(reasoning_chunks)}")


@pytest.mark.asyncio
async def test_live_agent4_compliance():
    """
    LIVE: Agent 4 calls real GLM to check a known-safe flowsheet.
    Expected: magnesium sulfate at pH 4.5-5.0 should pass compliance.
    """
    from agents.agent4_compliance import check_compliance

    safe_flowsheet = {
        "lixiviant": "magnesium sulfate",
        "concentration_M": 0.5,
        "pH_range": "4.5-5.0",
        "temperature_C": 25,
        "thorium_risk": "low",
        "esg_flag": False,
        "esg_note": "",
    }

    result = await check_compliance(safe_flowsheet)

    assert "overall_status" in result, f"Missing overall_status: {result}"
    assert "checks" in result, f"Missing checks: {result}"
    assert "summary_en" in result, f"Missing summary_en: {result}"

    print(f"\n  Compliance status: {result.get('overall_status')}")
    print(f"  Critical failures: {result.get('critical_failures')}")
    print(f"  Summary: {result.get('summary_en')}")


@pytest.mark.asyncio
async def test_live_agent4_compliance_fails_low_pH():
    """
    LIVE: Agent 4 should flag ammonium sulfate at pH 3.5-3.8 as a compliance failure.
    Expected: overall_status = fail, critical_failures > 0
    """
    from agents.agent4_compliance import check_compliance

    risky_flowsheet = {
        "lixiviant": "ammonium sulfate",
        "concentration_M": 0.5,
        "pH_range": "3.5-3.8",
        "temperature_C": 25,
        "thorium_risk": "high",
        "esg_flag": True,
        "esg_note": "pH below 4.0 — thorium co-extraction risk exceeds AELB limit",
    }

    result = await check_compliance(risky_flowsheet)

    assert "overall_status" in result
    assert result.get("overall_status") == "fail", (
        f"Expected fail but got {result.get('overall_status')} — "
        f"GLM may not be flagging low pH correctly"
    )

    print(f"\n  Compliance status: {result.get('overall_status')}")
    print(f"  Critical failures: {result.get('critical_failures')}")


@pytest.mark.asyncio
async def test_live_validation_endpoint():
    """
    LIVE: Full validation endpoint — runs all 5 known answer tests with real GLM.
    Expected: at least 3 out of 5 pass (allowing for test_001 which is unverified).
    """
    from routes.validate import run_validation
    from schemas.input_schema import ValidationRequest

    request = ValidationRequest(test_ids=None)
    result = await run_validation(request)

    assert "total" in result
    assert "passed" in result
    assert result["total"] == 5

    pass_rate = result["passed"] / result["total"]

    print(f"\n  Validation results: {result['passed']}/{result['total']} passed")
    for r in result.get("results", []):
        status_symbol = "✓" if r["status"] == "pass" else "✗" if r["status"] == "fail" else "~"
        print(f"  {status_symbol} {r['test_id']}: {r['status']}")
        print(f"    GLM answer: {r['glm_answer']}")
        print(f"    Ground truth: {r['ground_truth']}")

    assert pass_rate >= 0.6, (
        f"Only {result['passed']}/5 tests passed — "
        f"GLM reasoning may need prompt tuning"
    )


@pytest.mark.asyncio
async def test_live_agent_diagnosis():
    """
    LIVE: Diagnosis agent streams reasoning and returns a card from real sensor data.
    Expected: reasoning chunks received, card has root_cause, confidence, primary_action.
    """
    from agents.agent_diagnosis import run_diagnosis

    reasoning_chunks = []
    diagnosis = {}

    async for chunk in run_diagnosis(
        ph_readings=[4.2, 4.1, 3.8, 3.5, 3.3],
        temperature=[25, 25, 26, 26, 27],
        yield_pct=[65, 62, 58, 51, 43],
        operator_notes="Yield dropped from 65% to 43% over 5 days. pH trending downward.",
        log_image_b64=None,
    ):
        if chunk["type"] == "error":
            pytest.fail(f"GLM streaming error: {chunk['message']} — check GLM_API_KEY and GLM_MODEL in .env")
        elif chunk["type"] == "reasoning":
            reasoning_chunks.append(chunk["text"])
        elif chunk["type"] == "done":
            diagnosis = chunk.get("diagnosis", {})

    print(f"  Reasoning chunks: {len(reasoning_chunks)} (0 expected with nemo-super)")
    assert "error" not in diagnosis or len(diagnosis) > 1, f"Diagnosis card parse error: {diagnosis}"
    assert "root_cause" in diagnosis, f"Missing root_cause: {diagnosis}"
    assert "confidence" in diagnosis, f"Missing confidence: {diagnosis}"
    assert "primary_action" in diagnosis, f"Missing primary_action: {diagnosis}"

    print(f"\n  Root cause: {diagnosis.get('root_cause')}")
    print(f"  Confidence: {diagnosis.get('confidence')}")
    print(f"  Primary action: {diagnosis.get('primary_action')}")
    print(f"  Reasoning chunks received: {len(reasoning_chunks)}")


@pytest.mark.asyncio
async def test_live_agent6_zone_prioritiser():
    """
    LIVE: Agent 6 streams zone analysis reasoning and returns a ranked recommendation.
    Expected: reasoning chunks, step chunks, final result with recommended zone.
    """
    from agents.agent6_zone_prioritiser import run_zone_prioritiser

    SAMPLE_ZONES = [
        {
            "name": "Zone A", "ree_grade_ppm": 850, "hree_proportion_pct": 65,
            "river_proximity_m": 650, "road_access": "sealed",
            "distance_to_facility_km": 12, "area_ha": 45,
            "notes": "High HREE, good access",
        },
        {
            "name": "Zone B", "ree_grade_ppm": 620, "hree_proportion_pct": 28,
            "river_proximity_m": 350, "road_access": "moderate",
            "distance_to_facility_km": 25, "area_ha": 30,
            "notes": "Moderate grade, moderate access",
        },
        {
            "name": "Zone C", "ree_grade_ppm": 430, "hree_proportion_pct": 15,
            "river_proximity_m": 180, "road_access": "forest track",
            "distance_to_facility_km": 40, "area_ha": 20,
            "notes": "Low grade, near river — likely deferred",
        },
    ]

    reasoning_chunks = []
    step_chunks = []
    result = {}

    async for chunk in run_zone_prioritiser("Gua Musang IAC Field", "Kelantan", SAMPLE_ZONES):
        if chunk["type"] == "error":
            pytest.fail(f"GLM streaming error: {chunk['message']} — check GLM_API_KEY and GLM_MODEL in .env")
        elif chunk["type"] == "reasoning":
            reasoning_chunks.append(chunk["text"])
        elif chunk["type"] == "step":
            step_chunks.append(chunk["text"])
        elif chunk["type"] == "done":
            result = chunk.get("result", {})

    print(f"  Reasoning chunks: {len(reasoning_chunks)} (0 expected with nemo-super)")
    assert "error" not in result or len(result) > 1, f"Result parse error: {result}"
    # Accept either schema variant (recommended/secondary/deferred or ranked_zones)
    has_result = "recommended" in result or "ranked_zones" in result
    assert has_result, f"Missing recommendation structure in result: {result}"

    top = result.get("recommended", {}).get("zone") or result.get("top_zone", "N/A")
    print(f"\n  Recommended zone: {top}")
    print(f"  Reasoning chunks: {len(reasoning_chunks)}")
    print(f"  Step chunks: {len(step_chunks)}")


@pytest.mark.asyncio
async def test_live_full_pipeline_smoke():
    """
    LIVE: Full end-to-end pipeline smoke test.
    Runs all 6 agents in sequence with a real deposit profile.
    Expected: all agents complete, final report has required fields.
    Takes 60-90 seconds.
    """
    from agents.agent0_router import route_request
    from agents.agent1_historian import get_historical_context
    from agents.agent2_chemist import run_chemist
    from agents.agent3_optimizer import run_optimizer
    from agents.agent4_compliance import check_compliance
    from agents.agent5_reporter import generate_report

    print("\n  Running full pipeline smoke test...")

    # Agent 0
    route = await route_request(str(SAMPLE_DEPOSIT))
    assert route in ["full_pipeline", "diagnosis_only", "compliance_check", "validation"]
    print(f"  Agent 0 ✓ — routed to: {route}")

    # Agent 1
    historical = await get_historical_context(SAMPLE_DEPOSIT)
    assert "cases_found" in historical
    print(f"  Agent 1 ✓ — {historical['cases_found']} historical cases found")

    # Agent 2
    flowsheet = {}
    async for chunk in run_chemist(SAMPLE_DEPOSIT, historical):
        if chunk["type"] == "done":
            flowsheet = chunk.get("flowsheet", {})
    assert "lixiviant" in flowsheet
    assert "pH_range" in flowsheet
    print(f"  Agent 2 ✓ — flowsheet: {flowsheet.get('lixiviant')} pH {flowsheet.get('pH_range')}")

    # Agent 3
    optimization = await run_optimizer(flowsheet, {})
    assert "iterations" in optimization
    assert len(optimization["iterations"]) > 0
    print(f"  Agent 3 ✓ — {len(optimization['iterations'])} iterations")

    # Agent 4
    compliance = await check_compliance(flowsheet)
    assert "overall_status" in compliance
    print(f"  Agent 4 ✓ — compliance: {compliance.get('overall_status')}")

    # Agent 5
    report = await generate_report(SAMPLE_DEPOSIT, flowsheet, compliance, historical)
    assert "report_id" in report
    assert "executive_summary_en" in report
    assert "recommended_flowsheet" in report
    assert "next_steps" in report
    print(f"  Agent 5 ✓ — report ID: {report.get('report_id')}")
    print(f"\n  Full pipeline smoke test PASSED")