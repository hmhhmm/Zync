from rag.graph_rag import query_historical_cases


async def get_historical_context(deposit_profile: dict) -> dict:
    """
    Retrieves relevant historical Malaysian REE processing cases
    from the Neo4j knowledge graph.

    Fallback chain:
    1. Neo4j graph query (graph_rag.py) — real historical cases
    2. If Neo4j unreachable or empty → honest empty response
       Agent 2 will then reason from first principles using the
       lixiviant knowledge base only.

    NO GLM call here — this function only retrieves real stored data.
    If there is no data, it says so honestly.
    """

    cases = await query_historical_cases(deposit_profile)

    if not cases:
        return {
            "cases_found": 0,
            "cases": [],
            "summary": (
                "No historical cases found in knowledge graph for "
                f"{deposit_profile.get('clay_type', 'unknown')} clay "
                f"in {deposit_profile.get('state', 'unknown')}. "
                "Agent 2 will reason from published chemistry and "
                "the lixiviant knowledge base."
            ),
        }

    # Build summary sentence from real cases
    avg_yield = sum(c.get("yield_pct", 0) for c in cases if c.get("yield_pct")) / len(cases)
    passed    = sum(1 for c in cases if c.get("compliance_status") == "passed")
    failed    = sum(1 for c in cases if c.get("compliance_status") == "failed")

    summary = (
        f"Found {len(cases)} historical case(s) with similar deposit profile. "
        f"Average yield: {avg_yield:.1f}%. "
        f"Compliance: {passed} passed, {failed} failed."
    )

    return {
        "cases_found": len(cases),
        "cases":       cases,
        "summary":     summary,
    }