from db.postgres_client import get_db


async def get_best_iteration(min_yield: float = 60.0, max_thorium: float = 1.0) -> dict:
    """
    Query the iteration table to find the best configuration
    that meets yield and thorium safety constraints.
    """
    db = await get_db()
    if not db:
        return {}

    try:
        row = await db.fetchrow("""
            SELECT *
            FROM optimization_iterations
            WHERE yield_pct >= $1
              AND thorium_ppm < $2
            ORDER BY yield_pct DESC, cost_rm_tonne ASC
            LIMIT 1
        """, min_yield, max_thorium)
        return dict(row) if row else {}
    except Exception:
        return {}


async def get_all_iterations() -> list:
    """Fetch all stored iterations for the frontend table display."""
    db = await get_db()
    if not db:
        return []

    try:
        rows = await db.fetch(
            "SELECT * FROM optimization_iterations ORDER BY iteration ASC"
        )
        return [dict(r) for r in rows]
    except Exception:
        return []