import json
from agents.base_agent import call_glm
from prompts.agent4_prompt import COMPLIANCE_PROMPT
from tools.doe_checker import get_regulations_for_flowsheet


async def check_compliance(flowsheet: dict) -> dict:
    """
    Agent 4 — The Compliance Officer (Priority 2)

    Checks every flowsheet parameter against:
    - AELB radioactivity limits
    - DOE EQA 1974 Schedule 10 discharge standards
    - JMG mineral extraction requirements

    Uses hybrid search to retrieve relevant regulations,
    then GLM reasons over them to produce pass/fail per parameter.
    """

    # Step 1: retrieve relevant regulations via rules lookup
    # In production: hybrid_search.py queries Qdrant with both
    # keyword (exact thresholds) and vector (contextual clauses)
    regulations = get_regulations_for_flowsheet(flowsheet)

    # Step 2: build message with flowsheet + retrieved regulations
    message = f"""
PROPOSED FLOWSHEET PARAMETERS
==============================
Lixiviant         : {flowsheet.get('lixiviant', 'Unknown')}
Concentration (M) : {flowsheet.get('concentration_M', 'Unknown')}
pH range          : {flowsheet.get('pH_range', 'Unknown')}
Temperature (°C)  : {flowsheet.get('temperature_C', 'Unknown')}
Thorium risk      : {flowsheet.get('thorium_risk', 'Unknown')}
ESG flag          : {flowsheet.get('esg_flag', False)}
ESG note          : {flowsheet.get('esg_note', 'None')}

RETRIEVED REGULATIONS
=====================
{json.dumps(regulations, indent=2)}

TASK
====
Check each parameter against the regulations above.
Return structured JSON with pass/fail for every parameter.
Cite the exact regulation for each check.
"""

    result = await call_glm(
        system_prompt=COMPLIANCE_PROMPT,
        user_message=message,
        json_mode=True,
    )

    try:
        return json.loads(result["output"])
    except (json.JSONDecodeError, KeyError):
        return {
            "overall_status":   "error",
            "checks":           [],
            "critical_failures": 0,
            "warnings":         0,
            "summary_bm":       "Ralat semasa semakan pematuhan.",
            "summary_en":       "Error during compliance check.",
        }