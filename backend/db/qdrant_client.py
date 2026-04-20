from qdrant_client import QdrantClient as _QdrantClient
from config import QDRANT_HOST, QDRANT_PORT

_client = None

def get_client():
    global _client
    if _client is None:
        try:
            _client = _QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
        except Exception:
            return None
    return _client