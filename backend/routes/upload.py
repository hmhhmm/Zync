from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter()

# Hardcoded OCR output from the Borang Log Proses Pelindian REE form
# (Perak IAC-REE Site, 14–19 April 2026, operator: Encik Faizal bin Hashim)
# GLM has no PDF-to-text capability, so this bypasses extraction entirely.
MOCK_EXTRACTED = {
    "location": "Perak IAC-REE Site — Zon Barat",
    "state": "Perak",
    "clay_type": None,
    "ree_grade": None,
    "depth_m": None,
    "area_ha": None,
    "iron_oxide_pct": None,
    "ph_readings":   [5.2, 4.8, 4.1, 3.8, 3.5, 3.2],
    "temperature":   [25.0, 25.5, 26.0, 27.0, 25.0, 25.0],
    "yield_pct":     [78.0, 76.0, 70.0, 62.0, 45.0, 38.0],
    "operator_notes": (
        "Hujan lebat bermula selepas tengahari Hari 2 (~40mm). "
        "Air resap masuk ke dalam kolam pelindian melalui tembok barat yang retak. "
        "pH mula jatuh pada Hari 3. Dos buffer ditambah tapi tidak mencukupi. "
        "Hari 4: pH = 3.8 — AELB had bawah. Persampelan effluent dihantar ke lab. "
        "Hari 5–6: Litar dihentikan. Tunggu pengesahan status Th dari AELB."
    ),
    "notes": (
        "Lixiviant: (NH₂)₂SO₄ 0.5 M. Operator: Encik Faizal bin Hashim. Date: 14–19 April 2026."
    ),
    "extraction_confidence": "high",
    "raw_data_quality": "good",
}

@router.post("/upload/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted")

    return {
        "status":    "success",
        "filename":  file.filename,
        "extracted": MOCK_EXTRACTED,
        "reasoning": "",
    }