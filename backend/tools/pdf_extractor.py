import io

async def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract text from uploaded geological survey PDF.
    Uses PyMuPDF (fitz) for extraction.
    Returns raw text string for GLM to process.
    """
    try:
        import fitz  # PyMuPDF
        doc  = fitz.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip()
    except ImportError:
        return "[PyMuPDF not installed — PDF extraction unavailable]"
    except Exception as e:
        return f"[PDF extraction error: {str(e)}]"


def truncate_for_context(text: str, max_chars: int = 50000) -> str:
    """
    Truncate extracted text to fit within GLM's context window.
    GLM-5.1 supports 202K tokens (~800K chars) but we keep it lean for speed.
    """
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + f"\n\n[Truncated — {len(text) - max_chars} chars omitted]"