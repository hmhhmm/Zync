import json
from typing import AsyncGenerator
from agents.base_agent import stream_glm
from prompts.agent_diagnosis_prompt import DIAGNOSIS_PROMPT


async def run_diagnosis(
    ph_readings: list,
    temperature: list,
    yield_pct: list,
    operator_notes: str | None,
    log_image_b64: str | None,
) -> AsyncGenerator[dict, None]:
    """
    Decision 1 — Process Diagnosis

    Accepts structured readings and/or a base64 photo of a handwritten log.
    GLM reads the image multimodally, extracts values, identifies the anomaly,
    and streams its reasoning live before outputting the diagnosis card.

    Yields:
      {"type": "reasoning", "text": "..."}   <- live GLM thinking trace
      {"type": "output",    "text": "..."}   <- answer building up
      {"type": "done",      "diagnosis": {}} <- final parsed card
      {"type": "error",     "message": "..."}
    """
    message = _build_message(ph_readings, temperature, yield_pct, operator_notes)

    # Pass image as data URI if provided
    images = None
    if log_image_b64:
        # Accept raw base64 or full data URI
        if not log_image_b64.startswith("data:"):
            log_image_b64 = f"data:image/jpeg;base64,{log_image_b64}"
        images = [log_image_b64]

    full_output = ""

    async for chunk in stream_glm(
        system_prompt=DIAGNOSIS_PROMPT,
        user_message=message,
        images=images,
        json_mode=True,
    ):
        if chunk["type"] == "error":
            yield chunk
            return

        if chunk["type"] == "reasoning":
            yield chunk

        if chunk["type"] == "output":
            full_output += chunk["text"]
            yield chunk

        if chunk["type"] == "done":
            diagnosis = _parse_diagnosis(chunk["output"] or full_output)
            yield {
                "type":      "done",
                "diagnosis": diagnosis,
            }
            return


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _build_message(
    ph_readings: list,
    temperature: list,
    yield_pct: list,
    operator_notes: str | None,
) -> str:
    has_readings = any([ph_readings, temperature, yield_pct])

    readings_block = "No structured readings provided."
    if has_readings:
        lines = []
        if ph_readings:
            lines.append(f"pH readings     : {ph_readings}")
        if temperature:
            lines.append(f"Temperature (°C): {temperature}")
        if yield_pct:
            lines.append(f"Yield (%)       : {yield_pct}")
        readings_block = "\n".join(lines)

    notes_block = operator_notes or "No operator notes provided."

    image_note = (
        "A photo of the handwritten process log has been attached. "
        "Extract all values you can read from it."
    ) if True else "No image attached — diagnose from structured readings only."

    return f"""
OPERATOR NOTES
==============
{notes_block}

STRUCTURED READINGS
===================
{readings_block}

TASK
====
{image_note}
Work through the 5 diagnosis steps and identify why yield dropped or what went wrong.
Output valid JSON matching the specified schema.
"""


def _parse_diagnosis(output: str) -> dict:
    """Safely parse GLM's JSON diagnosis card."""
    try:
        clean = output.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        return json.loads(clean.strip())
    except (json.JSONDecodeError, IndexError):
        return {
            "error":      "Failed to parse diagnosis JSON",
            "raw_output": output,
            "confidence": "LOW",
        }
