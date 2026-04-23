import os
from dotenv import load_dotenv

load_dotenv()

# ILMU API (YTL AI Labs — Malaysian sovereign inference, OpenAI-compatible)
GLM_API_KEY = os.getenv("ILMU_API_KEY", os.getenv("GLM_API_KEY", ""))
GLM_MODEL   = os.getenv("ILMU_MODEL", os.getenv("GLM_MODEL", "ilmu-glm-5.1"))
GLM_URL     = os.getenv("ILMU_BASE_URL", "https://api.ilmu.ai/v1")

# Databases
NEO4J_URI      = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER     = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "zync1234")

POSTGRES_URL   = os.getenv("POSTGRES_URL", "postgresql://zync:zync1234@localhost:5432/zync")

QDRANT_HOST    = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT    = int(os.getenv("QDRANT_PORT", 6333))

# Admin
ADMIN_SECRET   = os.getenv("ADMIN_SECRET", "zync-admin")