"""
Text extraction module.
Handles: PDF (digital + scanned), DOCX, images (JPG, PNG).
"""
import os
import io
import logging

logger = logging.getLogger(__name__)


def extract_text(file_path: str) -> dict:
    """
    Extract text from the given file.

    Returns:
        {
            "text": str,
            "is_scanned": bool,
            "ocr_confidence": float | None,
            "pages": int,
            "error": str | None,
        }
    """
    ext = os.path.splitext(file_path)[1].lower()
    result = {
        "text": "",
        "is_scanned": False,
        "ocr_confidence": None,
        "pages": 0,
        "error": None,
    }

    try:
        if ext == ".pdf":
            return _extract_pdf(file_path)
        elif ext == ".docx":
            return _extract_docx(file_path)
        elif ext in (".jpg", ".jpeg", ".png"):
            return _extract_image(file_path)
        else:
            result["error"] = f"Unsupported file type: {ext}"
            return result
    except Exception as e:
        logger.error(f"Text extraction failed for {file_path}: {e}")
        result["error"] = str(e)
        return result


def _extract_pdf(file_path: str) -> dict:
    result = {"text": "", "is_scanned": False, "ocr_confidence": None, "pages": 0, "error": None}
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
        result["pages"] = len(doc)
        full_text = []
        for page in doc:
            text = page.get_text("text")
            full_text.append(text)

        combined = "\n".join(full_text).strip()

        # Heuristic: if very little text extracted, treat as scanned
        avg_text_per_page = len(combined) / max(result["pages"], 1)
        if avg_text_per_page < 50:
            result["is_scanned"] = True
            logger.info("PDF appears scanned — falling back to OCR")
            return _pdf_ocr(file_path, doc, result)

        result["text"] = combined
        return result
    except ImportError:
        result["error"] = "PyMuPDF (fitz) not installed"
        return result


def _pdf_ocr(file_path: str, doc, base_result: dict) -> dict:
    """OCR each page of a PDF."""
    try:
        import fitz
        texts = []
        confidences = []
        for page in doc:
            mat = fitz.Matrix(2, 2)  # 2x zoom for better OCR
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            ocr_result = _ocr_image_bytes(img_bytes)
            texts.append(ocr_result["text"])
            if ocr_result["confidence"]:
                confidences.append(ocr_result["confidence"])

        base_result["text"] = "\n".join(texts)
        base_result["is_scanned"] = True
        base_result["ocr_confidence"] = sum(confidences) / len(confidences) if confidences else None
        return base_result
    except Exception as e:
        base_result["error"] = f"OCR failed: {e}"
        base_result["text"] = ""
        return base_result


def _extract_docx(file_path: str) -> dict:
    result = {"text": "", "is_scanned": False, "ocr_confidence": None, "pages": 0, "error": None}
    try:
        from docx import Document
        doc = Document(file_path)
        text = "\n".join(para.text for para in doc.paragraphs)
        result["text"] = text
        return result
    except ImportError:
        result["error"] = "python-docx not installed"
        return result


def _extract_image(file_path: str) -> dict:
    result = {"text": "", "is_scanned": True, "ocr_confidence": None, "pages": 1, "error": None}
    with open(file_path, "rb") as f:
        img_bytes = f.read()
    ocr = _ocr_image_bytes(img_bytes)
    result["text"] = ocr["text"]
    result["ocr_confidence"] = ocr["confidence"]
    if ocr.get("error"):
        result["error"] = ocr["error"]
    return result


def _ocr_image_bytes(img_bytes: bytes) -> dict:
    """Run Tesseract OCR on image bytes after OpenCV preprocessing."""
    result = {"text": "", "confidence": None, "error": None}
    try:
        import pytesseract
        import cv2
        import numpy as np
        from flask import current_app

        # Set Tesseract path if configured
        try:
            tcmd = current_app.config.get("TESSERACT_CMD", "")
            if tcmd:
                pytesseract.pytesseract.tesseract_cmd = tcmd
        except RuntimeError:
            pass  # No app context

        # Decode image
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            result["error"] = "Failed to decode image"
            return result

        # Preprocessing
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Noise removal
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        # Contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised)
        # Thresholding
        _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # OCR with confidence data
        data = pytesseract.image_to_data(thresh, output_type=pytesseract.Output.DICT)
        words = [data["text"][i] for i in range(len(data["text"])) if int(data["conf"][i]) > 0]
        confidences = [int(data["conf"][i]) for i in range(len(data["conf"])) if int(data["conf"][i]) > 0]

        result["text"] = " ".join(words)
        result["confidence"] = sum(confidences) / len(confidences) if confidences else 0

    except ImportError as e:
        # Fallback: try basic pytesseract without cv2
        try:
            import pytesseract
            from PIL import Image
            img = Image.open(io.BytesIO(img_bytes))
            result["text"] = pytesseract.image_to_string(img)
        except Exception as e2:
            result["error"] = f"OCR unavailable: {e2}"
    except Exception as e:
        result["error"] = f"OCR error: {e}"

    return result
