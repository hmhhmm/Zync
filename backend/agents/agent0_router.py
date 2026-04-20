from agents.base_agent import call_glm
from prompts.agent0_prompt import ROUTER_PROMPT

VALID_ROUTES = ["full_pipeline", "diagnosis_only", "compliance_check", "validation"]


async def route_request(user_input: str) -> str:
    """
    Reads operator input and returns a routing decision.
    Returns one of: full_pipeline | diagnosis_only | compliance_check | validation
    """
    message = f"Classify this operator request and return the route:\n\n{user_input}"

    result = await call_glm(
        system_prompt=ROUTER_PROMPT,
        user_message=message,
    )

    route = result["output"].strip().lower().replace('"', '').replace("'", "")

    # Sanitise — if GLM returns something unexpected, default to full_pipeline
    if route not in VALID_ROUTES:
        return "full_pipeline"

    return route