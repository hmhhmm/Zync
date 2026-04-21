import json
from agents.base_agent import call_glm
from prompts.agent4_prompt import COMPLIANCE_PROMPT
from rag.hybrid_search import hybrid_search


async def check_compliance(flowsheet: dict) -> dict:
    """
    Agent 4 — The Compliance Officer

    Uses hybrid search (vector + keyword) to retrieve relevant regulations,
    then GLM reasons over them to produce pass/fail per parameter.

    Search strategy:
    - Builds a query from the flowsheet parameters
    - Hybrid search finds both exact thresholds (keyword) and
      contextually related regulations (vector/semantic)
    - GLM receives the retrieved regulations and reasons over them
    """

    # Build search query from flowsheet parameters
    query = _build_search_query(flowsheet)

    # Hybrid search — vector + keyword over regulatory documents
    regulations = await hybrid_search(query, top_k=6)

    # Build message with flowsheet + retrieved regulations
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

REGULATIONS RETRIEVED VIA HYBRID SEARCH
========================================
{json.dumps(regulations, indent=2)}

TASK
====
Check each parameter against the regulations above.
Return structured JSON with pass/fail for every parameter.
Cite the exact regulation name and clause for each check.
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
            "overall_status":    "error",
            "checks":            [],
            "critical_failures": 0,
            "warnings":          0,
            "summary_bm":        "Ralat semasa semakan pematuhan.",
            "summary_en":        "Error during compliance check.",
        }


def _build_search_query(flowsheet: dict) -> str:
    """
    Build a natural language search query from flowsheet parameters.
    This query is embedded and used for semantic search in Qdrant.
    """
    parts = []

    lixiviant = flowsheet.get("lixiviant", "")
    if lixiviant:
        parts.append(f"{lixiviant} discharge regulation")

    thorium_risk = flowsheet.get("thorium_risk", "")
    if thorium_risk in ["medium", "high"]:
        parts.append("thorium radioactivity AELB limit Bq/g")

    pH_range = flowsheet.get("pH_range", "")
    if pH_range:
        try:
            lower = float(pH_range.split("-")[0])
            if lower < 4.0:
                parts.append("low pH thorium co-extraction radioactivity risk")
        except Exception:
            pass

    if "ammonium" in lixiviant.lower():
        parts.append("ammonium nitrogen NH3-N discharge DOE EQA Schedule 10")

    parts.append("Malaysian REE processing environmental compliance DOE AELB JMG")

    return " ".join(parts)