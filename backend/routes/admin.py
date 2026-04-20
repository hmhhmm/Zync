from fastapi import APIRouter, Header, HTTPException
from rag.graph_rag import seed_from_json, get_case_count
from config import ADMIN_SECRET

router = APIRouter()


@router.post("/admin/seed")
async def seed_database(x_admin_secret: str = Header(...)):
    """
    Seeds Neo4j from data/known_cases/known_cases.json.

    Requires X-Admin-Secret header matching ADMIN_SECRET in .env.
    Safe to re-run — uses MERGE so no duplicate nodes are created.

    Steps:
    1. Fill data/known_cases/known_cases.json with real cases
    2. Start Neo4j: docker-compose up -d neo4j
    3. POST /api/admin/seed with header X-Admin-Secret: your_secret
    """
    if x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")

    result = await seed_from_json()

    return {
        "status":       "done",
        "seeded":       result["seeded"],
        "skipped":      result["skipped"],
        "errors":       result["errors"],
        "total_in_db":  await get_case_count(),
    }


@router.get("/admin/status")
async def db_status(x_admin_secret: str = Header(...)):
    """
    Check how many cases are currently in Neo4j.
    Use this to verify seeding worked before the demo.
    """
    if x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")

    count = await get_case_count()
    return {
        "cases_in_graph": count,
        "ready":          count > 0,
        "message":        f"{count} historical cases available for Agent 1" if count > 0
                          else "Graph is empty — run POST /api/admin/seed first",
    }