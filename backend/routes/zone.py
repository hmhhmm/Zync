import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from schemas.input_schema import ZonePrioritisationRequest
from agents.agent6_zone_prioritiser import run_zone_prioritiser

router = APIRouter()


@router.post("/zone")
async def zone_prioritisation(body: ZonePrioritisationRequest):
    """
    Zone Prioritisation endpoint — streams Agent 6 events via SSE.

    Frontend receives:
      reasoning chunks → live GLM thinking trace (right panel)
      step chunks      → deliberate step-by-step analysis text (right panel)
      done chunk       → final ranked recommendation card (left panel)
    """
    zones = [z.model_dump() for z in body.zones]

    async def event_stream():
        try:
            yield _event({"agent": 6, "status": "analysing", "zones": len(zones)})

            async for chunk in run_zone_prioritiser(body.location, body.state, zones):
                if chunk["type"] == "reasoning":
                    yield _event({"agent": 6, "type": "reasoning", "text": chunk["text"]})

                elif chunk["type"] == "step":
                    yield _event({"agent": 6, "type": "step", "text": chunk["text"]})

                elif chunk["type"] == "done":
                    yield _event({
                        "agent":    6,
                        "status":   "done",
                        "location": body.location,
                        "state":    body.state,
                        "result":   chunk["result"],
                    })

                elif chunk["type"] == "error":
                    yield _event({"agent": 6, "status": "error", "message": chunk["message"]})
                    return

            yield "data: [DONE]\n\n"

        except Exception as e:
            yield _event({"status": "error", "message": str(e)})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"
