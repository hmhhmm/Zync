import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))


def validate_deposit_profile(profile: dict) -> dict:
    """
    Input validation guardrails for deposit profiles.
    Returns {"valid": bool, "errors": list}
    """
    errors = []

    ree_grade = profile.get("ree_grade")
    if ree_grade is None:
        errors.append("ree_grade is required")
    elif not isinstance(ree_grade, (int, float)) or ree_grade < 0:
        errors.append("ree_grade must be a positive number")
    elif ree_grade > 10:
        errors.append("ree_grade above 10% is unrealistic for REE deposits")

    state = profile.get("state", "")
    valid_states = [
        "Kelantan", "Pahang", "Perak", "Selangor", "Johor",
        "Terengganu", "Sabah", "Sarawak", "Kedah", "Perlis",
        "Negeri Sembilan", "Unknown"
    ]
    if state and state not in valid_states:
        errors.append(f"state '{state}' is not a recognised Malaysian state")

    depth = profile.get("depth_m")
    if depth is not None and depth < 0:
        errors.append("depth_m cannot be negative")

    iron_oxide = profile.get("iron_oxide_pct")
    if iron_oxide is not None and (iron_oxide < 0 or iron_oxide > 100):
        errors.append("iron_oxide_pct must be between 0 and 100")

    esg = profile.get("esg_priority", "medium")
    if esg not in ["low", "medium", "high"]:
        errors.append("esg_priority must be low, medium, or high")

    return {"valid": len(errors) == 0, "errors": errors}


def validate_flowsheet_params(params: dict) -> dict:
    """Guardrails for flowsheet parameters before compliance check."""
    errors = []

    ph_range = params.get("pH_range", "")
    if ph_range:
        try:
            parts = ph_range.replace(" ", "").split("-")
            low, high = float(parts[0]), float(parts[1])
            if low < 0 or high < 0:
                errors.append("pH cannot be negative")
            if low > 14 or high > 14:
                errors.append("pH cannot exceed 14")
            if low > high:
                errors.append("pH lower bound cannot exceed upper bound")
        except Exception:
            errors.append("pH_range format must be e.g. 4.0-4.5")

    temp = params.get("temperature_C")
    if temp is not None:
        if temp < 0:
            errors.append("temperature_C cannot be negative")
        if temp > 100:
            errors.append("temperature_C above 100 is unrealistic for heap leaching")

    conc = params.get("concentration_M")
    if conc is not None and conc < 0:
        errors.append("concentration_M cannot be negative")

    return {"valid": len(errors) == 0, "errors": errors}


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_valid_deposit_profile_passes():
    profile = {
        "location": "Bukit Merah, Perak", "state": "Perak",
        "clay_type": "laterite", "ree_grade": 0.08,
        "depth_m": 8.5, "esg_priority": "medium"
    }
    result = validate_deposit_profile(profile)
    assert result["valid"] is True
    assert result["errors"] == []


def test_negative_ree_grade_rejected():
    result = validate_deposit_profile({"ree_grade": -0.5, "state": "Perak"})
    assert result["valid"] is False
    assert any("ree_grade" in e for e in result["errors"])


def test_unrealistic_ree_grade_rejected():
    result = validate_deposit_profile({"ree_grade": 99.0, "state": "Perak"})
    assert result["valid"] is False
    assert any("unrealistic" in e for e in result["errors"])


def test_invalid_state_rejected():
    result = validate_deposit_profile({"ree_grade": 0.08, "state": "California"})
    assert result["valid"] is False
    assert any("state" in e for e in result["errors"])


def test_negative_depth_rejected():
    result = validate_deposit_profile({"ree_grade": 0.08, "state": "Perak", "depth_m": -5.0})
    assert result["valid"] is False
    assert any("depth" in e for e in result["errors"])


def test_valid_flowsheet_params_pass():
    params = {"pH_range": "4.0-4.5", "temperature_C": 25, "concentration_M": 0.5}
    result = validate_flowsheet_params(params)
    assert result["valid"] is True


def test_negative_pH_rejected():
    result = validate_flowsheet_params({"pH_range": "-1.0-4.5"})
    assert result["valid"] is False
    assert any("pH" in e for e in result["errors"])


def test_pH_above_14_rejected():
    result = validate_flowsheet_params({"pH_range": "4.0-15.0"})
    assert result["valid"] is False


def test_temperature_above_100_rejected():
    result = validate_flowsheet_params({"pH_range": "4.0-4.5", "temperature_C": 150})
    assert result["valid"] is False
    assert any("temperature" in e for e in result["errors"])


def test_negative_concentration_rejected():
    result = validate_flowsheet_params({"pH_range": "4.0-4.5", "concentration_M": -0.5})
    assert result["valid"] is False