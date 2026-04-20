import asyncpg
from config import POSTGRES_URL

_pool = None

async def get_db():
    """Get PostgreSQL connection from pool. Returns None if not connected."""
    global _pool
    if _pool is None:
        try:
            _pool = await asyncpg.create_pool(POSTGRES_URL, min_size=1, max_size=5)
        except Exception:
            return None
    return await _pool.acquire()