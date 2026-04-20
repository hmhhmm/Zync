# Zync — Malaysia's Sovereign REE Engineering Intelligence

> Putting GLM-5.1's scientific reasoning at the point where Malaysia's RM 1 trillion rare earth ambition is won or lost.

## What it does
EarthMind is a multi-agent AI system that helps Malaysian site engineers make three critical hydrometallurgical decisions:
1. **Process Diagnosis** — why did my yield drop?
2. **Lixiviant Selection** — what chemistry should I use on this soil?
3. **Zone Prioritisation** — which zone do I mine first?

## Tech Stack
- **AI** — Z.ai GLM-5.1 (SciGLM, 202K context, streaming reasoning)
- **Backend** — FastAPI (Python), Server-Sent Events for streaming
- **RAG** — GraphRAG (Neo4j), SQL RAG (PostgreSQL), Hybrid Search (Qdrant)
- **Frontend** — React, Bahasa Malaysia + English

## Agent Pipeline
```
Operator Input
    → Agent 0 (Router)
    → Agent 1 (Historian — GraphRAG)
    → Agent 2 (Chemist — SciGLM ★ streaming)
    → Agent 3 (Optimizer) + Agent 4 (Compliance) [parallel]
    → Agent 5 (Report Writer)
```

## Quick Start
```bash
# Backend
cd backend
pip install -r requirements.txt
cp ../.env.example ../.env   # fill in your GLM API key
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## Team
Built for UM Hackathon 2026
