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


def _get_tesseract_cmd() -> str:
    try:
        from flask import current_app
        cmd = current_app.config.get("TESSERACT_CMD", "")
        if cmd:
            return cmd
    except Exception:
        pass
    env_cmd = os.getenv("TESSERACT_CMD", "")
    if env_cmd:
        return env_cmd
    default_win_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(default_win_path):
        return default_win_path
    return ""


def _extract_with_vision_llm(img_bytes: bytes) -> dict | None:
    """
    Attempt transcription using a multimodal Vision LLM (OpenAI / Gemini / Anthropic).
    Returns {"text": str, "confidence": 0.98, "error": None} if successful, or None.
    """
    try:
        from flask import current_app
        cfg = current_app.config
        provider = cfg.get("LLM_PROVIDER", "mock")
        openai_key = cfg.get("OPENAI_API_KEY", "")
        gemini_key = cfg.get("GEMINI_API_KEY", "")
        anthropic_key = cfg.get("ANTHROPIC_API_KEY", "")
        model_name = cfg.get("LLM_MODEL", "")
    except Exception:
        provider = os.getenv("LLM_PROVIDER", "mock")
        openai_key = os.getenv("OPENAI_API_KEY", "")
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
        model_name = os.getenv("LLM_MODEL", "")

    # Priority 1: OpenAI Vision (gpt-4o / gpt-4o-mini)
    if (provider == "openai" or openai_key) and openai_key:
        try:
            import base64
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            b64 = base64.b64encode(img_bytes).decode("utf-8")
            prompt = (
                "You are an expert OCR and transcription engine. "
                "Transcribe all text from this student assignment submission image with high accuracy, "
                "including all handwriting, cursive words, formulas, and symbols. "
                "Preserve question numbers (e.g. 'Answer 1: ...'), paragraphs, and exact wording. "
                "Do NOT fix spelling or grammar errors made by the student. "
                "Return ONLY the verbatim transcribed text, without any conversational preamble or markdown backticks."
            )
            model = model_name if model_name in ("gpt-4o", "gpt-4o-mini", "gpt-4-turbo") else "gpt-4o-mini"
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "high"}}
                        ]
                    }
                ],
                max_tokens=2048,
                temperature=0.0
            )
            text = resp.choices[0].message.content.strip()
            if text:
                logger.info(f"OpenAI Vision transcription succeeded ({len(text)} chars)")
                return {"text": text, "confidence": 0.98, "error": None}
        except Exception as e:
            logger.warning(f"OpenAI Vision OCR failed: {e}")

    # Priority 2: Gemini Vision (gemini-1.5-flash)
    if (provider == "gemini" or gemini_key) and gemini_key:
        try:
            import google.generativeai as genai
            from PIL import Image
            genai.configure(api_key=gemini_key)
            pil_img = Image.open(io.BytesIO(img_bytes))
            gmodel = genai.GenerativeModel("gemini-1.5-flash")
            prompt = (
                "Transcribe all handwritten and printed student assignment text from this image with high fidelity. "
                "Preserve question numbers, paragraphs, and exact wording. Return ONLY the transcribed text."
            )
            resp = gmodel.generate_content([prompt, pil_img])
            text = resp.text.strip()
            if text:
                logger.info(f"Gemini Vision transcription succeeded ({len(text)} chars)")
                return {"text": text, "confidence": 0.98, "error": None}
        except Exception as e:
            logger.warning(f"Gemini Vision OCR failed: {e}")

    # Priority 3: Anthropic Vision (claude-3-5-sonnet)
    if (provider == "anthropic" or anthropic_key) and anthropic_key:
        try:
            import base64
            import anthropic
            client = anthropic.Anthropic(api_key=anthropic_key)
            b64 = base64.b64encode(img_bytes).decode("utf-8")
            prompt = (
                "Transcribe all handwritten and printed student assignment text from this image exactly as written. "
                "Output ONLY the transcribed text with no markdown or introductory comments."
            )
            model = model_name if "claude" in model_name else "claude-3-5-sonnet-20241022"
            resp = client.messages.create(
                model=model,
                max_tokens=2048,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}},
                            {"type": "text", "text": prompt}
                        ]
                    }
                ]
            )
            text = resp.content[0].text.strip()
            if text:
                logger.info(f"Anthropic Vision transcription succeeded ({len(text)} chars)")
                return {"text": text, "confidence": 0.98, "error": None}
        except Exception as e:
            logger.warning(f"Anthropic Vision OCR failed: {e}")

    return None


