import json
from typing import AsyncGenerator
from agents.base_agent import stream_glm
from prompts.agent6_prompt import ZONE_PRIORITISER_PROMPT


async def run_zone_prioritiser(
    location: str,
    state: str,
    zones: list[dict],
) -> AsyncGenerator[dict, None]:
    """
    Agent 6 — The Zone Prioritiser

    Takes 2–5 zone profiles and streams a ranked investment recommendation.

    Yields chunks (same pattern as Agent 2):
      {"type": "reasoning", "text": "..."}   <- GLM thinking trace
      {"type": "step",      "text": "..."}   <- deliberate step output (right panel)
      {"type": "done",      "result": {...}} <- final ranked recommendation card
      {"type": "error",     "message": "..."}
    """

    message = _build_message(location, state, zones)

    full_output = ""

    async for chunk in stream_glm(
        system_prompt=ZONE_PRIORITISER_PROMPT,
        user_message=message,
        json_mode=True,
    ):
        if chunk["type"] == "error":
            yield chunk
            return

        if chunk["type"] == "reasoning":
            yield chunk  # Live thinking trace → right panel

        if chunk["type"] == "output":
            full_output += chunk["text"]
            yield {"type": "step", "text": chunk["text"]}

        if chunk["type"] == "done":
            result = _parse_result(chunk["output"] or full_output)
            yield {
                "type":   "done",
                "result": result,
            }
            return


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _build_message(location: str, state: str, zones: list[dict]) -> str:
    zone_lines = []
    for z in zones:
        zone_lines.append(
            f"  {z.get('name', 'Zone ?')}:\n"
            f"    REE grade          : {z.get('ree_grade_ppm', 'unknown')} ppm\n"
            f"    HREE proportion    : {z.get('hree_proportion_pct', 'unknown')}%\n"
            f"    River proximity    : {z.get('river_proximity_m', 'unknown')} m\n"
            f"    Road access        : {z.get('road_access', 'unknown')}\n"
            f"    Distance to plant  : {z.get('distance_to_facility_km', 'unknown')} km\n"
            f"    Notes              : {z.get('notes', 'None')}"
        )

    zones_block = "\n".join(zone_lines)

    return f"""
SITE: {location}, {state}
ZONES TO ASSESS: {len(zones)}

ZONE PROFILES
=============
{zones_block}

TASK
====
Analyse all {len(zones)} zones and produce a ranked investment recommendation.

Work through each of the 5 analysis steps in your reasoning:
Step 1 — Extract and validate zone profiles
Step 2 — Apply 13MP HREE strategic priority framework
Step 3 — Assess ESG regulatory exposure (DOE river thresholds)
Step 4 — Evaluate infrastructure and capital efficiency
Step 5 — Generate composite scores and ranked recommendation

Output the final JSON recommendation matching the specified schema.
"""


def _parse_result(output: str) -> dict:
    """Safely parse GLM's JSON recommendation."""
    try:
        clean = output.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        return json.loads(clean.strip())
    except (json.JSONDecodeError, IndexError):
        return {
            "error":      "Failed to parse zone recommendation JSON",
            "raw_output": output,
            "confidence": "LOW",
        }
