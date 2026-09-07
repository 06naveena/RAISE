"""
Semantic similarity module using Sentence-BERT.
Falls back to TF-IDF cosine similarity if sentence-transformers is unavailable.
"""
import logging
import numpy as np

logger = logging.getLogger(__name__)

_sbert_model = None
_sbert_available = False


def _load_sbert():
    global _sbert_model, _sbert_available
    if _sbert_model is not None:
        return _sbert_available
    try:
        from sentence_transformers import SentenceTransformer
        _sbert_model = SentenceTransformer("all-MiniLM-L6-v2")
        _sbert_available = True
        logger.info("Sentence-BERT model loaded: all-MiniLM-L6-v2")
    except Exception as e:
        logger.warning(f"Sentence-BERT unavailable: {e} — falling back to TF-IDF")
        _sbert_available = False
    return _sbert_available


def compute_similarity(text1: str, text2: str) -> float:
    """
    Compute semantic similarity between two texts.
    Returns a float in [0, 1].
    """
    if not text1 or not text2:
        return 0.0

    if _load_sbert():
        return _sbert_similarity(text1, text2)
    return _tfidf_similarity(text1, text2)


def _sbert_similarity(text1: str, text2: str) -> float:
    from sentence_transformers import util
    emb1 = _sbert_model.encode(text1, convert_to_tensor=True)
    emb2 = _sbert_model.encode(text2, convert_to_tensor=True)
    score = util.cos_sim(emb1, emb2).item()
    return max(0.0, min(1.0, score))


def _tfidf_similarity(text1: str, text2: str) -> float:
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        vectorizer = TfidfVectorizer()
        tfidf = vectorizer.fit_transform([text1, text2])
        score = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
        return float(score)
    except Exception:
        return 0.0


def match_concepts(student_text: str, expected_concepts: list) -> tuple:
    """
    Match student answer against expected concepts.

    Returns:
        (matched: list, missing: list)
    """
    if not expected_concepts:
        return [], []

    matched, missing = [], []
    student_lower = student_text.lower()

    for concept in expected_concepts:
        # Simple keyword presence check as first pass
        if concept.lower() in student_lower:
            matched.append(concept)
        else:
            # Semantic similarity check
            sim = compute_similarity(student_text, concept)
            if sim > 0.45:
                matched.append(concept)
            else:
                missing.append(concept)

    return matched, missing


def match_keywords(student_text: str, keywords: list) -> tuple:
    """
    Returns (matched_keywords, missing_keywords).
    """
    if not keywords:
        return [], []
    student_lower = student_text.lower()
    matched = [k for k in keywords if k.lower() in student_lower]
    missing = [k for k in keywords if k.lower() not in student_lower]
    return matched, missing
