from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes.pipeline import router as pipeline_router
from routes.validate import router as validate_router
from routes.upload   import router as upload_router

load_dotenv()

app = FastAPI(
    title="Zync API",
    description="Agentic AI Intelligence Hub for Malaysian REE Optimization",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pipeline_router, prefix="/api")
app.include_router(validate_router, prefix="/api")
app.include_router(upload_router,   prefix="/api")

@app.get("/")
def root():
    return {"message": "Zync backend is running"}

@app.get("/health")
async def health():
    return {"status": "ok", "service": "Zync API"}
