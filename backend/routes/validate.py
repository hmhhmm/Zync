import json
import os
from fastapi import APIRouter
from schemas.input_schema import ValidationRequest
from agents.agent2_chemist import run_chemist_with_tools
from agents.agent4_compliance import check_compliance

router = APIRouter()

_TESTS_PATH = os.path.join(
    os.path.dirname(__file__), "../../data/validation/known_answers.json"
)


@router.post("/validate")
async def run_validation(body: ValidationRequest):
    """
    Runs the 5 Known Answer Tests against Zync agents.

    Each test has a published ground truth from Malaysian REE literature.
    GLM's answer is compared against the known correct answer.
    Returns pass/fail per test — used on the validation judging slide.
    """
    tests = _load_tests()

    if body.test_ids:
        tests = [t for t in tests if t["id"] in body.test_ids]

    results = []
    for test in tests:
        result = await _run_single_test(test)
        results.append(result)

    passed   = sum(1 for r in results if r["status"] == "pass")
    failed   = sum(1 for r in results if r["status"] == "fail")
    edge     = sum(1 for r in results if r["status"] == "edge_case")

    return {
        "total":   len(results),
        "passed":  passed,
        "failed":  failed,
        "edge_cases": edge,
        "results": results,
    }


async def _run_single_test(test: dict) -> dict:
    """Run one known answer test and return pass/fail with GLM's answer."""
    try:
        test_type = test.get("type", "chemistry")

        if test_type == "chemistry":
            flowsheet = await run_chemist_with_tools(
                deposit_profile=test["input"],
                historical_context={"cases_found": 0, "cases": [], "summary": ""},
            )
            glm_answer = (
                f"{flowsheet.get('lixiviant', '?')} "
                f"at pH {flowsheet.get('pH_range', '?')}"
            )

        elif test_type == "compliance":
            compliance = await check_compliance(test["input"])
            glm_answer = compliance.get("overall_status", "unknown")

        else:
            glm_answer = "unsupported test type"

        # Simple string match check — can be made smarter
        ground_truth = test["ground_truth"].lower()
        answer_lower = glm_answer.lower()

        if test.get("insufficient_data_expected"):
            status = "edge_case" if "insufficient" in answer_lower or "low" in answer_lower else "fail"
        elif any(kw in answer_lower for kw in ground_truth.split(",")):
            status = "pass"
        else:
            status = "fail"

        return {
            "test_id":      test["id"],
            "scenario":     test["scenario"],
            "question":     test["question"],
            "ground_truth": test["ground_truth"],
            "glm_answer":   glm_answer,
            "status":       status,
            "source":       test.get("source", ""),
            "notes":        test.get("notes"),
        }

    except Exception as e:
        return {
            "test_id":      test.get("id", "unknown"),
            "scenario":     test.get("scenario", ""),
            "question":     test.get("question", ""),
            "ground_truth": test.get("ground_truth", ""),
            "glm_answer":   f"Error: {str(e)}",
            "status":       "fail",
            "source":       "",
        }


def _load_tests() -> list:
    try:
        with open(_TESTS_PATH) as f:
            return json.load(f)
    except Exception:
        return _FALLBACK_TESTS


_FALLBACK_TESTS = [
    {
        "id":       "test_001",
        "type":     "chemistry",
        "scenario": "Laterite clay, Kelantan, REE grade 0.08%",
        "question": "Optimal lixiviant and pH range?",
        "ground_truth": "ammonium sulfate,ph 4.0-4.5",
        "source":   "DOSM 2019 IAC-REE Pilot Study",
        "input": {
            "location": "Kelantan", "state": "Kelantan",
            "clay_type": "laterite", "ree_grade": 0.08,
        },
    },
    {
        "id":       "test_002",
        "type":     "compliance",
        "scenario": "Ammonium sulfate, pH 3.8, thorium risk high",
        "question": "Does this configuration pass AELB compliance?",
        "ground_truth": "fail",
        "source":   "AELB Regulations 1986",
        "input": {
            "lixiviant": "ammonium sulfate", "concentration_M": 0.5,
            "pH_range": "3.5-3.8", "temperature_C": 25,
            "thorium_risk": "high", "esg_flag": True,
        },
    },
    {
        "id":       "test_003",
        "type":     "chemistry",
        "scenario": "Smectite clay, Pahang, REE grade 0.05%, high ESG priority",
        "question": "Best low-risk lixiviant option?",
        "ground_truth": "magnesium sulfate,sodium sulfate",
        "source":   "MOSTI REE Processing Guidelines 2022",
        "input": {
            "location": "Pahang", "state": "Pahang",
            "clay_type": "smectite", "ree_grade": 0.05,
            "esg_priority": "high",
        },
    },
    {
        "id":       "test_004",
        "type":     "compliance",
        "scenario": "Magnesium sulfate, pH 4.8, thorium risk low",
        "question": "Does this configuration pass all regulations?",
        "ground_truth": "pass",
        "source":   "DOE EQA 1974, AELB Regulations 1986",
        "input": {
            "lixiviant": "magnesium sulfate", "concentration_M": 0.5,
            "pH_range": "4.5-5.0", "temperature_C": 25,
            "thorium_risk": "low", "esg_flag": False,
        },
    },
    {
        "id":       "test_005",
        "type":     "chemistry",
        "scenario": "Unknown clay type, incomplete geological data",
        "question": "Can Zync make a confident recommendation?",
        "ground_truth": "low confidence,insufficient",
        "insufficient_data_expected": True,
        "source":   "Zync XAI validation — edge case handling",
        "notes":    "GLM should flag insufficient data rather than hallucinating",
        "input": {
            "location": "Unknown", "state": "Unknown",
            "clay_type": "unknown", "ree_grade": 0.0,
        },
    },
]