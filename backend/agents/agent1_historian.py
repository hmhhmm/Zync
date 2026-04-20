import json
from agents.base_agent import call_glm
from prompts.agent1_prompt import HISTORIAN_PROMPT
from rag.graph_rag import query_historical_cases


async def get_historical_context(deposit_profile: dict) -> dict:
    """
    Retrieves relevant historical Malaysian REE processing cases.
    Queries Neo4j first; falls back to GLM reasoning if no records found.
    """
    neo4j_cases = await query_historical_cases(deposit_profile)

    if neo4j_cases:
        cases_block = json.dumps(neo4j_cases, indent=2)
        knowledge_section = f"Historical cases retrieved from knowledge graph:\n{cases_block}"
    else:
        knowledge_section = "No historical cases found in knowledge graph. Reason from your training knowledge."

    message = f"""
Deposit profile submitted by operator:

Location  : {deposit_profile.get('location', 'Unknown')}
State     : {deposit_profile.get('state', 'Unknown')}
Clay type : {deposit_profile.get('clay_type', 'Unknown')}
REE grade : {deposit_profile.get('ree_grade', 'Unknown')}
Depth (m) : {deposit_profile.get('depth_m', 'Unknown')}
Area (ha) : {deposit_profile.get('area_ha', 'Unknown')}
Notes     : {deposit_profile.get('notes', 'None')}

{knowledge_section}

Summarise the relevant historical cases and extract key lessons for this deposit profile.
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