def _ocr_image_bytes(img_bytes: bytes) -> dict:
    """Extract text from image using Vision LLM first, falling back to local OCR."""
    result = {"text": "", "confidence": None, "error": None}

    # ── Step 0: High-accuracy Vision LLM ──────────────────────────────────
    vision_res = _extract_with_vision_llm(img_bytes)
    if vision_res:
        return vision_res

    # ── Step 1: Embedded RapidOCR (ONNX Deep Learning + Multi-Angle) ───────
    try:
        from rapidocr_onnxruntime import RapidOCR
        from PIL import Image
        import numpy as np
        import cv2

        rapid = RapidOCR()
        pil_img = Image.open(io.BytesIO(img_bytes))
        best_text = ""
        best_conf = 0.0

        for rot in [0, 90, 270, 180]:
            test_img = pil_img if rot == 0 else pil_img.rotate(rot, expand=True)
            arr = np.array(test_img)
            ocr_out, _ = rapid(arr)
            if ocr_out:
                text_candidate = " ".join([line[1] for line in ocr_out]).strip()
                scores = [float(line[2]) for line in ocr_out]
                conf = sum(scores) / len(scores) if scores else 0.0
                if len(text_candidate) > len(best_text):
                    best_text = text_candidate
                    best_conf = conf

        # Also try contrast enhanced pass
        if len(best_text) < 15:
            for rot in [0, 90, 270, 180]:
                test_img = pil_img if rot == 0 else pil_img.rotate(rot, expand=True)
                gray = cv2.cvtColor(np.array(test_img), cv2.COLOR_RGB2GRAY)
                dilated = cv2.dilate(gray, np.ones((7, 7), np.uint8))
                bg = cv2.medianBlur(dilated, 21)
                diff = 255 - cv2.absdiff(gray, bg)
                norm = cv2.normalize(diff, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8UC1)
                clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
                enhanced = clahe.apply(norm)
                ocr_out, _ = rapid(enhanced)
                if ocr_out:
                    text_candidate = " ".join([line[1] for line in ocr_out]).strip()
                    scores = [float(line[2]) for line in ocr_out]
                    conf = sum(scores) / len(scores) if scores else 0.0
                    if len(text_candidate) > len(best_text):
                        best_text = text_candidate
                        best_conf = conf

        if best_text and len(best_text) >= 5:
            result["text"] = best_text
            result["confidence"] = round(best_conf, 2)
            result["error"] = None
            return result
    except Exception as rocr_err:
        logger.debug(f"RapidOCR fallback error: {rocr_err}")

    # ── Step 2: Native Tesseract OCR (if installed) ───────────────────────
    tcmd = _get_tesseract_cmd()
    try:
        import pytesseract
        if tcmd and os.path.exists(tcmd):
            pytesseract.pytesseract.tesseract_cmd = tcmd

        from PIL import Image
        img = Image.open(io.BytesIO(img_bytes))
        for rot in [0, 90, 270, 180]:
            test_img = img if rot == 0 else img.rotate(rot, expand=True)
            text = pytesseract.image_to_string(test_img).strip()
            if len(text) > len(result["text"]):
                result["text"] = text
                result["confidence"] = 0.75
                result["error"] = None

        if result["text"]:
            return result
    except Exception as e:
        logger.debug(f"pytesseract failed: {e}")

    # ── Step 3: Windows Native WinOCR ─────────────────────────────────────
    try:
        import asyncio
        import winocr
        from PIL import Image

        img = Image.open(io.BytesIO(img_bytes))
        for rot in [0, 90, 270, 180]:
            test_img = img if rot == 0 else img.rotate(rot, expand=True)
            res = asyncio.run(winocr.recognize_pil(test_img))
            if res.text and len(res.text.strip()) > len(result["text"]):
                result["text"] = res.text.strip()
                result["confidence"] = 0.70
                result["error"] = None
                return result
    except Exception as win_err:
        logger.debug(f"winocr fallback failed: {win_err}")

    if not result["text"]:
        result["error"] = "OCR failed to detect legible text. Configure an LLM_PROVIDER in backend/.env for Vision OCR."

    return result
