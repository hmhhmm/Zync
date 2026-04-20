import json
from typing import AsyncGenerator
from agents.base_agent import stream_glm, call_glm_with_tools
from prompts.agent2_prompt import CHEMIST_PROMPT
from tools.lixiviant_kb import lookup_lixiviant, LIXIVIANT_TOOL_DEFINITION
from tools.sfiles_formatter import validate_sfiles


async def run_chemist(
    deposit_profile: dict,
    historical_context: dict,
) -> AsyncGenerator[dict, None]:
    """
    Agent 2 — The Chemist (Priority 1)

    Streams reasoning token by token so the frontend can display
    GLM's chemistry thinking live on screen — the killer demo feature.

    Yields chunks:
      {"type": "reasoning", "text": "..."}   <- thinking trace (XAI block)
      {"type": "output",    "text": "..."}   <- answer building up
      {"type": "done",      "output": {...}} <- final parsed flowsheet
      {"type": "error",     "message": "..."} <- if something fails
    """

    message = _build_chemist_message(deposit_profile, historical_context)

    full_output = ""

    # Stream GLM's reasoning and answer token by token
    async for chunk in stream_glm(
        system_prompt=CHEMIST_PROMPT,
        user_message=message,
        json_mode=True,
    ):
        if chunk["type"] == "error":
            yield chunk
            return

        if chunk["type"] in ("reasoning", "output"):
            if chunk["type"] == "output":
                full_output += chunk["text"]
            yield chunk  # Forward straight to SSE → frontend

        if chunk["type"] == "done":
            # Parse the final JSON output
            flowsheet = _parse_flowsheet(chunk["output"])

            # Validate SFILES string if present
            if flowsheet.get("sfiles_string"):
                flowsheet["sfiles_valid"] = validate_sfiles(
                    flowsheet["sfiles_string"]
                )

            yield {
                "type":      "done",
                "flowsheet": flowsheet,
                "reasoning": chunk["reasoning"],
            }
            return


async def run_chemist_with_tools(
    deposit_profile: dict,
    historical_context: dict,
) -> dict:
    """
    Non-streaming version that uses function calling to look up
    the lixiviant knowledge base before reasoning.

    Used when streaming is not needed (e.g. inside validation tests).
    """

    message = _build_chemist_message(deposit_profile, historical_context)

    async def tool_executor(tool_name: str, tool_args: dict) -> str:
        if tool_name == "lookup_lixiviant":
            result = lookup_lixiviant(
                clay_type=tool_args.get("clay_type", ""),
                ree_grade=tool_args.get("ree_grade", ""),
                esg_priority=tool_args.get("esg_priority", "medium"),
            )
            return json.dumps(result)
        return "Tool not found"

    result = await call_glm_with_tools(
        system_prompt=CHEMIST_PROMPT,
        user_message=message,
        tools=[LIXIVIANT_TOOL_DEFINITION],
        tool_executor=tool_executor,
    )

    flowsheet = _parse_flowsheet(result["output"])
    flowsheet["reasoning"] = result["reasoning"]
    return flowsheet


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _build_chemist_message(deposit_profile: dict, historical_context: dict) -> str:
    cases_text = "No historical cases found — reason from first principles."

    if historical_context.get("cases_found", 0) > 0:
        cases = historical_context.get("cases", [])
        cases_text = "\n".join([
            f"- {c.get('site', 'Unknown site')}: "
            f"{c.get('lixiviant')} at pH {c.get('pH_range')}, "
            f"yield {c.get('yield_pct')}%, "
            f"compliance: {c.get('compliance_status')}. "
            f"Lesson: {c.get('key_lesson')}"
            for c in cases
        ])

    return f"""
DEPOSIT PROFILE
===============
Location  : {deposit_profile.get('location', 'Unknown')}
State     : {deposit_profile.get('state', 'Unknown')}
Clay type : {deposit_profile.get('clay_type', 'Unknown')}
REE grade : {deposit_profile.get('ree_grade', 'Unknown')} %
Depth (m) : {deposit_profile.get('depth_m', 'Unknown')}
Iron oxide: {deposit_profile.get('iron_oxide_pct', 'Unknown')} %
ESG notes : {deposit_profile.get('esg_notes', 'None')}

HISTORICAL CONTEXT FROM MALAYSIAN RECORDS
==========================================
{cases_text}

Historical summary: {historical_context.get('summary', 'N/A')}

TASK
====
Design the optimal leaching flowsheet for this deposit.
Show your step-by-step scientific reasoning.
Output valid JSON matching the specified schema.
"""


def _parse_flowsheet(output: str) -> dict:
    """Safely parse GLM's JSON output into a flowsheet dict."""
    try:
        # Strip markdown code fences if GLM added them
        clean = output.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        return json.loads(clean.strip())
    except (json.JSONDecodeError, IndexError):
        return {
            "error":      "Failed to parse flowsheet JSON",
            "raw_output": output,
            "confidence": "low",
        }