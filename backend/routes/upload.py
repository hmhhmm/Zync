from fastapi import APIRouter, UploadFile, File, HTTPException
from tools.pdf_extractor import extract_text_from_pdf, truncate_for_context
from agents.base_agent import call_glm

router = APIRouter()

EXTRACT_PROMPT = """
You are a geological data extraction specialist for Malaysian REE deposits.

Given raw text extracted from a geological survey PDF, extract and structure
all relevant parameters for REE processing.

Return ONLY valid JSON:
{
  "location":       str or null,
  "state":          str or null,
  "clay_type":      str or null,
  "ree_grade":      float or null,
  "depth_m":        float or null,
  "area_ha":        float or null,
  "iron_oxide_pct": float or null,
  "notes":          str,
  "extraction_confidence": "high | medium | low",
  "raw_data_quality":      "good | partial | poor"
}

If a field cannot be found in the text, set it to null.
Do not guess or hallucinate values — only extract what is explicitly stated.
"""


@router.post("/upload/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a geological survey PDF.
    GLM reads it using its long-context window and extracts deposit parameters
    that auto-fill the operator form on the frontend.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted")

    file_bytes = await file.read()

    if len(file_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="PDF too large — max 10MB")

    # Extract text from PDF
    raw_text = await extract_text_from_pdf(file_bytes)

    if not raw_text or raw_text.startswith("["):
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")

    # Truncate to fit context window
    truncated = truncate_for_context(raw_text, max_chars=40000)

    # GLM reads the extracted text and structures the parameters
    result = await call_glm(
        system_prompt=EXTRACT_PROMPT,
        user_message=f"Extract deposit parameters from this geological survey:\n\n{truncated}",
        json_mode=True,
    )

    import json
    try:
        extracted = json.loads(result["output"])
        return {
            "status":    "success",
            "filename":  file.filename,
            "extracted": extracted,
            "reasoning": result.get("reasoning", ""),
        }
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=422,
            detail="GLM could not extract structured data from this PDF"
        )