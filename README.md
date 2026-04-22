# Zync — Malaysia's Sovereign REE Engineering Intelligence

> GLM-5.1's scientific reasoning at the point where Malaysia's RM 1 trillion rare earth ambition is won or lost.

Malaysia's REE ambition depends on solving hydrometallurgical decisions the country doesn't have enough engineers to make correctly at scale. Zync puts sovereign AI reasoning at those three decision points.

## The Three Decisions

| # | Decision | What it solves | Agent |
|---|---|---|---|
| 1 | **Process Diagnosis** | Why did my yield drop? | Agent 2 (streaming SciGLM) |
| 2 | **Lixiviant Selection** | What chemistry for this soil? | Agent 2 + function calling |
| 3 | **Zone Prioritisation** | Which zone do I invest in first? | Agent 6 (scored ranking) |

## GLM Capability Layers Demonstrated

- **Streaming reasoning trace** — GLM's thinking visible token by token (Decision 1 & 2)
- **Function calling** — lixiviant knowledge base lookup mid-reasoning (Decision 2)
- **Long context multi-variable scoring** — all zone profiles assessed simultaneously (Decision 3)
- **Bahasa Malaysia output** — compliance and zone recommendations in BM (Decision 3)
- **Known answer validation** — 5 tests against published Malaysian REE literature

## Tech Stack
- **AI** — Z.ai GLM-5.1 (SciGLM, 202K context, streaming reasoning)
- **Backend** — FastAPI (Python), Server-Sent Events for streaming
- **RAG** — GraphRAG (Neo4j), Hybrid Search (fastembed + Qdrant)
- **Frontend** — React + Vite, Bahasa Malaysia + English

## API Endpoints

| Endpoint | Description |
|---|---|
| `POST /api/pipeline` | Full 6-agent SSE pipeline (Decisions 1 & 2) |
| `POST /api/zone` | Zone Prioritisation SSE stream (Decision 3) |
| `POST /api/validate` | 5 known answer tests against Malaysian REE literature |
| `POST /api/upload/pdf` | Geological survey PDF extraction |
| `POST /api/admin/seed` | Seed Neo4j with Malaysian REE case history |

## Agent Pipeline

```
Decision 1 & 2 — POST /api/pipeline
    → Agent 0 (Router)
    → Agent 1 (Historian — GraphRAG)
    → Agent 2 (Chemist — SciGLM ★ streaming reasoning)
    → Agent 3 (Optimizer — GLM iteration loop ★ live streaming)
    → Agent 4 (Compliance — bilingual AELB + DOE + JMG)
    → Agent 5 (Report Writer)

Decision 3 — POST /api/zone
    → Agent 6 (Zone Prioritiser — 5-step scoring ★ streaming)
```

## Quick Start

### 1. Configure environment
```bash
# Add your GLM_API_KEY to backend/.env
# (copy backend/.env.example if it doesn't exist)
```

### 2. Start frontend + backend + all databases (Docker)
```bash
docker compose up --build
# Backend API → http://localhost:8000
# Neo4j, PostgreSQL, Qdrant all start automatically
```

### 3. Seed the databases (first run only)
```bash
curl -X POST http://localhost:8000/api/admin/seed -H "X-Admin-Secret: zync-admin"
curl -X POST http://localhost:8000/api/admin/seed-qdrant -H "X-Admin-Secret: zync-admin"
```


The frontend proxies `/api/*` to the backend at `http://localhost:8000` (see `frontend/vite.config.js`).

> **Daily startup:** `docker compose up` (no `--build` needed unless code changed). Stop with `docker compose down`.

## Team
Built for UM Hackathon 2026.
