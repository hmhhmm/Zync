"""
Hybrid search over Malaysian REE regulatory documents.
Combines:
  - Dense vector search  (semantic — finds contextually related regulations)
  - Sparse keyword search (exact    — finds exact thresholds like "1.0 Bq/g")

Uses Qdrant as the vector store.
Embedding model: BAAI/bge-small-en-v1.5 via fastembed
  - CPU-only, ~50MB download
  - 384-dimensional vectors
  - No PyTorch dependency

Collection must be seeded first via POST /api/admin/seed-qdrant
"""

import json
from db.qdrant_client import get_client

COLLECTION    = "regulations"
EMBEDDING_DIM = 384
MODEL_NAME    = "BAAI/bge-small-en-v1.5"

# Lazy-load model — only loads when first called
_model = None


def _get_model():
    """Load fastembed model once and cache it."""
    global _model
    if _model is None:
        try:
            from fastembed import TextEmbedding
            _model = TextEmbedding(model_name=MODEL_NAME)
        except ImportError:
            return None
    return _model


async def embed(text: str) -> list[float]:
    """
    Generate dense embedding for semantic search.
    Returns 384-dimensional vector.
    Falls back to zero vector if model not available.
    """
    model = _get_model()
    if model is None:
        return [0.0] * EMBEDDING_DIM
    try:
        vectors = list(model.embed([text]))
        return vectors[0].tolist()
    except Exception:
        return [0.0] * EMBEDDING_DIM


async def hybrid_search(query: str, top_k: int = 5) -> list:
    """
    Hybrid search over regulatory documents.

    Strategy:
    1. Try Qdrant dense vector search (semantic)
    2. Merge with keyword filter results (exact thresholds)
    3. Deduplicate and return top_k

    Falls back to keyword-only if Qdrant unavailable.
    """
    client = get_client()

    if client is None:
        return _keyword_filter(query, top_k)

    try:
        collections = [c.name for c in client.get_collections().collections]
        if COLLECTION not in collections:
            return _keyword_filter(query, top_k)

        query_vector = await embed(query)
        dense_results = client.search(
            collection_name=COLLECTION,
            query_vector=query_vector,
            limit=top_k,
            with_payload=True,
        )
        dense_hits = [r.payload for r in dense_results]

        keyword_hits = _keyword_filter(query, top_k)

        merged = {r["id"]: r for r in dense_hits}
        for hit in keyword_hits:
            if hit["id"] not in merged:
                merged[hit["id"]] = hit

        return list(merged.values())[:top_k]

    except Exception:
        return _keyword_filter(query, top_k)


async def seed_qdrant(rules: list) -> dict:
    """
    Seeds Qdrant collection with regulatory documents.
    Called by POST /api/admin/seed-qdrant.
    Uses upsert so re-seeding is safe.
    """
    client = get_client()
    if client is None:
        return {"success": False, "error": "Qdrant not connected"}

    try:
        from qdrant_client.models import Distance, VectorParams, PointStruct

        collections = [c.name for c in client.get_collections().collections]
        if COLLECTION not in collections:
            client.create_collection(
                collection_name=COLLECTION,
                vectors_config=VectorParams(
                    size=EMBEDDING_DIM,
                    distance=Distance.COSINE,
                ),
            )

        points = []
        for i, rule in enumerate(rules):
            searchable_text = (
                f"{rule.get('name', '')} "
                f"{rule.get('condition', '')} "
                f"{rule.get('regulation', '')} "
                f"{rule.get('parameter', '')} "
                f"{rule.get('unit', '')} "
                f"{' '.join(rule.get('tags', []))}"
            )
            vector = await embed(searchable_text)
            points.append(PointStruct(id=i, vector=vector, payload=rule))

        client.upsert(collection_name=COLLECTION, points=points)

        return {
            "success":    True,
            "seeded":     len(points),
            "collection": COLLECTION,
            "model":      MODEL_NAME,
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


async def get_collection_info() -> dict:
    """Returns info about the regulations collection."""
    client = get_client()
    if client is None:
        return {"connected": False}
    try:
        collections = [c.name for c in client.get_collections().collections]
        if COLLECTION not in collections:
            return {"connected": True, "collection_exists": False, "count": 0}
        info = client.get_collection(COLLECTION)
        return {
            "connected":         True,
            "collection_exists": True,
            "count":             info.points_count,
            "vector_size":       EMBEDDING_DIM,
            "model":             MODEL_NAME,
        }
    except Exception as e:
        return {"connected": True, "error": str(e)}


def _keyword_filter(query: str, top_k: int) -> list:
    """Keyword fallback when Qdrant unavailable."""
    from tools.doe_checker import _FALLBACK_RULES
    query_lower = query.lower()
    keywords = [
        "thorium", "ammonium", "ph", "discharge",
        "aelb", "doe", "permit", "radioactiv", "nitrogen",
        "suspended", "solid", "effluent", "jmg",
    ]
    matched = []
    for rule in _FALLBACK_RULES:
        rule_text = json.dumps(rule).lower()
        if any(kw in query_lower and kw in rule_text for kw in keywords):
            matched.append(rule)
    always = [r for r in _FALLBACK_RULES if "always" in r.get("tags", [])]
    combined = {r["id"]: r for r in matched + always}
    return list(combined.values())[:top_k]