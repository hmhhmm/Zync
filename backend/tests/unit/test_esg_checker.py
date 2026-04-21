import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from tools.doe_checker import get_regulations_for_flowsheet, _FALLBACK_RULES


def check_radioactivity(thorium_bq_g: float) -> dict:
    """
    Standalone radioactivity check against AELB limit.
    Limit: 1.0 Bq/g for Th-232 (AELB Regulations 1986, Regulation 26)
    """
    limit = 1.0
    passed = thorium_bq_g < limit
    return {
        "passed":     passed,
        "value":      thorium_bq_g,
        "limit":      limit,
        "unit":       "Bq/g",
        "regulation": "AELB Regulations 1986, Regulation 26",
        "reason":     None if passed else (
            f"Thorium level {thorium_bq_g} Bq/g exceeds AELB limit of {limit} Bq/g"
        ),
    }


def check_discharge_pH(pH: float) -> dict:
    """
    Check discharge pH against DOE EQA 1974 Schedule 10 Standard B.
    Limit: pH must be between 6.0 and 9.0
    """
    passed = 6.0 <= pH <= 9.0
    return {
        "passed":     passed,
        "value":      pH,
        "limit":      "6.0 - 9.0",
        "unit":       "pH",
        "regulation": "EQA 1974, Schedule 10, Standard B",
        "reason":     None if passed else (
            f"Discharge pH {pH} is outside DOE limit of 6.0-9.0"
        ),
    }


def check_ammonium_nitrogen(nh3_n_mg_per_L: float) -> dict:
    """
    Check ammonium nitrogen against DOE EQA 1974 Schedule 10.
    Limit: below 10 mg/L
    """
    limit = 10.0
    passed = nh3_n_mg_per_L < limit
    return {
        "passed":     passed,
        "value":      nh3_n_mg_per_L,
        "limit":      limit,
        "unit":       "mg/L",
        "regulation": "EQA 1974, Schedule 10, Standard B, Parameter NH3-N",
        "reason":     None if passed else (
            f"NH3-N {nh3_n_mg_per_L} mg/L exceeds DOE limit of {limit} mg/L"
        ),
    }


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_radioactivity_above_threshold_fails():
    result = check_radioactivity(1.5)
    assert result["passed"] is False
    assert "AELB" in result["regulation"]
    assert result["reason"] is not None


def test_radioactivity_below_threshold_passes():
    result = check_radioactivity(0.4)
    assert result["passed"] is True
    assert result["reason"] is None


def test_radioactivity_exactly_at_limit_fails():
    """At exactly 1.0 Bq/g should fail — limit is strictly below 1.0."""
    result = check_radioactivity(1.0)
    assert result["passed"] is False


def test_discharge_pH_within_range_passes():
    result = check_discharge_pH(7.0)
    assert result["passed"] is True


def test_discharge_pH_below_range_fails():
    result = check_discharge_pH(4.5)
    assert result["passed"] is False
    assert "DOE" in result["reason"] or "pH" in result["reason"]


def test_discharge_pH_above_range_fails():
    result = check_discharge_pH(10.0)
    assert result["passed"] is False


def test_ammonium_nitrogen_below_limit_passes():
    result = check_ammonium_nitrogen(5.0)
    assert result["passed"] is True


def test_ammonium_nitrogen_above_limit_fails():
    result = check_ammonium_nitrogen(15.0)
    assert result["passed"] is False
    assert "NH3-N" in result["regulation"]


def test_doe_checker_returns_rules_for_ammonium_lixiviant():
    """doe_checker should return ammonium rules when lixiviant is ammonium sulfate."""
    flowsheet = {"lixiviant": "ammonium sulfate", "pH_range": "4.0-4.5", "thorium_risk": "medium"}
    rules = get_regulations_for_flowsheet(flowsheet)
    rule_ids = [r["id"] for r in rules]
    assert "DOE-002" in rule_ids  # ammonium nitrogen rule


def test_doe_checker_always_returns_radioactivity_rule():
    """AELB radioactivity rule should always be returned regardless of lixiviant."""
    flowsheet = {"lixiviant": "magnesium sulfate", "pH_range": "4.5-5.0", "thorium_risk": "low"}
    rules = get_regulations_for_flowsheet(flowsheet)
    rule_ids = [r["id"] for r in rules]
    assert "AELB-001" in rule_ids