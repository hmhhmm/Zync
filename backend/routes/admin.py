import json
import os
from fastapi import APIRouter, Header, HTTPException
from rag.graph_rag import seed_from_json, get_case_count
from rag.hybrid_search import seed_qdrant, get_collection_info
from config import ADMIN_SECRET

router = APIRouter()

_RULES_PATH = os.path.join(
    os.path.dirname(__file__), "../../data/lixiviant_kb/doe_rules.json"
)


@router.post("/admin/seed")
async def seed_neo4j(x_admin_secret: str = Header(...)):
    """
    Seeds Neo4j from data/known_cases/known_cases.json.
    Run once after starting Neo4j.
    """
    if x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")

    result = await seed_from_json()

    return {
        "status":      "done",
        "seeded":      result["seeded"],
        "skipped":     result["skipped"],
        "errors":      result["errors"],
        "total_in_db": await get_case_count(),
    }


@router.post("/admin/seed-qdrant")
async def seed_qdrant_endpoint(x_admin_secret: str = Header(...)):
    """
    Seeds Qdrant with regulatory documents from doe_rules.json.
    Generates real embeddings using paraphrase-multilingual-MiniLM-L12-v2.
    Run once after starting Qdrant.

    Note: First run downloads the embedding model (~120MB).
    """
    if x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")

    try:
        with open(_RULES_PATH) as f:
            rules = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="doe_rules.json not found")

    result = await seed_qdrant(rules)

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Seeding failed"))

    return {
        "status":     "done",
        "seeded":     result["seeded"],
        "collection": result["collection"],
        "model":      result["model"],
        "message":    f"Seeded {result['seeded']} regulations into Qdrant with real embeddings",
    }


@router.get("/admin/status")
async def db_status(x_admin_secret: str = Header(...)):
    """
    Check status of all databases — Neo4j and Qdrant.
    Run before the demo to verify everything is seeded.
    """
    if x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")

    neo4j_count  = await get_case_count()
    qdrant_info  = await get_collection_info()

    return {
        "neo4j": {
            "cases_in_graph": neo4j_count,
            "ready":          neo4j_count > 0,
            "message":        f"{neo4j_count} historical cases available for Agent 1"
                              if neo4j_count > 0
                              else "Graph is empty — run POST /api/admin/seed first",
        },
        "qdrant": {
            "connected":         qdrant_info.get("connected", False),
            "collection_exists": qdrant_info.get("collection_exists", False),
            "regulations_count": qdrant_info.get("count", 0),
            "ready":             qdrant_info.get("count", 0) > 0,
            "message":           f"{qdrant_info.get('count', 0)} regulations indexed for Agent 4"
                                 if qdrant_info.get("count", 0) > 0
                                 else "Qdrant empty — run POST /api/admin/seed-qdrant first",
        },
    }