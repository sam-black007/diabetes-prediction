import re
from pypdf import PdfReader
import io

def extract_text_from_pdf(uploaded_file):
    reader = PdfReader(io.BytesIO(uploaded_file.read()))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    return text

def _first_number(pattern, text):
    m = re.search(pattern, text, re.IGNORECASE)
    return float(m.group(1)) if m else None

def parse_report(text):
    """Best-effort extraction of common lab values from a report's text."""
    data = {}

    fasting = _first_number(r"fasting[^.\n]{0,40}?(\d+(?:\.\d+)?)", text)
    postmeal = _first_number(
        r"(?:post[-\s]?prandial|post\s*meal|post\s*lunch|pp\s*(?:bs)?|2\s*hr(?:s)?\s*(?:after|post)?)[^.\n]{0,40}?(\d+(?:\.\d+)?)",
        text,
    )
    if postmeal is None:
        postmeal = _first_number(r"(?:2\s*h(?:r|our)?\s*[a-z]*\s*glucose)[^.\n]{0,20}?(\d+(?:\.\d+)?)", text)

    data["fasting"] = fasting
    data["postmeal"] = postmeal
    data["bmi"] = _first_number(r"bmi[:\s]*(\d+(?:\.\d+)?)", text)

    bp = re.search(r"(?:bp|blood\s*pressure)[:\s]*(\d{2,3})/(\d{2,3})", text, re.IGNORECASE)
    if bp:
        data["blood_pressure"] = float(bp.group(1))
    else:
        data["blood_pressure"] = None

    data["age"] = _first_number(r"\bage[:\s]*(\d{1,3})", text)
    data["insulin"] = _first_number(r"\binsulin[:\s]*(\d+(?:\.\d+)?)", text)
    data["pregnancies"] = _first_number(r"pregnan(?:cy|cies)[:\s]*(\d{1,2})", text)
    data["skin_thickness"] = _first_number(r"skin\s*thickness[:\s]*(\d+(?:\.\d+)?)", text)

    return data