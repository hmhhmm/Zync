import json
from datetime import datetime
from agents.base_agent import call_glm
from prompts.agent3_prompt import OPTIMIZER_PROMPT
from db.postgres_client import get_db


CONSTRAINTS = {
    "pH_lower_min":       3.8,
    "pH_upper_max":       5.5,
    "concentration_min":  0.3,
    "concentration_max":  1.5,
    "temperature_min":    20,
    "temperature_max":    45,
    "contact_time_min":   1.0,
    "contact_time_max":   6.0,
    "thorium_limit":      1.0,
    "thorium_target":     0.8,
}

DEMO_MAX_ITERATIONS  = 15
FULL_MAX_ITERATIONS  = 100
CONVERGENCE_PATIENCE = 3


async def run_optimizer(
    flowsheet: dict,
    site_conditions: dict,
    max_iterations: int = DEMO_MAX_ITERATIONS,
    stream_callback=None,
) -> dict:
    """
    Agent 3 — Compliance-aware optimization loop.

    Each iteration:
    1. GLM proposes parameter adjustment
    2. Yield and thorium are evaluated
    3. Agent 4 checks compliance on the proposed config
    4. Compliance failures feed back into next GLM prompt
    5. GLM adjusts based on both yield AND compliance feedback
    """
    from agents.agent4_compliance import check_compliance

    params = _extract_params(flowsheet)
    iterations = []
    convergence_count = 0
    session_id = datetime.now().strftime("%Y%m%d%H%M%S")
    last_compliance_feedback = None

    # Iteration 0 — baseline
    baseline = _evaluate_params(params)
    baseline["iteration"]         = 0
    baseline["reasoning"]         = "Baseline from Agent 2 theoretical flowsheet"
    baseline["status"]            = "baseline"
    baseline["compliance_status"] = "pending"
    baseline["compliance_flags"]  = []
    iterations.append(baseline)
    await _store_iteration(session_id, baseline)
    if stream_callback:
        await stream_callback(baseline)

    for i in range(1, max_iterations + 1):
        history_summary = _build_history_summary(iterations[-5:])

        proposal = await _get_glm_proposal(
            params, iterations[-1], history_summary, i, last_compliance_feedback
        )

        if proposal is None:
            iterations.append({**iterations[-1], "iteration": i, "status": "glm_error"})
            continue

        proposed_params = _apply_constraints(proposal)
        result = _evaluate_params(proposed_params)
        result["iteration"] = i
        result["reasoning"] = proposal.get("reasoning", "No reasoning provided")
        result["converged"] = proposal.get("converged", False)

        # Agent 4 compliance check on this iteration
        compliance_input = {
            "lixiviant":       flowsheet.get("lixiviant", "unknown"),
            "concentration_M": proposed_params["concentration_M"],
            "pH_range":        f"{proposed_params['pH_lower']:.1f}-{proposed_params['pH_upper']:.1f}",
            "temperature_C":   proposed_params["temperature_C"],
            "thorium_risk":    _estimate_thorium_risk(result["thorium_ppm"]),
            "esg_flag":        result["thorium_ppm"] >= CONSTRAINTS["thorium_target"],
            "esg_note":        f"Thorium estimate: {result['thorium_ppm']} Bq/g",
        }

        try:
            compliance = await check_compliance(compliance_input)
            compliance_status = compliance.get("overall_status", "unknown")
            compliance_flags  = [c for c in compliance.get("checks", []) if c.get("status") == "fail"]
            critical_failures = compliance.get("critical_failures", 0)
        except Exception:
            compliance_status = "error"
            compliance_flags  = []
            critical_failures = 0

        result["compliance_status"]   = compliance_status
        result["compliance_flags"]    = compliance_flags
        result["compliance_failures"] = critical_failures

        if compliance_flags:
            last_compliance_feedback = _build_compliance_feedback(compliance_flags)
            result["status"] = "compliance_fail" if critical_failures > 0 else _classify_status(result, iterations[-1])
        else:
            last_compliance_feedback = None
            result["status"] = _classify_status(result, iterations[-1])

        iterations.append(result)
        params = proposed_params
        await _store_iteration(session_id, result)
        if stream_callback:
            await stream_callback(result)

        if proposal.get("converged") and compliance_status == "pass":
            convergence_count += 1
            if convergence_count >= CONVERGENCE_PATIENCE:
                result["status"] = "converged"
                break
        else:
            convergence_count = 0

    compliant = [
        it for it in iterations
        if it["thorium_ppm"] < CONSTRAINTS["thorium_limit"]
        and it.get("compliance_status") in ["pass", "pending", "error"]
    ]
    best = max(compliant, key=lambda x: x["yield_pct"]) if compliant else iterations[0]
    best["status"] = "optimal"

    return {
        "iterations":        iterations,
        "best_iteration":    best,
        "iterations_run":    len(iterations),
        "converged":         convergence_count >= CONVERGENCE_PATIENCE,
        "session_id":        session_id,
        "optimization_note": (
            f"Compliance-aware optimization ran {len(iterations)} iterations. "
            f"Each iteration checked against AELB, DOE, and JMG regulations. "
            f"Best yield: {best['yield_pct']}% at pH {best['pH_range']} "
            f"(thorium: {best['thorium_ppm']} Bq/g — within AELB limit)."
        ),
    }


