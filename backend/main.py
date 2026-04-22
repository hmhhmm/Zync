from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.pipeline import router as pipeline_router
from routes.validate import router as validate_router
from routes.upload   import router as upload_router
from routes.admin    import router as admin_router
from routes.zone     import router as zone_router

app = FastAPI(title="Zync API", version="1.0.0")

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
app.include_router(zone_router,     prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "Zync API"}