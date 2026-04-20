import json
import os
from db.neo4j_client import run_query

KNOWN_CASES_PATH = os.path.join(os.path.dirname(__file__), "../../data/known_cases/known_cases.json")


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
    Seeds Neo4j from data/known_cases/known_cases.json.
    Run once during setup: POST /admin/seed (not exposed in production).
    """
    with open(KNOWN_CASES_PATH, "r") as f:
        cases = json.load(f)

    for c in cases:
        cypher = """
        MERGE (state:State {name: $state})
        MERGE (site:Site {name: $site})
        MERGE (site)-[:LOCATED_IN]->(state)
        MERGE (dep:Deposit {clay_type: $clay_type, pH_range: $pH_range, temperature: $temperature_C})
        MERGE (site)-[:HAS_DEPOSIT]->(dep)
        MERGE (lix:Lixiviant {name: $lixiviant, concentration: $concentration})
        MERGE (dep)-[:USED_LIXIVIANT]->(lix)
        MERGE (y:YieldResult {yield_pct: $yield_pct})
        MERGE (dep)-[:ACHIEVED_YIELD]->(y)
        MERGE (comp:ComplianceOutcome {status: $compliance_status, lesson: $key_lesson})
        MERGE (y)-[:HAD_COMPLIANCE]->(comp)
        """
        await run_query(cypher, c)