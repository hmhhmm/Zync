# Zync — Malaysia's Sovereign REE Engineering Intelligence

> Putting GLM-5.1's scientific reasoning at the point where Malaysia's RM 1 trillion rare earth ambition is won or lost.

## What it does
Zync is a multi-agent AI system that helps Malaysian site engineers make three critical hydrometallurgical decisions:
1. **Process Diagnosis** — why did my yield drop?
2. **Lixiviant Selection** — what chemistry should I use on this soil?
3. **Zone Prioritisation** — which zone do I mine first?

## Tech Stack
- **AI** — Z.ai GLM-5.1 (SciGLM, 202K context, streaming reasoning)
- **Backend** — FastAPI (Python), Server-Sent Events for streaming
- **RAG** — GraphRAG (Neo4j), SQL RAG (PostgreSQL), Hybrid Search (Qdrant)
- **Frontend** — React + Vite, Bahasa Malaysia + English

## Agent Pipeline
```
Operator Input
    → Agent 0 (Router)
    → Agent 1 (Historian — GraphRAG)
    → Agent 2 (Chemist — SciGLM ★ streaming)
    → Agent 3 (Optimizer — GLM iteration loop) + Agent 4 (Compliance) [parallel]
    → Agent 5 (Report Writer)
```

## Quick Start

### Backend (Docker)
```bash
cp .env.example .env   # fill in API keys
docker compose up --build
# API available at http://localhost:8000
```

### Frontend (Vite dev server)
```bash
cd frontend
npm install
npm run dev
# UI available at http://localhost:5173
```

The frontend proxies `/api/*` to the backend at `http://localhost:8000` (see `frontend/vite.config.js`).

## Team
Built for UM Hackathon 2026.
