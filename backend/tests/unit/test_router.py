import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from unittest.mock import AsyncMock, patch


# ── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_router_classifies_full_pipeline():
    """Deposit profile submission should route to full_pipeline."""
    with patch("agents.agent0_router.call_glm", new_callable=AsyncMock) as mock:
        mock.return_value = {"output": "full_pipeline", "reasoning": "", "tool_calls": []}
        from agents.agent0_router import route_request
        result = await route_request("Deposit at Kelantan, laterite clay, REE grade 0.08%")
        assert result == "full_pipeline"


@pytest.mark.asyncio
async def test_router_classifies_diagnosis_only():
    """Yield drop question should route to diagnosis_only."""
    with patch("agents.agent0_router.call_glm", new_callable=AsyncMock) as mock:
        mock.return_value = {"output": "diagnosis_only", "reasoning": "", "tool_calls": []}
        from agents.agent0_router import route_request
        result = await route_request("My yield dropped from 72% to 51% after rain")
        assert result == "diagnosis_only"


@pytest.mark.asyncio
async def test_router_classifies_compliance_check():
    """Regulatory question should route to compliance_check."""
    with patch("agents.agent0_router.call_glm", new_callable=AsyncMock) as mock:
        mock.return_value = {"output": "compliance_check", "reasoning": "", "tool_calls": []}
        from agents.agent0_router import route_request
        result = await route_request("Is ammonium sulfate at pH 3.8 compliant with AELB?")
        assert result == "compliance_check"


@pytest.mark.asyncio
async def test_router_defaults_to_full_pipeline_on_unknown():
    """Unknown GLM output should safely default to full_pipeline."""
    with patch("agents.agent0_router.call_glm", new_callable=AsyncMock) as mock:
        mock.return_value = {"output": "something_unexpected", "reasoning": "", "tool_calls": []}
        from agents.agent0_router import route_request
        result = await route_request("some ambiguous input")
        assert result == "full_pipeline"


@pytest.mark.asyncio
async def test_router_classifies_validation():
    """Validation request should route to validation."""
    with patch("agents.agent0_router.call_glm", new_callable=AsyncMock) as mock:
        mock.return_value = {"output": "validation", "reasoning": "", "tool_calls": []}
        from agents.agent0_router import route_request
        result = await route_request("Run the known answer validation tests")
        assert result == "validation"