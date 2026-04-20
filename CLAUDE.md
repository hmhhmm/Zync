# CLAUDE.md — EarthMind Project Guide

This file tells Claude Code exactly how this project is structured,
what each file does, and how to work on it without breaking things.

---

## What this project is

EarthMind is a multi-agent AI backend that helps Malaysian site engineers
make hydrometallurgical decisions for Rare Earth Element (REE) processing.
It uses Z.ai's GLM-5.1 model via the ZhipuAI API.

The core feature is **streaming chemistry reasoning** — Agent 2 streams
GLM's thinking trace token by token to the frontend via Server-Sent Events (SSE).

---

## How to run

```bash
# 1. Set your GLM API key
cp .env.example .env
# Edit .env — set GLM_API_KEY

# 2. Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 3. Frontend
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

Databases (Neo4j, PostgreSQL, Qdrant) are OPTIONAL for MVP.
Every agent has graceful fallbacks if DBs are not connected.
Only GLM_API_KEY is required to run.

To start databases:
```bash
docker-compose up -d
```

---

## Project structure

```
earthmind/
├── CLAUDE.md                   ← you are here
├── .env.example                ← copy to .env, fill GLM_API_KEY
├── docker-compose.yml          ← Neo4j + PostgreSQL + Qdrant
│
├── backend/
│   ├── main.py                 ← FastAPI app, mounts all routers
│   ├── config.py               ← reads all env vars, single source of truth
│   ├── requirements.txt
│   │
│   ├── routes/                 ← HTTP endpoints
│   │   ├── pipeline.py         ← POST /api/pipeline  (main SSE stream)
│   │   ├── validate.py         ← POST /api/validate  (5 known answer tests)
│   │   └── upload.py           ← POST /api/upload/pdf
│   │
│   ├── agents/                 ← one file per agent
│   │   ├── base_agent.py       ← shared GLM call logic (read this first)
│   │   ├── agent0_router.py    ← classifies request, routes pipeline
│   │   ├── agent1_historian.py ← retrieves historical Malaysian REE cases
│   │   ├── agent2_chemist.py   ← streaming SciGLM chemistry reasoning ★
│   │   ├── agent3_optimizer.py ← iteration table, no GLM prompt needed
│   │   ├── agent4_compliance.py← AELB + DOE + JMG regulatory checks
│   │   └── agent5_reporter.py  ← assembles final bilingual report
│   │
│   ├── prompts/                ← system prompts for each GLM agent
│   │   ├── agent0_prompt.py    ← router classification prompt
│   │   ├── agent1_prompt.py    ← historian JSON output prompt
│   │   ├── agent2_prompt.py    ← SciGLM hydrometallurgy expert prompt ★
│   │   ├── agent4_prompt.py    ← bilingual BM+EN compliance prompt
│   │   └── agent5_prompt.py    ← report writer prompt
│   │   NOTE: No agent3_prompt — Agent 3 uses pure Python math, no GLM call
│   │
│   ├── rag/                    ← database retrieval logic
│   │   ├── graph_rag.py        ← Neo4j Cypher queries (Agent 1)
│   │   ├── sql_rag.py          ← PostgreSQL iteration queries (Agent 3)
│   │   └── hybrid_search.py    ← Qdrant vector+keyword search (Agent 4)
│   │
│   ├── tools/                  ← GLM function-calling tools
│   │   ├── lixiviant_kb.py     ← knowledge base lookup + tool definition
│   │   ├── doe_checker.py      ← DOE/AELB/JMG regulation rules
│   │   ├── sfiles_formatter.py ← SFILES 2.0 string builder/validator
│   │   └── pdf_extractor.py    ← PyMuPDF text extraction
│   │
│   ├── schemas/
│   │   ├── input_schema.py     ← Pydantic models for all API inputs
│   │   └── output_schema.py    ← Pydantic models for all agent outputs
│   │
│   └── db/
│       ├── neo4j_client.py     ← Neo4j async driver
│       ├── postgres_client.py  ← asyncpg connection pool
│       └── qdrant_client.py    ← Qdrant client
│
├── frontend/
│   └── src/
│       ├── App.jsx             ← router, nav
│       ├── pages/
│       │   ├── Pipeline.jsx    ← deposit profile form
│       │   ├── Results.jsx     ← SSE listener, renders all agent outputs
│       │   └── Validate.jsx    ← 5 known answer test runner
│       └── components/
│           ├── ReasoningStream.jsx  ← live GLM thinking trace (killer feature)
│           ├── DecisionCard.jsx     ← structured flowsheet output
│           ├── ESGBadge.jsx         ← compliance pass/fail per regulation
│           ├── IterationTable.jsx   ← Agent 3 optimization table
│           └── FlowsheetBlock.jsx   ← SFILES 2.0 visual pipeline
│
└── data/
    ├── lixiviant_kb/
    │   ├── lixiviant_kb.json   ← 4 lixiviant entries (seed, can expand)
    │   └── doe_rules.json      ← 6 Malaysian regulatory rules (seed)
    ├── sample_deposits/
    │   └── sample_deposit_01.json ← demo deposit for testing
    ├── sample_pdfs/            ← put test PDFs here (.gitkeep holds folder)
    └── validation/
        └── known_answers.json  ← 5 ground truth test cases
