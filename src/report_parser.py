import re
import io
from pypdf import PdfReader

try:
    from rapidocr_onnxruntime import RapidOCR
    _ocr = None
    def _get_ocr():
        global _ocr
        if _ocr is None:
            _ocr = RapidOCR()
        return _ocr
    OCR_AVAILABLE = True
except Exception:
    OCR_AVAILABLE = False

def _ocr_image_bytes(image_bytes):
    """OCR an image (PNG/JPG/...) and return the recognized text."""
    if not OCR_AVAILABLE:
        return ""
    result, _ = _get_ocr()(image_bytes)
    if not result:
        return ""
    return "\n".join(line[1] for line in result)

def extract_text_from_pdf(uploaded_file):
    content = uploaded_file.read()
    reader = PdfReader(io.BytesIO(content))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    if len(text.strip()) < 20 and OCR_AVAILABLE:
        # Scanned PDF: render pages to images and OCR them
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument(content)
        pages_text = []
        for page in pdf:
            bitmap = page.render(scale=2.5).to_pil()
            buf = io.BytesIO()
            bitmap.save(buf, format="PNG")
            pages_text.append(_ocr_image_bytes(buf.getvalue()))
        text = "\n".join(pages_text)
    return text

def extract_text_from_image(uploaded_file):
    return _ocr_image_bytes(uploaded_file.read())

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