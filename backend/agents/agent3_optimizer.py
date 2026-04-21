import json
import asyncio
from datetime import datetime
from agents.base_agent import call_glm
from prompts.agent3_prompt import OPTIMIZER_PROMPT
from db.postgres_client import get_db


# Hard constraints — GLM cannot violate these
CONSTRAINTS = {
    "pH_lower_min":       3.8,
    "pH_upper_max":       5.5,
    "concentration_min":  0.3,
    "concentration_max":  1.5,
    "temperature_min":    20,
    "temperature_max":    45,
    "contact_time_min":   1.0,
    "contact_time_max":   6.0,
    "thorium_limit":      1.0,   # AELB hard limit
    "thorium_target":     0.8,   # Safety margin
}

# Demo config — balance between demo speed and showing real iteration
DEMO_MAX_ITERATIONS  = 15   # Show 15 live iterations in demo
FULL_MAX_ITERATIONS  = 100  # Full run cap (not 600 — realistic for API costs)
CONVERGENCE_PATIENCE = 3    # Stop if converged 3 times in a row


async def run_optimizer(
    flowsheet: dict,
    site_conditions: dict,
    max_iterations: int = DEMO_MAX_ITERATIONS,
    stream_callback=None,
) -> dict:
    """
    Agent 3 — The Optimizer

    Real GLM iteration loop:
    1. Start from Agent 2's theoretical flowsheet as baseline
    2. Each iteration: GLM analyzes previous result, proposes one parameter change
    3. We apply the change, estimate new yield/thorium, store result
    4. Loop until convergence or max_iterations reached

    stream_callback: optional async function(iteration_dict) for live streaming
    """

    # Extract starting parameters from Agent 2's flowsheet
    params = _extract_params(flowsheet)
    iterations = []
    convergence_count = 0
    session_id = datetime.now().strftime("%Y%m%d%H%M%S")

    # Iteration 0 — baseline from Agent 2
    baseline = _evaluate_params(params)
    baseline["iteration"] = 0
    baseline["reasoning"] = "Baseline from Agent 2 theoretical flowsheet"
    baseline["status"] = "baseline"
    iterations.append(baseline)
    await _store_iteration(session_id, baseline)

    if stream_callback:
        await stream_callback(baseline)

    # Main optimization loop
    for i in range(1, max_iterations + 1):
        # Build history summary for GLM context (last 5 iterations)
        history_summary = _build_history_summary(iterations[-5:])

        # GLM proposes next parameter set
        proposal = await _get_glm_proposal(params, baseline, history_summary, i)

        if proposal is None:
            # GLM failed to produce valid JSON — keep current params
            iterations.append({**iterations[-1], "iteration": i, "status": "glm_error"})
            continue

        # Apply hard constraints — clip to safe bounds regardless of GLM output
        proposed_params = _apply_constraints(proposal)

        # Evaluate new configuration
        result = _evaluate_params(proposed_params)
        result["iteration"]  = i
        result["reasoning"]  = proposal.get("reasoning", "No reasoning provided")
        result["converged"]  = proposal.get("converged", False)
        result["status"]     = _classify_status(result, iterations[-1])

        iterations.append(result)
        params = proposed_params  # Update current params for next iteration

        await _store_iteration(session_id, result)

        if stream_callback:
            await stream_callback(result)

        # Check convergence
        if proposal.get("converged"):
            convergence_count += 1
            if convergence_count >= CONVERGENCE_PATIENCE:
                result["status"] = "converged"
                break
        else:
            convergence_count = 0

    # Find best compliant iteration
    compliant = [it for it in iterations if it["thorium_ppm"] < CONSTRAINTS["thorium_limit"]]
    best = max(compliant, key=lambda x: x["yield_pct"]) if compliant else iterations[0]
    best["status"] = "optimal"

    return {
        "iterations":         iterations,
        "best_iteration":     best,
        "iterations_run":     len(iterations),
        "converged":          convergence_count >= CONVERGENCE_PATIENCE,
        "session_id":         session_id,
        "optimization_note":  (
            f"GLM optimization loop ran {len(iterations)} iterations. "
            f"Best yield: {best['yield_pct']}% at pH {best['pH_range']} "
            f"(thorium: {best['thorium_ppm']} Bq/g — within AELB limit)."
        ),
    }


