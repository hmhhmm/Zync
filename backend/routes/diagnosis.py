import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
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
                    yield _event({"status": "error", "message": chunk["message"]})
                    return

            yield "data: [DONE]\n\n"

        except Exception as e:
            yield _event({"status": "error", "message": str(e)})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"
