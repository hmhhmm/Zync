import json
from db.postgres_client import get_db
from agents.base_agent import call_glm


async def run_optimizer(flowsheet: dict, site_conditions: dict) -> dict:
    """
    Agent 3 — The Optimizer (MVP: mock iteration table)

    In full version: runs 600+ iterations adjusting pH/temp/concentration
    and stores each result in PostgreSQL, then uses SQL RAG to find optimum.

    For hackathon MVP: stores Agent 2's flowsheet as iteration 1,
    generates 4 synthetic iterations to demonstrate the table structure,
    and returns the best configuration found.
    """

    # Build mock iteration table from Agent 2's starting point
    base_yield   = flowsheet.get("predicted_yield_pct", 65.0)
    base_pH      = _parse_ph_midpoint(flowsheet.get("pH_range", "4.0-4.5"))
    base_temp    = flowsheet.get("temperature_C", 25)
    base_conc    = flowsheet.get("concentration_M", 0.5)
    base_thorium = _estimate_thorium(base_pH)

    iterations = _generate_mock_iterations(
        base_yield, base_pH, base_temp, base_conc, base_thorium
    )

    # Store iterations (will no-op gracefully if DB not connected)
    await _store_iterations(iterations)

    # Find best iteration: highest yield with thorium_ppm < 1.0
    compliant = [i for i in iterations if i["thorium_ppm"] < 1.0]
    best = max(compliant, key=lambda x: x["yield_pct"]) if compliant else iterations[0]

    return {
        "iterations":        iterations,
        "best_iteration":    best,
        "iterations_run":    len(iterations),
        "optimization_note": (
            "MVP: 5 seed iterations shown. "
            "Full 600-iteration autonomous loop available in production."
        ),
    }


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _parse_ph_midpoint(ph_range: str) -> float:
    try:
        parts = ph_range.replace(" ", "").split("-")
        return (float(parts[0]) + float(parts[1])) / 2
    except Exception:
        return 4.2


def _estimate_thorium(pH: float) -> float:
    """Simplified model: thorium risk increases sharply below pH 4.0."""
    if pH >= 4.5:
        return 0.2
    elif pH >= 4.2:
        return 0.5
    elif pH >= 4.0:
        return 0.8
    elif pH >= 3.8:
        return 1.3
    else:
        return 2.1


def _generate_mock_iterations(
    base_yield: float,
    base_pH: float,
    base_temp: int,
    base_conc: float,
    base_thorium: float,
) -> list:
    """Generate 5 representative iterations around the base parameters."""
    return [
        {
            "iteration":    1,
            "pH":           round(base_pH, 1),
            "temperature":  base_temp,
            "concentration": base_conc,
            "yield_pct":    round(base_yield, 1),
            "thorium_ppm":  round(base_thorium, 2),
            "cost_rm_tonne": 320,
            "status":       "baseline",
        },
        {
            "iteration":    2,
            "pH":           round(base_pH - 0.2, 1),
            "temperature":  base_temp,
            "concentration": base_conc,
            "yield_pct":    round(base_yield + 4.2, 1),
            "thorium_ppm":  round(base_thorium + 0.3, 2),
            "cost_rm_tonne": 320,
            "status":       "higher_yield_higher_risk",
        },
        {
            "iteration":    3,
            "pH":           round(base_pH + 0.2, 1),
            "temperature":  base_temp,
            "concentration": base_conc,
            "yield_pct":    round(base_yield - 3.1, 1),
            "thorium_ppm":  round(base_thorium - 0.2, 2),
            "cost_rm_tonne": 320,
            "status":       "safer_lower_yield",
        },
        {
            "iteration":    4,
            "pH":           round(base_pH, 1),
            "temperature":  base_temp + 5,
            "concentration": round(base_conc + 0.1, 1),
            "yield_pct":    round(base_yield + 6.8, 1),
            "thorium_ppm":  round(base_thorium + 0.1, 2),
            "cost_rm_tonne": 380,
            "status":       "best_yield_higher_cost",
        },
        {
            "iteration":    5,
            "pH":           round(base_pH + 0.1, 1),
            "temperature":  base_temp - 5,
            "concentration": round(base_conc - 0.1, 1),
            "yield_pct":    round(base_yield + 1.5, 1),
            "thorium_ppm":  round(base_thorium - 0.1, 2),
            "cost_rm_tonne": 290,
            "status":       "optimal_balanced",
        },
    ]


async def _store_iterations(iterations: list):
    """Store iterations in PostgreSQL. Fails silently if DB not ready."""
    try:
        db = await get_db()
        await db.execute("""
            CREATE TABLE IF NOT EXISTS optimization_iterations (
                id SERIAL PRIMARY KEY,
                iteration INT,
                pH FLOAT,
                temperature INT,
                concentration FLOAT,
                yield_pct FLOAT,
                thorium_ppm FLOAT,
                cost_rm_tonne INT,
                status TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        for row in iterations:
            await db.execute("""
                INSERT INTO optimization_iterations
                (iteration, pH, temperature, concentration, yield_pct, thorium_ppm, cost_rm_tonne, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, row["iteration"], row["pH"], row["temperature"],
                row["concentration"], row["yield_pct"],
                row["thorium_ppm"], row["cost_rm_tonne"], row["status"])
    except Exception:
        pass  # DB not connected — MVP mode, table is still shown in frontend