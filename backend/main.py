import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.pipeline import router as pipeline_router
from routes.validate import router as validate_router
from routes.upload   import router as upload_router
from routes.admin    import router as admin_router
from routes.zone      import router as zone_router
from routes.diagnosis import router as diagnosis_router
from __init__ import __version__

# ── Logging setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
# Quiet noisy third-party loggers
for _noisy in ("httpx", "httpcore", "neo4j", "urllib3", "asyncio"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)

log = logging.getLogger("zync.startup")


# ── Startup: auto-seed databases ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info(f"Zync API v{__version__} starting up")

    # Auto-seed Neo4j
    try:
        from rag.graph_rag import seed_from_json, get_case_count
        count = await get_case_count()
        if count == 0:
            log.info("Neo4j graph is empty — auto-seeding from known_cases.json")
            result = await seed_from_json()
            log.info(f"Neo4j seed complete: {result['seeded']} cases seeded, "
                     f"{result['skipped']} skipped, {len(result['errors'])} errors")
            if result["errors"]:
                for err in result["errors"]:
                    log.warning(f"Neo4j seed error: {err}")
        else:
            log.info(f"Neo4j already has {count} cases — skipping seed")
    except Exception as e:
        log.warning(f"Neo4j auto-seed skipped (DB may not be running): {e}")

    # Auto-seed Qdrant
    try:
        import json, os
        from rag.hybrid_search import seed_qdrant, get_collection_info
        info = await get_collection_info()
        if not info.get("count"):
            rules_path = os.path.join(os.path.dirname(__file__), "../data/lixiviant_kb/doe_rules.json")
            with open(rules_path) as f:
                rules = json.load(f)
            log.info("Qdrant collection empty — auto-seeding DOE rules")
            result = await seed_qdrant(rules)
            if result.get("success"):
                log.info(f"Qdrant seed complete: {result['seeded']} rules indexed")
            else:
                log.warning(f"Qdrant seed failed: {result.get('error')}")
        else:
            log.info(f"Qdrant already has {info['count']} regulations — skipping seed")
    except Exception as e:
        log.warning(f"Qdrant auto-seed skipped (DB may not be running): {e}")

    log.info("Startup complete — all agents ready")
    yield
    log.info("Zync API shutting down")


app = FastAPI(title="Zync API", version=__version__, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pipeline_router, prefix="/api")
app.include_router(validate_router, prefix="/api")
app.include_router(upload_router,   prefix="/api")
app.include_router(admin_router,    prefix="/api")
app.include_router(zone_router,      prefix="/api")
app.include_router(diagnosis_router, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "Zync API", "version": __version__}