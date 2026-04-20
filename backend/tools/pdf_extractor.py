import io


async def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract text from uploaded geological survey PDF.
    Uses pypdf — pure Python, no compilation needed.
    Returns raw text string for GLM to process.
    """
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text.strip()
    except ImportError:
        return "[pypdf not installed — PDF extraction unavailable]"
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