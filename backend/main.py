from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.pipeline import router as pipeline_router
from routes.validate import router as validate_router
from routes.upload   import router as upload_router

app = FastAPI(title="EarthMind API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pipeline_router, prefix="/api")
app.include_router(validate_router, prefix="/api")
app.include_router(upload_router,   prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "EarthMind API"}