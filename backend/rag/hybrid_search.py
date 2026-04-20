import json
from db.qdrant_client import get_client

COLLECTION = "regulations"


async def hybrid_search(query: str, top_k: int = 5) -> list:
    """
    Hybrid search over regulatory documents.
    Combines vector (semantic) + keyword (exact) search.

    In production: Qdrant sparse+dense hybrid search
    For MVP: returns filtered rules from doe_checker fallback
    """
    client = get_client()

    if client is None:
        # MVP fallback: keyword filter over static rules
        return _keyword_filter(query, top_k)

    try:
        results = client.search(
            collection_name=COLLECTION,
            query_vector=("dense", await _embed(query)),
            query_sparse_vector=("sparse", _sparse(query)),
            limit=top_k,
        )
        return [r.payload for r in results]
    except Exception:
        return _keyword_filter(query, top_k)


def _keyword_filter(query: str, top_k: int) -> list:
    """Simple keyword match over fallback rules when Qdrant unavailable."""
    from tools.doe_checker import _FALLBACK_RULES
    query_lower = query.lower()
    keywords = ["thorium", "ammonium", "ph", "discharge", "aelb", "doe", "permit"]

    matched = []
    for rule in _FALLBACK_RULES:
        rule_text = json.dumps(rule).lower()
        if any(kw in query_lower and kw in rule_text for kw in keywords):
            matched.append(rule)

    # Always include radioactivity and pH rules
    always = [r for r in _FALLBACK_RULES if "always" in r.get("tags", [])]
    combined = {r["id"]: r for r in matched + always}
    return list(combined.values())[:top_k]


async def _embed(text: str) -> list:
    """
    Generate dense embedding for vector search.
    In production: use a multilingual embedding model.
    For MVP: returns zero vector (Qdrant falls back to keyword only).
    """
    return [0.0] * 768


def _sparse(text: str) -> dict:
    """
    Generate sparse vector for keyword search (BM25-style).
    For MVP: returns empty dict.
    """
    return {}