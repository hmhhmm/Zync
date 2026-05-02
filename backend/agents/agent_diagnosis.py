import json
import logging
from typing import AsyncGenerator
from agents.base_agent import stream_glm
from prompts.agent_diagnosis_prompt import DIAGNOSIS_PROMPT

log = logging.getLogger("zync.agent_diagnosis")


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
    message = _build_message(ph_readings, temperature, yield_pct, operator_notes, has_image=bool(log_image_b64))

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
            raw = chunk["output"] or full_output
            diagnosis = _parse_diagnosis(raw)
            if diagnosis.get("error"):
                log.warning(f"diagnosis parse failed — {diagnosis['error']} | raw: {raw[:200]!r}")
            else:
                log.info(f"diagnosis complete — root_cause={diagnosis.get('root_cause')!r} confidence={diagnosis.get('confidence')}")
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
    has_image: bool = False,
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

    if has_image:
        image_note = (
            "A photo of the handwritten process log has been attached. "
            "Extract all readings visible in the image — pH, temperature, yield, dates, operator notes. "
            "Use these extracted values as your primary data source."
        )
    else:
        image_note = "No image attached — diagnose from the structured readings and operator notes only."

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
    """
    Robustly extract diagnosis JSON from GLM output.
    Tries four strategies before returning a fallback that includes raw_output
    so the frontend can still display something useful.
    """
    import re

    if not output or not output.strip():
        return {"error": "Empty response from model", "raw_output": "", "confidence": "LOW"}

    clean = output.strip()

    # Strategy 1 — direct parse
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        pass

    # Strategy 2 — strip markdown code fences ```json ... ``` or ``` ... ```
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", clean, re.DOTALL)
    if fence:
        try:
            return json.loads(fence.group(1))
        except json.JSONDecodeError:
            pass

    # Strategy 3 — find first { … last } in the string
    start = clean.find("{")
    end   = clean.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(clean[start:end + 1])
        except json.JSONDecodeError:
            pass

    # Strategy 4 — model returned prose, extract key fields with regex
    def extract(pattern, text, group=1, default=None):
        m = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        return m.group(group).strip() if m else default

    root_cause   = extract(r'"root_cause"\s*:\s*"([^"]+)"', clean)
    primary_action = extract(r'"primary_action"\s*:\s*"([^"]+)"', clean)
    confidence   = extract(r'"confidence"\s*:\s*"(HIGH|MEDIUM|LOW)"', clean, default="LOW")
    esg_flag_str = extract(r'"esg_flag"\s*:\s*(true|false)', clean, default="false")

    if root_cause or primary_action:
        return {
            "root_cause":    root_cause or "See raw output",
            "primary_action": primary_action or "See raw output",
            "confidence":    confidence,
            "esg_flag":      esg_flag_str == "true",
            "raw_output":    clean,
        }

    return {
        "error":      "Could not parse model response as diagnosis JSON",
        "raw_output": clean,
        "confidence": "LOW",
    }