```

---

## Agent pipeline flow

```
POST /api/pipeline
    │
    ├─ Agent 0 (Router)        — classify request type
    ├─ Agent 1 (Historian)     — get historical Malaysian REE context
    ├─ Agent 2 (Chemist) ★     — stream SciGLM chemistry reasoning live
    ├─ Agent 3 (Optimizer)     — generate iteration table (no GLM)
    ├─ Agent 4 (Compliance)    — check AELB + DOE + JMG regulations
    └─ Agent 5 (Reporter)      — assemble final bilingual report
```

All events are streamed via SSE. Frontend (Results.jsx) listens and
renders each agent's output as it arrives.

---

## The GLM API

All GLM calls go through `backend/agents/base_agent.py`. Three functions:

- `call_glm()` — single call, returns dict with output + reasoning
- `stream_glm()` — async generator, yields reasoning/output/done chunks
- `call_glm_with_tools()` — multi-turn tool use loop (max 5 rounds)

The GLM API key is read from `GLM_API_KEY` in `.env`.
Model is set via `GLM_MODEL` — default `glm-4-flash` for dev, use `glm-4-plus` for demo.

The `reasoning_content` field in GLM responses is the XAI reasoning trace.
Agent 2 streams this live. Agent 5 uses it to populate the report.

---

## Why no agent3_prompt.py

Agent 3 (Optimizer) does NOT call GLM. It runs pure Python math:
- Takes Agent 2's flowsheet as the baseline (iteration 1)
- Generates 4 synthetic iterations by adjusting pH/temp/concentration
- Uses a hardcoded thorium risk model (_estimate_thorium function)
- Finds the best compliant iteration (highest yield, thorium < 1.0 Bq/g)
- Stores results in PostgreSQL if connected

No language model is needed here — the optimization is deterministic math.
For the full 600-iteration version, you'd add a GLM call inside the loop
to suggest the next parameter set based on previous results.

---

## Data files — what needs real input

### data/lixiviant_kb/lixiviant_kb.json
Status: SEEDED — 4 entries, works as-is for MVP demo.
To improve: add more lixiviant entries with real Malaysian yield data.
Each entry needs: name, formula, clay_types[], concentration_M[],
pH_range, yield_range_pct[], esg_risk_score, thorium_risk, cost_index.

### data/lixiviant_kb/doe_rules.json
Status: SEEDED — 6 rules, covers AELB + DOE + JMG for MVP.
To improve: add more DOE EQA Schedule 10 parameters, AELB 1986 clauses.
Each rule needs: id, body, name, parameter, limit, unit, regulation, tags[].

### data/validation/known_answers.json
Status: SEEDED — 5 tests, ready to run.
To improve: add more tests using published Malaysian REE literature.
Ground truth must come from a real published source — cite it in "source".

### data/sample_deposits/sample_deposit_01.json
Status: SEEDED — one demo deposit (Bukit Merah, Perak).
To improve: add more sample deposits for different states and clay types
so the demo can show variety.

### data/sample_pdfs/
Status: EMPTY — needs real PDFs for the upload demo.
Add: actual Malaysian geological survey PDFs here.
The upload endpoint (POST /api/upload/pdf) will extract parameters from them.
Without a real PDF, the upload feature cannot be demoed.

---

## Key decisions to know

**Why FastAPI?** Async-native — critical for SSE streaming and long GLM calls.

**Why SSE not WebSocket?** SSE is one-directional (server → client),
simpler for this use case. No need for bidirectional communication.

**Why json_mode=True on most agents?**
Forces GLM to output valid JSON every time. Without it, GLM may add
markdown fences or prose around the JSON, breaking parsing.

**Why temperature=0.1?**
Engineering decisions need to be deterministic and reproducible.
Low temperature = consistent answers. Do not raise above 0.3.

**Why BM in agent4_prompt?**
Agent 4's system prompt is bilingual. GLM will output in the language
of the system prompt. This is the demo moment that proves EarthMind
was built for Malaysian engineers, not imported from abroad.

---

## Common tasks

**Add a new lixiviant to the knowledge base:**
Edit `data/lixiviant_kb/lixiviant_kb.json` — add a new JSON object.
The tool in `backend/tools/lixiviant_kb.py` reads this file at runtime.

**Change the GLM model:**
Edit `GLM_MODEL` in `.env`. Options: glm-4-flash (fast/cheap), glm-4-plus (better).

**Add a new validation test:**
Edit `data/validation/known_answers.json` — add a new test object.
Must have: id, type (chemistry|compliance), scenario, question,
ground_truth, source, input dict.

**Test a single agent without running the full pipeline:**
```python
# From backend/ directory
import asyncio
from agents.agent2_chemist import run_chemist_with_tools

async def test():
    result = await run_chemist_with_tools(
        deposit_profile={"location": "Kelantan", "clay_type": "laterite", "ree_grade": 0.08, "state": "Kelantan"},
        historical_context={"cases_found": 0, "cases": [], "summary": ""}
    )
    print(result)

asyncio.run(test())
```

**Run the validation tests:**
```bash
curl -X POST http://localhost:8000/api/validate \
  -H "Content-Type: application/json" \
  -d "{}"
```

---

## What is NOT yet implemented

- Neo4j graph seeding with real Malaysian data (graph_rag.py has seed function but data is placeholder)
- Qdrant collection creation and document ingestion for hybrid search
- Real 600-iteration GLM optimization loop in Agent 3
- JWT authentication (auth middleware stub exists in schemas)
- IoT sensor integration (roadmap item)

These are all explicitly marked in the code with comments.