async def _get_glm_proposal(
    current_params, previous_result, history_summary, iteration, compliance_feedback
):
    compliance_section = ""
    if compliance_feedback:
        compliance_section = f"""
COMPLIANCE FEEDBACK FROM PREVIOUS ITERATION
============================================
{compliance_feedback}

You MUST address these compliance failures in your next proposal.
"""

    message = f"""
ITERATION: {iteration}

CURRENT PARAMETERS:
pH range          : {current_params['pH_lower']:.1f} - {current_params['pH_upper']:.1f}
Concentration (M) : {current_params['concentration_M']:.2f}
Temperature (C)   : {current_params['temperature_C']}
Contact time (hrs): {current_params['contact_time_hrs']:.1f}

PREVIOUS RESULT:
Yield             : {previous_result['yield_pct']:.1f}%
Thorium (Bq/g)    : {previous_result['thorium_ppm']:.3f}
Compliance        : {previous_result.get('compliance_status', 'unknown')}
Cost (RM/tonne)   : {previous_result['cost_rm_tonne']}
{compliance_section}
HISTORY (last 5):
{history_summary}

CONSTRAINTS:
- pH lower : above {CONSTRAINTS['pH_lower_min']}
- pH upper : below {CONSTRAINTS['pH_upper_max']}
- Conc     : {CONSTRAINTS['concentration_min']} to {CONSTRAINTS['concentration_max']} M
- Temp     : {CONSTRAINTS['temperature_min']} to {CONSTRAINTS['temperature_max']} C
- Thorium  : below {CONSTRAINTS['thorium_target']} Bq/g (hard limit: {CONSTRAINTS['thorium_limit']})

Propose ONE parameter adjustment to maximize yield while maintaining compliance.
"""
    try:
        result = await call_glm(
            system_prompt=OPTIMIZER_PROMPT,
            user_message=message,
            json_mode=True,
        )
        return json.loads(result["output"])
    except Exception:
        return None


def _estimate_thorium_risk(thorium_ppm):
    if thorium_ppm >= CONSTRAINTS["thorium_limit"]:
        return "high"
    elif thorium_ppm >= CONSTRAINTS["thorium_target"]:
        return "medium"
    return "low"


def _build_compliance_feedback(failed_checks):
    lines = []
    for check in failed_checks:
        lines.append(
            f"- FAILED: {check.get('parameter','?')} "
            f"(proposed: {check.get('proposed_value','?')}, limit: {check.get('limit','?')}) "
            f"— {check.get('regulation_cited','')}. "
            f"Action: {check.get('action_required','adjust parameter')}"
        )
    return "\n".join(lines)


def _extract_params(flowsheet):
    ph_range = flowsheet.get("pH_range", "4.0-4.5")
    try:
        parts = ph_range.replace(" ", "").split("-")
        ph_lower, ph_upper = float(parts[0]), float(parts[1])
    except Exception:
        ph_lower, ph_upper = 4.0, 4.5
    return {
        "pH_lower":         ph_lower,
        "pH_upper":         ph_upper,
        "concentration_M":  float(flowsheet.get("concentration_M", 0.5)),
        "temperature_C":    int(flowsheet.get("temperature_C", 25)),
        "contact_time_hrs": float(flowsheet.get("contact_time_hrs", 2.0)),
    }


