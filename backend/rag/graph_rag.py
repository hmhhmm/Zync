from db.neo4j_client import run_query


async def query_historical_cases(deposit_profile: dict) -> list:
    """
    Traverse the knowledge graph to find historical Malaysian REE cases
    relevant to the given deposit profile.

    Graph schema:
    (Site)-[:HAS_DEPOSIT]->(Deposit)-[:USED_LIXIVIANT]->(Lixiviant)
    (Deposit)-[:ACHIEVED_YIELD]->(YieldResult)
    (YieldResult)-[:HAD_COMPLIANCE]->(ComplianceOutcome)

    For MVP: returns empty list if Neo4j not connected.
    Agent 1 falls back to GLM's training knowledge.
    """
    clay_type = deposit_profile.get("clay_type", "").lower()
    state     = deposit_profile.get("state", "").lower()

    cypher = """
    MATCH (s:Site)-[:LOCATED_IN]->(state:State)
    MATCH (s)-[:HAS_DEPOSIT]->(d:Deposit)
    MATCH (d)-[:USED_LIXIVIANT]->(l:Lixiviant)
    MATCH (d)-[:ACHIEVED_YIELD]->(y:YieldResult)
    OPTIONAL MATCH (y)-[:HAD_COMPLIANCE]->(c:ComplianceOutcome)
    WHERE toLower(d.clay_type) CONTAINS $clay_type
       OR toLower(state.name) CONTAINS $state
    RETURN
        s.name         AS site,
        d.clay_type    AS clay_type,
        l.name         AS lixiviant,
        l.concentration AS concentration,
        d.pH_range     AS pH_range,
        d.temperature  AS temperature_C,
        y.yield_pct    AS yield_pct,
        c.status       AS compliance_status,
        c.lesson       AS key_lesson
    LIMIT 5
    """

    try:
        records = await run_query(cypher, {"clay_type": clay_type, "state": state})
        return records
    except Exception:
        return []


async def seed_sample_data():
    """
    Seeds the Neo4j graph with sample Malaysian REE historical data.
    Run once during setup: POST /admin/seed (not exposed in production).
    """
    cypher = """
    MERGE (kelantan:State {name: 'Kelantan'})
    MERGE (s1:Site {name: 'Bukit Besi Pilot Site'})
    MERGE (s1)-[:LOCATED_IN]->(kelantan)
    MERGE (d1:Deposit {clay_type: 'laterite', pH_range: '4.0-4.5', temperature: 25})
    MERGE (s1)-[:HAS_DEPOSIT]->(d1)
    MERGE (l1:Lixiviant {name: 'ammonium sulfate', concentration: '0.5M'})
    MERGE (d1)-[:USED_LIXIVIANT]->(l1)
    MERGE (y1:YieldResult {yield_pct: 68.0})
    MERGE (d1)-[:ACHIEVED_YIELD]->(y1)
    MERGE (c1:ComplianceOutcome {
        status: 'failed',
        lesson: 'Thorium levels exceeded AELB limit — pH was too low at 3.9 during peak operation'
    })
    MERGE (y1)-[:HAD_COMPLIANCE]->(c1)
    """
    await run_query(cypher)