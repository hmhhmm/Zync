import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from schemas.input_schema import PipelineRequest
from agents.agent0_router    import route_request
from agents.agent1_historian import get_historical_context
from agents.agent2_chemist   import run_chemist
from agents.agent3_optimizer import run_optimizer
from agents.agent4_compliance import check_compliance
from agents.agent5_reporter  import generate_report

router = APIRouter()


@router.post("/pipeline")
async def run_pipeline(body: PipelineRequest):
    """
    Main pipeline endpoint — streams all agent events via SSE.

    Frontend listens with EventSource and renders each event:
    - agent status updates  → progress indicators
    - reasoning chunks      → live GLM thinking display (killer feature)
    - output chunks         → answer building up
    - final results         → decision cards, ESG badges, report
    """
    deposit = body.deposit_profile.model_dump()

    async def event_stream():
        try:
            # ── Agent 0: Route ────────────────────────────────────────────────
            yield _event({"agent": 0, "status": "routing"})
            route = await route_request(str(deposit))
            yield _event({"agent": 0, "status": "done", "route": route})

            # ── Agent 1: Historical context ───────────────────────────────────
            yield _event({"agent": 1, "status": "searching"})
            historical = await get_historical_context(deposit)
            yield _event({
                "agent":        1,
                "status":       "done",
                "cases_found":  historical.get("cases_found", 0),
                "summary":      historical.get("summary", ""),
            })

            # ── Agent 2: Chemistry reasoning (STREAMING) ──────────────────────
            yield _event({"agent": 2, "status": "thinking"})
            flowsheet = {}

            async for chunk in run_chemist(deposit, historical):
                if chunk["type"] == "reasoning":
                    # Live reasoning trace → XAI block on frontend
                    yield _event({"agent": 2, "type": "reasoning", "text": chunk["text"]})

                elif chunk["type"] == "output":
                    # Answer building up token by token
                    yield _event({"agent": 2, "type": "output", "text": chunk["text"]})

                elif chunk["type"] == "done":
                    flowsheet = chunk.get("flowsheet", {})
                    yield _event({
                        "agent":     2,
                        "status":    "done",
                        "flowsheet": flowsheet,
                    })

                elif chunk["type"] == "error":
                    yield _event({"agent": 2, "status": "error", "message": chunk["message"]})
                    return

            # ── Agent 3: Optimizer — streams each iteration live ──────────────
            yield _event({"agent": 3, "status": "optimizing"})
            optimization = {}

            async def stream_iteration(iteration: dict):
                """Forward each iteration to SSE as it completes."""
                yield_ev = _event({
                    "agent":     3,
                    "type":      "iteration",
                    "iteration": iteration,
                })
                # We can't yield inside a callback so we store for batch send
                pass

            all_iterations = []

            async def collect_iteration(iteration: dict):
                all_iterations.append(iteration)

            optimization = await run_optimizer(
                flowsheet,
                body.site_conditions or {},
                stream_callback=collect_iteration,
            )

            # Stream all iterations to frontend
            for it in optimization.get("iterations", []):
                yield _event({"agent": 3, "type": "iteration", "iteration": it})

            yield _event({
                "agent":          3,
                "status":         "done",
                "iterations":     optimization.get("iterations", []),
                "best_iteration": optimization.get("best_iteration", {}),
                "iterations_run": optimization.get("iterations_run", 0),
                "converged":      optimization.get("converged", False),
                "note":           optimization.get("optimization_note", ""),
            })

            # ── Agent 4: Compliance check ─────────────────────────────────────
            yield _event({"agent": 4, "status": "checking"})
            compliance = await check_compliance(flowsheet)
            yield _event({
                "agent":      4,
                "status":     "done",
                "compliance": compliance,
            })

            # ── Agent 5: Report generation ────────────────────────────────────
            yield _event({"agent": 5, "status": "writing"})
            report = await generate_report(
                deposit_profile=deposit,
                flowsheet=flowsheet,
                compliance=compliance,
                historical_context=historical,
            )
            yield _event({
                "agent":  5,
                "status": "done",
                "report": report,
            })

            yield "data: [DONE]\n\n"

        except Exception as e:
            yield _event({"status": "error", "message": str(e)})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _event(data: dict) -> str:
    """Format a dict as an SSE data line."""
    return f"data: {json.dumps(data)}\n\n"