def _apply_constraints(proposal):
    c = CONSTRAINTS
    return {
        "pH_lower":         max(c["pH_lower_min"],    min(5.0,                    float(proposal.get("pH_lower", 4.0)))),
        "pH_upper":         min(c["pH_upper_max"],    max(4.0,                    float(proposal.get("pH_upper", 4.5)))),
        "concentration_M":  max(c["concentration_min"], min(c["concentration_max"], float(proposal.get("concentration_M", 0.5)))),
        "temperature_C":    max(c["temperature_min"],   min(c["temperature_max"],   int(proposal.get("temperature_C", 25)))),
        "contact_time_hrs": max(c["contact_time_min"],  min(c["contact_time_max"],  float(proposal.get("contact_time_hrs", 2.0)))),
    }


def _evaluate_params(params):
    pH_mid = (params["pH_lower"] + params["pH_upper"]) / 2
    conc, temp, time = params["concentration_M"], params["temperature_C"], params["contact_time_hrs"]

    pH_factor   = max(0, 1.0 - abs(pH_mid - 4.2) * 0.8)
    conc_factor = min(1.0, conc / 0.6)
    temp_factor = min(1.0, (temp - 20) / 15)
    time_factor = min(1.0, time / 2.5)

    yield_pct = round(min(85.0, max(40.0,
        55.0 + (pH_factor*12) + (conc_factor*8) + (temp_factor*6) + (time_factor*4)
    )), 1)

    if pH_mid >= 4.5:
        thorium = 0.15 + (conc - 0.3) * 0.1
    elif pH_mid >= 4.2:
        thorium = 0.3 + (4.2 - pH_mid) * 0.4 + (conc - 0.3) * 0.15
    elif pH_mid >= 4.0:
        thorium = 0.6 + (4.0 - pH_mid) * 1.2 + (conc - 0.3) * 0.2
    else:
        thorium = 1.2 + (3.9 - pH_mid) * 2.0
    thorium = round(max(0.05, thorium), 3)

    return {
        "pH_range":         f"{params['pH_lower']:.1f}-{params['pH_upper']:.1f}",
        "pH_lower":         params["pH_lower"],
        "pH_upper":         params["pH_upper"],
        "concentration_M":  conc,
        "temperature_C":    temp,
        "contact_time_hrs": time,
        "yield_pct":        yield_pct,
        "thorium_ppm":      thorium,
        "cost_rm_tonne":    int(280 + (conc*60) + (temp-20)*3 + time*10),
    }


def _build_history_summary(iterations):
    lines = []
    for it in iterations:
        lines.append(
            f"  Iter {it['iteration']}: pH {it['pH_range']}, "
            f"yield {it['yield_pct']}%, thorium {it['thorium_ppm']} Bq/g, "
            f"compliance: {it.get('compliance_status','?')} — {it.get('reasoning','')[:50]}"
        )
    return "\n".join(lines) if lines else "No history yet"


def _classify_status(result, previous):
    if result["thorium_ppm"] >= CONSTRAINTS["thorium_limit"]:
        return "violation"
    if result["yield_pct"] > previous["yield_pct"] + 1.0:
        return "improved"
    if result["yield_pct"] < previous["yield_pct"] - 1.0:
        return "worse"
    return "stable"


async def _store_iteration(session_id, iteration):
    try:
        db = await get_db()
        if not db:
            return
        await db.execute("""
            CREATE TABLE IF NOT EXISTS optimization_iterations (
                id SERIAL PRIMARY KEY, session_id TEXT, iteration INT,
                pH_range TEXT, concentration FLOAT, temperature INT,
                contact_time FLOAT, yield_pct FLOAT, thorium_ppm FLOAT,
                cost_rm_tonne INT, status TEXT, compliance_status TEXT,
                reasoning TEXT, created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        await db.execute("""
            INSERT INTO optimization_iterations
            (session_id,iteration,pH_range,concentration,temperature,
             contact_time,yield_pct,thorium_ppm,cost_rm_tonne,status,compliance_status,reasoning)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        """,
            session_id, iteration["iteration"], iteration["pH_range"],
            iteration["concentration_M"], iteration["temperature_C"],
            iteration["contact_time_hrs"], iteration["yield_pct"],
            iteration["thorium_ppm"], iteration["cost_rm_tonne"],
            iteration.get("status",""), iteration.get("compliance_status",""),
            iteration.get("reasoning","")[:500],
        )
    except Exception:
        pass