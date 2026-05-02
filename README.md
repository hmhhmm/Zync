# Zync — Malaysia's Sovereign REE Engineering Intelligence

> Putting GLM-5.1's scientific reasoning at the exact point where Malaysia's RM 1 trillion rare earth ambition is won or lost.

Malaysia sits on RM 1 trillion in Rare Earth Element (REE) resources but lacks the hydrometallurgical engineering depth to process them independently. Every critical processing decision — which lixiviant to use, why yields are dropping, which zone to invest in — currently depends on foreign expertise or goes unmade. Zync changes that.

---

## Demo

| Resource | Link |
|---|---|
| Pitch Deck | [ZYNC](https://canva.link/cne9bpdxwz3f12l) |
| Demo Video | [Video](https://youtu.be/p5k_B3rlL3A) |
| Deployed Link | https://zync-bay.vercel.app/ |
| Documentation | [`documents/`](documents/) |

---

## The Three Decisions

Zync is not a chatbot. It is a **three-decision engine** backed by GLM-5.1's scientific reasoning, grounded in real Malaysian geological data, and enforced by live compliance checking against AELB, DOE, and JMG regulations.

| Decision | Question it answers | Key capability |
|---|---|---|
| **Process Diagnosis** | Why did my yield drop? | Streaming SciGLM causal reasoning |
| **Lixiviant Selection** | What chemistry for this soil? | GraphRAG + GLM function calling + 15-iteration optimization loop |
| **Zone Prioritisation** | Which zone do I invest in first? | 5-step scored ranking across economic, ESG, and infrastructure dimensions |

---

## What Makes This Different

Most AI systems in this space are:

```text
Frontend → one LLM call → response
```

Zync is:

```text
Frontend → Router → right agent → right database → grounded GLM reasoning → streamed response
```

Every recommendation is grounded in real data — not hallucination:

- **Agent 1** queries a Neo4j knowledge graph of real Malaysian REE processing history (10 verified cases across 8 states)
- **Agent 2** reasons from published chemistry literature via SciGLM
- **Agent 3** runs a live GLM optimization loop — each iteration simultaneously checked by Agent 4 for compliance
- **Agent 4** retrieves relevant regulations via hybrid vector + keyword search (Qdrant + fastembed) before reasoning
- **Agent 5** synthesises everything into a bilingual BM + EN report
- **Agent 6** scores multiple zones simultaneously across 5 dimensions — HREE strategic value, ESG regulatory exposure, infrastructure cost, 13MP alignment, and capital efficiency — and outputs a ranked investment recommendation in Bahasa Malaysia

---

## System Architecture
![Zync system architecture](documents/Screenshot%202026-05-03%20at%203.52.13%E2%80%AFAM.png)

The main idea is that every user action is routed through the backend agents, which pull from the graph, rules, and optimization data before producing the final recommendation.

---

## GLM Capability Layers

| Capability | Where it's used |
|---|---|
| Streaming `reasoning_content` | Agent 2 — chemistry thinking visible token by token |
| Function calling | Agent 2 — lixiviant knowledge base lookup mid-reasoning |
| Long context (202K tokens) | Agent 1 — ingests geological survey PDFs |
| JSON structured output | All agents — no freeform text, every output is typed |
| Bahasa Malaysia output | Agent 4 + Agent 6 — compliance and zone ranking in BM |
| Multi-variable scoring | Agent 6 — 5-step framework scoring across economic, ESG, and infrastructure dimensions simultaneously |

---

## Agent Pipeline

```text
Decision 1 & 2 — POST /api/pipeline
─────────────────────────────────────
Agent 0  Router          Classifies request, routes to correct pipeline
Agent 1  Historian       GraphRAG — traverses Neo4j knowledge graph
Agent 2  Chemist ★       SciGLM streaming reasoning, function calling
Agent 3  Optimizer       Live GLM iteration loop with compliance feedback
Agent 4  Compliance      Hybrid search (Qdrant) + AELB + DOE + JMG checks
Agent 5  Report Writer   Bilingual BM + EN report, PDF export

Decision 3 — POST /api/zone
─────────────────────────────────────
Agent 6  Zone Prioritiser   5-step scoring: HREE value, ESG, infrastructure
							Outputs ranked investment recommendation in BM + EN
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI | Z.ai GLM-5.1 (SciGLM, 202K context, streaming) |
| Backend | FastAPI, Python, Server-Sent Events |
| Knowledge Graph | Neo4j — GraphRAG for historical Malaysian REE cases |
| Vector Search | Qdrant + fastembed — hybrid search over regulatory documents |
| Iteration Storage | PostgreSQL — optimization iterations stored per session |
| Frontend | React + Vite, Bahasa Malaysia + English |

---

## Quick Start

### Prerequisites
- Docker Desktop
- GLM API key from [console.ilmu.ai](https://console.ilmu.ai) or [z.ai](https://z.ai)

### 1. Configure environment

```bash
cp .env.example backend/.env
# Open backend/.env and set:
# GLM_API_KEY=your_key_here
# GLM_MODEL=ILMU-GLM-5.1
# GLM_URL=https://api.ilmu.ai/v1/chat/completions
```

### 2. Start everything

```bash
docker compose up --build
```

- Backend API → `http://localhost:8000`
- Frontend → `http://localhost:5173`
- API docs → `http://localhost:8000/docs`
- Neo4j browser → `http://localhost:7474`

### 3. Seed databases (first run only)

```bash
# Seed Neo4j with Malaysian REE historical cases
curl -X POST http://localhost:8000/api/admin/seed \
	-H "X-Admin-Secret: zync-admin"

# Seed Qdrant with regulatory documents
curl -X POST http://localhost:8000/api/admin/seed-qdrant \
	-H "X-Admin-Secret: zync-admin"

# Verify both are ready
curl http://localhost:8000/api/admin/status \
	-H "X-Admin-Secret: zync-admin"
```

Expected output:

```json
{
	"neo4j": { "cases_in_graph": 10, "ready": true },
	"qdrant": { "regulations_count": 6, "ready": true }
}
```

### 4. Daily startup

```bash
docker compose up
# Stop with: docker compose down
```

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/pipeline` | POST | Full 6-agent SSE pipeline (Decisions 1 & 2) |
| `/api/zone` | POST | Zone Prioritisation SSE stream (Decision 3) |
| `/api/validate` | POST | 5 known answer tests against Malaysian REE literature |
| `/api/upload/pdf` | POST | Geological survey PDF → auto-fill deposit form |
| `/api/admin/seed` | POST | Seed Neo4j with Malaysian REE case history |
| `/api/admin/seed-qdrant` | POST | Seed Qdrant with regulatory documents |
| `/api/admin/status` | GET | Verify all databases are ready |
| `/health` | GET | Backend health check |

---

## Validation

Zync's scientific reasoning is validated against 5 published Malaysian REE sources:

| Test | Ground truth | Source |
|---|---|---|
| Laterite clay lixiviant | Ammonium sulfate, pH 4.0-4.5 | Fendy et al., BIO Web of Conferences 2023 |
| AELB thorium limit | 1.0 Bq/g (fail at pH 3.8) | AELB Regulations 1986, Regulation 26 |
| Low-ESG lixiviant | Magnesium/sodium sulfate | Sobri et al., Jurnal Teknologi 2025 |
| DOE discharge standard | pH 6-9, NH3-N < 10 mg/L | DOE EQA 1974 Schedule 10 Standard B |
| Insufficient data handling | Returns low confidence | OECD AI Principles 2023 |

Run validation:

```bash
curl -X POST http://localhost:8000/api/validate \
	-H "Content-Type: application/json" \
	-d '{}'
```

---

## Project Structure

```text
Zync/
├── backend/
│   ├── agents/          # Agent 0-6 — one file per agent
│   ├── prompts/         # System prompts for each GLM agent
│   ├── rag/             # GraphRAG, SQL RAG, hybrid search
│   ├── tools/           # Lixiviant KB, DOE checker, PDF extractor
│   └── tests/           # Validation and backend tests
├── data/
│   ├── known_cases/     # Malaysian REE historical cases (Neo4j seed)
│   ├── lixiviant_kb/    # Lixiviant knowledge base + DOE rules
│   ├── sample_deposits/ # Demo deposit profiles
│   └── validation/      # 5 known answer tests
├── documents/           # Proposal, deployment plan, QATD, demo deck
├── frontend/
│   └── src/
│       ├── components/  # UI, layout, trust, landing
│       ├── hooks/       # Data fetching and streaming hooks
│       └── modules/     # Diagnosis, Lixiviant, Zone Strategy
├── docker-compose.yml
├── .env.example
├── CLAUDE.md            # Developer guide
└── README.md
```

---

## Built by Team Gunners

Zync demonstrates that frontier AI reasoning — grounded in real Malaysian data and enforced by real Malaysian regulations — can close the hydrometallurgical expertise gap that currently forces Malaysia to export raw minerals instead of processing them independently.

*Malaysia moves from raw material exporter to sovereign REE processor.*
