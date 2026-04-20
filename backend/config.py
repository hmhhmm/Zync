import os
from dotenv import load_dotenv

load_dotenv()

# GLM / Z.ai
GLM_API_KEY = os.getenv("GLM_API_KEY", "")
GLM_MODEL   = os.getenv("GLM_MODEL", "glm-4-flash")
GLM_URL     = "https://open.bigmodel.cn/api/paas/v4/chat/completions"

# Databases
NEO4J_URI      = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER     = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

POSTGRES_URL   = os.getenv("POSTGRES_URL", "postgresql://user:password@localhost:5432/earthmind")

QDRANT_HOST    = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT    = int(os.getenv("QDRANT_PORT", 6333))