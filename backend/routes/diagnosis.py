import json
import logging
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

log = logging.getLogger("zync.diagnosis")
from schemas.input_schema import DiagnosisRequest
from agents.agent_diagnosis import run_diagnosis

router = APIRouter()


@router.post("/diagnose")
async def diagnose(body: DiagnosisRequest):
    """
    Process Diagnosis endpoint — Decision 1.

    Accepts structured sensor readings and/or a base64 photo of a handwritten
    process log. Streams GLM's reasoning live, then outputs the diagnosis card.

    Frontend receives:
      reasoning chunks → live GLM thinking trace
      output chunks    → answer building up
      done chunk       → diagnosis card (root cause, confidence, action, ESG flag)
    """

    async def event_stream():
        try:
            log.info(f"diagnosis start — has_image={bool(body.log_image_b64)} readings={len(body.ph_readings or [])}")
            yield _event({"status": "diagnosing"})

            async for chunk in run_diagnosis(
                ph_readings=body.ph_readings or [],
                temperature=body.temperature or [],
                yield_pct=body.yield_pct or [],
                operator_notes=body.operator_notes,
                log_image_b64=body.log_image_b64,
            ):
                if chunk["type"] == "reasoning":
                    yield _event({"type": "reasoning", "text": chunk["text"]})

                elif chunk["type"] == "output":
                    yield _event({"type": "output", "text": chunk["text"]})

                elif chunk["type"] == "done":
                    yield _event({
                        "status":    "done",
                        "diagnosis": chunk["diagnosis"],
                    })

                elif chunk["type"] == "error":
                    log.error(f"diagnosis agent error: {chunk['message']}")
                    yield _event({"status": "error", "message": chunk["message"]})
                    return

            yield "data: [DONE]\n\n"

        except Exception as e:
            log.error(f"diagnosis route error: {e}", exc_info=True)
            yield _event({"status": "error", "message": str(e)})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"