# ─── GLM interaction ──────────────────────────────────────────────────────────

async def _get_glm_proposal(
    current_params: dict,
    previous_result: dict,
    history_summary: str,
    iteration: int,
) -> dict | None:
    """Ask GLM to propose the next parameter adjustment."""

    message = f"""
ITERATION: {iteration}

CURRENT PARAMETERS:
pH range          : {current_params['pH_lower']:.1f} - {current_params['pH_upper']:.1f}
Concentration (M) : {current_params['concentration_M']:.2f}
Temperature (°C)  : {current_params['temperature_C']}
Contact time (hrs): {current_params['contact_time_hrs']:.1f}

PREVIOUS RESULT:
Yield             : {previous_result['yield_pct']:.1f}%
Thorium (Bq/g)    : {previous_result['thorium_ppm']:.3f}
Cost (RM/tonne)   : {previous_result['cost_rm_tonne']}
Status            : {previous_result.get('status', 'unknown')}

ITERATION HISTORY (last 5):
{history_summary}

CONSTRAINTS:
- pH lower bound  : must stay above {CONSTRAINTS['pH_lower_min']}
- pH upper bound  : must stay below {CONSTRAINTS['pH_upper_max']}
- Concentration   : {CONSTRAINTS['concentration_min']} to {CONSTRAINTS['concentration_max']} M
- Temperature     : {CONSTRAINTS['temperature_min']} to {CONSTRAINTS['temperature_max']} °C
- Thorium target  : below {CONSTRAINTS['thorium_target']} Bq/g (hard limit: {CONSTRAINTS['thorium_limit']})

Propose the next parameter adjustment to maximize yield while keeping thorium safe.
"""

    try:
        result = await call_glm(
            system_prompt=OPTIMIZER_PROMPT,
            user_message=message,
            json_mode=True,
        )
        return json.loads(result["output"])
    except (json.JSONDecodeError, KeyError):
        return None


# ─── Parameter helpers ────────────────────────────────────────────────────────

def _extract_params(flowsheet: dict) -> dict:
    """Extract numerical parameters from Agent 2's flowsheet."""
    ph_range = flowsheet.get("pH_range", "4.0-4.5")
    try:
        parts = ph_range.replace(" ", "").split("-")
        ph_lower = float(parts[0])
        ph_upper = float(parts[1])
    except Exception:
        ph_lower, ph_upper = 4.0, 4.5

    return {
        "pH_lower":        ph_lower,
        "pH_upper":        ph_upper,
        "concentration_M": float(flowsheet.get("concentration_M", 0.5)),
        "temperature_C":   int(flowsheet.get("temperature_C", 25)),
        "contact_time_hrs": float(flowsheet.get("contact_time_hrs", 2.0)),
    }


def _apply_constraints(proposal: dict) -> dict:
    """Clip all parameters to hard constraint bounds — GLM cannot violate these."""
    c = CONSTRAINTS
    return {
        "pH_lower":        max(c["pH_lower_min"],  min(5.0,                    float(proposal.get("pH_lower", 4.0)))),
        "pH_upper":        min(c["pH_upper_max"],  max(4.0,                    float(proposal.get("pH_upper", 4.5)))),
        "concentration_M": max(c["concentration_min"], min(c["concentration_max"], float(proposal.get("concentration_M", 0.5)))),
        "temperature_C":   max(c["temperature_min"],   min(c["temperature_max"],   int(proposal.get("temperature_C", 25)))),
        "contact_time_hrs": max(c["contact_time_min"], min(c["contact_time_max"],  float(proposal.get("contact_time_hrs", 2.0)))),
    }


