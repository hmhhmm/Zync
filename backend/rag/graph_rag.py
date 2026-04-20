import json
import os
from db.neo4j_client import run_query, get_driver

_KNOWN_CASES_PATH = os.path.join(
    os.path.dirname(__file__), "../../data/known_cases/known_cases.json"
)


async def query_historical_cases(deposit_profile: dict) -> list:
    """
    Traverses the Neo4j knowledge graph to find historical Malaysian
    REE processing cases relevant to the deposit profile.

    Matches on clay_type and state. Returns up to 5 closest cases.
    Returns empty list if Neo4j is not connected — caller handles fallback.
    """
    clay_type = deposit_profile.get("clay_type", "").lower()
    state     = deposit_profile.get("state", "").lower()

    if not get_driver():
        return []

    cypher = """
    MATCH (s:Site)-[:LOCATED_IN]->(st:State)
    MATCH (s)-[:HAS_DEPOSIT]->(d:Deposit)
    MATCH (d)-[:USED_LIXIVIANT]->(l:Lixiviant)
    MATCH (d)-[:ACHIEVED_YIELD]->(y:YieldResult)
    OPTIONAL MATCH (y)-[:HAD_COMPLIANCE]->(c:ComplianceOutcome)
    WHERE toLower(d.clay_type) CONTAINS $clay_type
       OR toLower(st.name)     CONTAINS $state
    RETURN
        s.name              AS site,
        st.name             AS state,
        d.clay_type         AS clay_type,
        l.name              AS lixiviant,
        l.concentration     AS concentration,
        d.pH_range          AS pH_range,
        d.temperature_C     AS temperature_C,
        d.contact_time_hrs  AS contact_time_hrs,
        y.yield_pct         AS yield_pct,
        c.status            AS compliance_status,
        c.lesson            AS key_lesson,
        d.source            AS source
    ORDER BY y.yield_pct DESC
    LIMIT 5
    """

    try:
        records = await run_query(cypher, {"clay_type": clay_type, "state": state})
        return [dict(r) for r in records]
    except Exception:
        return []


async def seed_from_json() -> dict:
    """
    Seeds Neo4j from data/known_cases/known_cases.json.

    Called by POST /admin/seed.
    Skips the template entry (has _comment key).
    Uses MERGE so re-running is safe — no duplicate nodes.

    Returns: {"seeded": int, "skipped": int, "errors": list}
    """
    try:
        with open(_KNOWN_CASES_PATH) as f:
            cases = json.load(f)
    except FileNotFoundError:
        return {"seeded": 0, "skipped": 0, "errors": ["known_cases.json not found"]}
    except json.JSONDecodeError as e:
        return {"seeded": 0, "skipped": 0, "errors": [f"JSON parse error: {e}"]}

    seeded = 0
    skipped = 0
    errors = []

    for case in cases:
        # Skip template/comment entries
        if "_comment" in case:
            skipped += 1
            continue

        # Validate required fields
        required = ["site", "state", "clay_type", "lixiviant",
                    "pH_range", "yield_pct", "compliance_status", "key_lesson"]
        missing = [f for f in required if not case.get(f)]
        if missing:
            errors.append(f"Skipped '{case.get('site', '?')}' — missing: {missing}")
            skipped += 1
            continue

        cypher = """
        MERGE (st:State {name: $state})

        MERGE (s:Site {name: $site})
        MERGE (s)-[:LOCATED_IN]->(st)

        MERGE (d:Deposit {
            clay_type:        $clay_type,
            pH_range:         $pH_range,
            temperature_C:    $temperature_C,
            contact_time_hrs: $contact_time_hrs,
            source:           $source
        })
        MERGE (s)-[:HAS_DEPOSIT]->(d)

        MERGE (l:Lixiviant {
            name:          $lixiviant,
            concentration: $concentration
        })
        MERGE (d)-[:USED_LIXIVIANT]->(l)

        MERGE (y:YieldResult {yield_pct: $yield_pct})
        MERGE (d)-[:ACHIEVED_YIELD]->(y)

        MERGE (c:ComplianceOutcome {
            status: $compliance_status,
            lesson: $key_lesson
        })
        MERGE (y)-[:HAD_COMPLIANCE]->(c)
        """

        params = {
            "site":              case["site"],
            "state":             case["state"],
            "clay_type":         case["clay_type"],
            "lixiviant":         case["lixiviant"],
            "concentration":     case.get("concentration", "unknown"),
            "pH_range":          case["pH_range"],
            "temperature_C":     case.get("temperature_C", 25),
            "contact_time_hrs":  case.get("contact_time_hrs", 0),
            "yield_pct":         float(case["yield_pct"]),
            "compliance_status": case["compliance_status"],
            "key_lesson":        case["key_lesson"],
            "source":            case.get("source", ""),
        }

        try:
            await run_query(cypher, params)
            seeded += 1
        except Exception as e:
            errors.append(f"Failed to seed '{case['site']}': {e}")

    return {"seeded": seeded, "skipped": skipped, "errors": errors}


async def get_case_count() -> int:
    """Returns total number of cases currently in the graph."""
    try:
        result = await run_query("MATCH (y:YieldResult) RETURN count(y) AS n")
        return result[0]["n"] if result else 0
    except Exception:
        return 0