import re
import io
from pypdf import PdfReader

try:
    from PIL import Image, ImageOps, ImageEnhance, ImageFilter
    PIL_OK = True
except Exception:
    PIL_OK = False

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

try:
    import pytesseract
    TESS_AVAILABLE = True
except Exception:
    TESS_AVAILABLE = False

OCR_READY = OCR_AVAILABLE or TESS_AVAILABLE
OCR_ENGINE = "rapidocr" if OCR_AVAILABLE else ("tesseract" if TESS_AVAILABLE else "none")


def _to_png(im):
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    return buf.getvalue()


def _preprocess_variants(raw_bytes):
    """Return several enhanced PNG byte blobs to maximize OCR pickup from photos.

    Phone photos are usually low-contrast, skewed or shadowed, so we feed RapidOCR
    a few enhanced versions (colour contrast, grayscale denoised, binary threshold)
    and merge the results.
    """
    variants = []
    if not PIL_OK:
        return variants
    try:
        img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    except Exception:
        return variants
    w, h = img.size
    scale = max(1.0, 1500.0 / max(w, h))
    if scale > 1:
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    # 1) colour: autocontrast + contrast + sharpen
    v1 = img.copy()
    v1 = ImageOps.autocontrast(v1)
    v1 = ImageEnhance.Contrast(v1).enhance(1.7)
    v1 = ImageEnhance.Sharpness(v1).enhance(1.6)
    variants.append(_to_png(v1))
    # 2) grayscale + denoise + contrast
    g = img.convert("L")
    g = ImageOps.autocontrast(g)
    g = g.filter(ImageFilter.MedianFilter(3))
    g = ImageEnhance.Contrast(g).enhance(2.0)
    variants.append(_to_png(g))
    # 3) binary threshold for crisp text
    bw = g.point(lambda p: 255 if p > 150 else 0)
    variants.append(_to_png(bw))
    # 4) inverted threshold (for white-on-dark or low-contrast text)
    inv = g.point(lambda p: 255 if p < 105 else 0)
    variants.append(_to_png(inv))
    return variants


def _ocr_image_bytes(image_bytes):
    """OCR an image (PNG/JPG/...) and return the recognized text (multiple passes)."""
    if not OCR_READY:
        return ""
    texts = []
    candidates = [image_bytes]
    candidates.extend(_preprocess_variants(image_bytes))
    if OCR_AVAILABLE:
        engine = _get_ocr()
        for cand in candidates:
            try:
                result, _ = engine(cand)
            except Exception:
                result = None
            if result:
                texts.append("\n".join(line[1] for line in result))
    elif TESS_AVAILABLE:
        from PIL import Image
        for cand in candidates:
            try:
                im = Image.open(io.BytesIO(cand))
                txt = pytesseract.image_to_string(im)
            except Exception:
                txt = ""
            if txt and txt.strip():
                texts.append(txt)
    seen, out = set(), []
    for t in texts:
        for ln in t.splitlines():
            ln = ln.strip()
            if ln and ln not in seen:
                seen.add(ln)
                out.append(ln)
    return "\n".join(out)

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
    data["hba1c"] = _first_number(r"(?:hba1c|a1c)[:\s]*(\d+(?:\.\d+)?)", text)

    return data