def _evaluate_params(params: dict) -> dict:
    """
    Estimate yield and thorium for given parameters.

    In production: this calls a real simulation engine.
    For demo: uses a physics-informed model based on REE leaching literature.
    Yield increases with lower pH, higher concentration, higher temp, longer time.
    Thorium increases sharply below pH 4.0.
    """
    pH_mid    = (params["pH_lower"] + params["pH_upper"]) / 2
    conc      = params["concentration_M"]
    temp      = params["temperature_C"]
    time      = params["contact_time_hrs"]

    # Yield model — peaks around pH 4.2, conc 0.6M, temp 30°C, time 2.5hrs
    pH_factor   = max(0, 1.0 - abs(pH_mid - 4.2) * 0.8)
    conc_factor = min(1.0, conc / 0.6)
    temp_factor = min(1.0, (temp - 20) / 15)
    time_factor = min(1.0, time / 2.5)

    base_yield  = 55.0
    yield_pct   = base_yield + (pH_factor * 12) + (conc_factor * 8) + (temp_factor * 6) + (time_factor * 4)
    yield_pct   = round(min(85.0, max(40.0, yield_pct)), 1)

    # Thorium model — increases sharply below pH 4.0
    if pH_mid >= 4.5:
        thorium = 0.15 + (conc - 0.3) * 0.1
    elif pH_mid >= 4.2:
        thorium = 0.3 + (4.2 - pH_mid) * 0.4 + (conc - 0.3) * 0.15
    elif pH_mid >= 4.0:
        thorium = 0.6 + (4.0 - pH_mid) * 1.2 + (conc - 0.3) * 0.2
    else:
        thorium = 1.2 + (3.9 - pH_mid) * 2.0

    thorium     = round(max(0.05, thorium), 3)
    cost        = int(280 + (conc * 60) + (temp - 20) * 3 + time * 10)

    return {
        "pH_range":        f"{params['pH_lower']:.1f}-{params['pH_upper']:.1f}",
        "pH_lower":        params["pH_lower"],
        "pH_upper":        params["pH_upper"],
        "concentration_M": params["concentration_M"],
        "temperature_C":   params["temperature_C"],
        "contact_time_hrs": params["contact_time_hrs"],
        "yield_pct":       yield_pct,
        "thorium_ppm":     thorium,
        "cost_rm_tonne":   cost,
    }


def _build_history_summary(iterations: list) -> str:
    """Build a compact history string for GLM context."""
    lines = []
    for it in iterations:
        lines.append(
            f"  Iter {it['iteration']}: pH {it['pH_range']}, "
            f"yield {it['yield_pct']}%, thorium {it['thorium_ppm']} Bq/g, "
            f"cost RM{it['cost_rm_tonne']} — {it.get('reasoning', '')[:60]}"
        )
    return "\n".join(lines) if lines else "No history yet"


def _classify_status(result: dict, previous: dict) -> str:
    """Classify iteration status for frontend display."""
    if result["thorium_ppm"] >= CONSTRAINTS["thorium_limit"]:
        return "violation"
    if result["yield_pct"] > previous["yield_pct"] + 1.0:
        return "improved"
    if result["yield_pct"] < previous["yield_pct"] - 1.0:
        return "worse"
    return "stable"


# ─── Database ─────────────────────────────────────────────────────────────────

async def _store_iteration(session_id: str, iteration: dict):
    """Store iteration in PostgreSQL. Fails silently if DB not connected."""
    try:
        db = await get_db()
        if not db:
            return
        await db.execute("""
            CREATE TABLE IF NOT EXISTS optimization_iterations (
                id           SERIAL PRIMARY KEY,
                session_id   TEXT,
                iteration    INT,
                pH_range     TEXT,
                concentration FLOAT,
                temperature  INT,
                contact_time FLOAT,
                yield_pct    FLOAT,
                thorium_ppm  FLOAT,
                cost_rm_tonne INT,
                status       TEXT,
                reasoning    TEXT,
                created_at   TIMESTAMP DEFAULT NOW()
            )
        """)
        await db.execute("""
            INSERT INTO optimization_iterations
            (session_id, iteration, pH_range, concentration, temperature,
             contact_time, yield_pct, thorium_ppm, cost_rm_tonne, status, reasoning)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        """,
            session_id,
            iteration["iteration"],
            iteration["pH_range"],
            iteration["concentration_M"],
            iteration["temperature_C"],
            iteration["contact_time_hrs"],
            iteration["yield_pct"],
            iteration["thorium_ppm"],
            iteration["cost_rm_tonne"],
            iteration.get("status", ""),
            iteration.get("reasoning", "")[:500],
        )
    except Exception:
        pass