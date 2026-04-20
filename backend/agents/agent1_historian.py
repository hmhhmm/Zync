import json
from agents.base_agent import call_glm
from prompts.agent1_prompt import HISTORIAN_PROMPT


async def get_historical_context(deposit_profile: dict) -> dict:
    """
    Retrieves relevant historical Malaysian REE processing cases.

    In production: queries Neo4j knowledge graph via graph_rag.py
    For MVP: GLM reasons from its training knowledge + any seeded data

    Returns structured dict with historical cases and summary.
    """

    message = f"""
Deposit profile submitted by operator:

Location  : {deposit_profile.get('location', 'Unknown')}
State     : {deposit_profile.get('state', 'Unknown')}
Clay type : {deposit_profile.get('clay_type', 'Unknown')}
REE grade : {deposit_profile.get('ree_grade', 'Unknown')}
Depth (m) : {deposit_profile.get('depth_m', 'Unknown')}
Area (ha) : {deposit_profile.get('area_ha', 'Unknown')}
Notes     : {deposit_profile.get('notes', 'None')}

Search the knowledge graph for historical Malaysian REE processing cases
that are relevant to this deposit profile. Return all matching cases.
"""

    result = await call_glm(
        system_prompt=HISTORIAN_PROMPT,
        user_message=message,
        json_mode=True,
    )

    try:
        return json.loads(result["output"])
    except (json.JSONDecodeError, KeyError):
        # Return safe fallback if parsing fails
        return {
            "cases_found": 0,
            "cases": [],
            "summary": "No historical data retrieved. Agent 2 will reason from first principles.",
        }