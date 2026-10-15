import os
import re
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, Optional

import joblib
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "intent_model.pkl"
VECTORIZER_PATH = BASE_DIR / "vectorizer.pkl"
LABEL_ENCODER_PATH = BASE_DIR / "label_encoder.pkl"

model = None
vectorizer = None
label_encoder = None


def load_model():
    """Load model, vectorizer, and label encoder."""
    global model, vectorizer, label_encoder
    if os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
        model = joblib.load(MODEL_PATH)
        vectorizer = joblib.load(VECTORIZER_PATH)
        if os.path.exists(LABEL_ENCODER_PATH):
            label_encoder = joblib.load(LABEL_ENCODER_PATH)
        else:
            label_encoder = None
        return True
    return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager for startup and shutdown lifecycle."""
    load_model()
    yield


# Eager load on import for tests and immediate readiness
load_model()

app = FastAPI(title="Nara AC - AI Service", version="2.0.0", lifespan=lifespan)

# Simple API key authentication
AI_API_KEY = os.getenv("AI_API_KEY")
IS_PROD = os.getenv("NODE_ENV") == "production" or os.getenv("ENV") == "production"

if IS_PROD and not AI_API_KEY:
    import sys
    print("[ai-service] FATAL: AI_API_KEY wajib diisi di production. AI Service gagal start.", file=sys.stderr)


@app.middleware("http")
async def verify_api_key(request, call_next):
    # Skip authentication if no API key is configured (dev mode only)
    if not AI_API_KEY:
        if IS_PROD:
            return JSONResponse(
                status_code=503,
                content={"error": {"code": "SERVICE_UNAVAILABLE", "message": "AI Service tidak terkonfigurasi dengan benar (missing API key)."}},
            )
        return await call_next(request)

    # Check for API key in header
    api_key = request.headers.get("X-AI-API-Key")
    if api_key != AI_API_KEY:
        return JSONResponse(
            status_code=401,
            content={"error": {"code": "UNAUTHORIZED", "message": "API key tidak valid"}},
        )

    return await call_next(request)
MODEL_VERSION = "2.0"
CONFIDENCE_THRESHOLD = float(os.getenv("AI_CONFIDENCE_THRESHOLD", "0.55"))


class IntentRequest(BaseModel):
    text: str


class IntentResponse(BaseModel):
    intent: str
    confidence: float
    fallback: bool
    model_version: Optional[str] = None
    entities: Optional[Dict[str, Any]] = None


class EntityExtractRequest(BaseModel):
    text: str
    intent: Optional[str] = None


class EntityResponse(BaseModel):
    entities: Dict[str, Any]
    intent_specific_data: Optional[Dict[str, Any]] = None


# All possible intents in the system
ALL_INTENTS = [
    "greeting", "tanya_layanan", "tanya_harga", "keluhan_ac",
    "booking_service", "ubah_jadwal", "batalkan_booking",
    "tanya_status", "tanya_pembayaran", "tanya_teknisi",
    "tanya_area_layanan", "tanya_prosedur", "follow_up",
    "konfirmasi", "penolakan", "human_handoff", "feedback",
    "admin_query", "tech_query", "lainnya"
]

# Intent label mapping for backward compatibility with older models
# This maps old model indices to new intent names
# The new model (trained with train.py) uses label_encoder which has the full set
INTENT_MAPPING = {
    0: "admin_query",
    1: "booking",
    2: "keluhan",
    3: "lainnya",
    4: "tanya_layanan",
    5: "tanya_status",
    6: "tech_query",
    # New intents for updated models - these will be used if label_encoder is not available
    7: "greeting",
    8: "tanya_harga",
    9: "keluhan_ac",
    10: "booking_service",
    11: "ubah_jadwal",
    12: "batalkan_booking",
    13: "tanya_pembayaran",
    14: "tanya_teknisi",
    15: "tanya_area_layanan",
    16: "tanya_prosedur",
    17: "follow_up",
    18: "konfirmasi",
    19: "penolakan",
    20: "human_handoff",
    21: "feedback",
}


# Entity extraction patterns
def extract_entities(text: str, intent: str = None) -> Dict[str, Any]:
    """
    Extract entities from text based on intent and patterns.
    Returns a dictionary with extracted entities.
    """
    entities = {
        "booking_code": None,
        "service_type": None,
        "ac_type": None,
        "ac_units": None,
        "location": None,
        "date": None,
        "time": None,
        "complaint_type": None,
        "price": None,
        "payment_method": None,
        "technician_name": None,
        "area": None,
        "duration": None,
    }

    # Normalize text
    text_lower = text.lower().strip()

    # Booking code patterns (AC-XXXX, BK-XXXX, etc.)
    booking_code_patterns = [
        r'\b[a-z]{0,3}-?\d{3,5}\b',  # AC-1234, BK555, etc.
        r'\b[a-z]{2,4}\d{3,5}\b',
    ]
    for pattern in booking_code_patterns:
        match = re.search(pattern, text_lower)
        if match and not entities["booking_code"]:
            code = match.group(0).upper()
            # Validate it looks like a booking code
            if re.match(r'^[A-Z]{0,4}-\d{3,5}$', code) or re.match(r'^[A-Z]{2,4}\d{3,5}$', code):
                entities["booking_code"] = code

    # Service type extraction
    service_keywords = {
        'cuci': ['cuci ac', 'servis', 'pembersihan', 'cleaning', 'maintenance'],
        'perbaikan': ['perbaikan', 'bocor', 'rusak', 'mampet', 'reparasi', 'ganti', 'benerin'],
        'instalasi': ['pasang', 'instalasi', 'bongkar', 'pemasangan'],
        'isi freon': ['isi freon', 'isi ulang', 'refill'],
    }

    for service, keywords in service_keywords.items():
        for keyword in keywords:
            if keyword in text_lower:
                entities["service_type"] = service
                break
        if entities["service_type"]:
            break

    # AC type and units
    ac_type_patterns = [
        (r'\b\d+\s*(pk|PK|pengkondisian)\b', 'pk'),
        (r'\b\d+\s*ton\b', 'ton'),
        (r'\b\d+\s*btu\b', 'btu'),
    ]
    for pattern, unit in ac_type_patterns:
        match = re.search(pattern, text_lower)
        if match:
            entities["ac_type"] = match.group(0)
            break

    # Number of AC units
    unit_patterns = [
        r'\b\d+\s*unit\b',
        r'\b\d+\s*ac\b',
        r'\b\d+\s*buah\b',
    ]
    for pattern in unit_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                num = int(re.search(r'\d+', match.group(0)).group(0))
                entities["ac_units"] = num
                break
            except:
                pass

    # Location extraction (simple pattern)
    location_keywords = ['di ', 'alamat ', 'lokasi ', 'daerah ', 'di ', 'ke ']
    for keyword in location_keywords:
        if keyword in text_lower:
            # Extract text after the keyword
            idx = text_lower.find(keyword) + len(keyword)
            if idx < len(text_lower):
                entities["location"] = text[idx:].strip()
                break

    # Date extraction
    date_patterns = [
        # DD/MM/YYYY or DD-MM-YYYY
        (r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', 'date_str'),
        # Hari ini, besok, lusa
        (r'\b(hari\s+)?(ini|besok|lusa|kemarin)\b', 'relative_date'),
        # Days of week
        (r'\b(senin|selasa|rabu|kamis|jumat|sabtu|minggu)\b', 'day_of_week'),
    ]

    for pattern, date_type in date_patterns:
        match = re.search(pattern, text_lower)
        if match:
            entities["date"] = match.group(0)
            entities["date_type"] = date_type
            break

    # Time extraction
    time_pattern = r'\b\d{1,2}:\d{2}\b'
    match = re.search(time_pattern, text_lower)
    if match:
        entities["time"] = match.group(0)

    # Complaint type extraction
    complaint_keywords = [
        ('tidak dingin', 'ac_tidak_dingin'),
        ('kurang dingin', 'ac_kurang_dingin'),
        ('bocor', 'ac_bocor'),
        ('berisik', 'ac_berisik'),
        ('tidak mau nyala', 'ac_mati'),
        ('netes air', 'ac_netes'),
        ('mengeluarkan bau', 'ac_bau'),
        ('panas', 'ac_panas'),
        ('mampet', 'ac_mampet'),
        ('rusak', 'ac_rusak'),
        ('freon habis', 'freon_habis'),
    ]

    for keyword, complaint_type in complaint_keywords:
        if keyword in text_lower:
            entities["complaint_type"] = complaint_type
            break

    # Price extraction
    price_pattern = r'\b(rp\s*\d+|\d+\s*ribu|\d+\s*juta|\d+\.?\d*)\b'
    match = re.search(price_pattern, text_lower, re.IGNORECASE)
    if match:
        entities["price"] = match.group(0)

    # Payment method
    payment_keywords = ['transfer', 'cash', 'cod', 'dana', 'ovo', 'gopay', 'bca', 'bni', 'bri', 'mandiri']
    for keyword in payment_keywords:
        if keyword in text_lower:
            entities["payment_method"] = keyword
            break

    # Technician name
    tech_name_pattern = r'\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b'
    match = re.search(tech_name_pattern, text)
    if match:
        entities["technician_name"] = match.group(0)

    # Area/Location
    area_keywords = ['jakarta', 'bogor', 'depok', 'tangerang', 'bekasi', 'jaksel', 'jakpus', 'jakbar']
    for keyword in area_keywords:
        if keyword in text_lower:
            entities["area"] = keyword
            break

    # Remove None values for cleaner response
    entities = {k: v for k, v in entities.items() if v is not None}

    return entities


def extract_service_request_entities(text: str) -> Dict[str, Any]:
    """
    Extract entities specific to service/booking requests.
    """
    entities = extract_entities(text)

    # Additional booking-specific extraction
    additional_info = {
        "needs_urgent": 'segera' in text.lower() or 'cepat' in text.lower(),
        "prefers_morning": 'pagi' in text.lower(),
        "prefers_afternoon": 'sore' in text.lower() or 'siang' in text.lower(),
    }

    return {**entities, **additional_info}


def extract_booking_code(text: str) -> Optional[str]:
    """
    Extract booking code from text.
    """
    entities = extract_entities(text)
    return entities.get("booking_code")



@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/predict-intent", response_model=IntentResponse)
def predict_intent(req: IntentRequest):
    if not model or not vectorizer:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Sanitize input to prevent prompt injection
    text = req.text.strip()
    if not text:
        return IntentResponse(intent="unknown", confidence=0.0, fallback=True)

    # Basic sanitization: remove potentially harmful patterns
    # Remove common prompt injection attempts
    sanitized_text = text
    # Remove attempts to override system prompts
    for pattern in ["ignore all previous", "forget all", "disregard all", "ignore all instructions",
                   "system:", "assistant:", "user:", "[INST]", "[/INST]",
                   "<s>", "</s>", "<|im_start|>", "<|im_end|>"]:
        sanitized_text = sanitized_text.replace(pattern.lower(), "")
        sanitized_text = sanitized_text.replace(pattern, "")

    # Limit input length to prevent DoS
    max_input_length = 1000
    if len(sanitized_text) > max_input_length:
        sanitized_text = sanitized_text[:max_input_length]

    text = sanitized_text

    X = vectorizer.transform([text])
    probabilities = model.predict_proba(X)[0]
    max_prob = max(probabilities)
    intent_idx = list(probabilities).index(max_prob)
    # Map integer label to intent name
    if label_encoder:
        intent = label_encoder.inverse_transform([intent_idx])[0]
    else:
        intent = INTENT_MAPPING.get(intent_idx, str(model.classes_[intent_idx]))

    fallback = max_prob < CONFIDENCE_THRESHOLD

    # Handle legacy intent names for backward compatibility
    # Map old intent names to new ones
    LEGACY_INTENT_MAP = {
        "booking": "booking_service",
        "keluhan": "keluhan_ac",
    }
    if intent in LEGACY_INTENT_MAP:
        intent = LEGACY_INTENT_MAP[intent]

    # Extract entities based on intent
    entities = extract_entities(text, intent)

    return IntentResponse(
        intent=intent,
        confidence=float(max_prob),
        fallback=fallback,
        model_version=MODEL_VERSION,
        entities=entities if entities else None
    )


@app.post("/extract-entities", response_model=EntityResponse)
def extract_entities_endpoint(req: EntityExtractRequest):
    """
    Extract entities from text, optionally with intent context.
    """
    text = req.text.strip()
    if not text:
        return EntityResponse(entities={}, intent_specific_data=None)

    intent = req.intent
    entities = extract_entities(text, intent)

    # Add intent-specific extraction if intent is provided
    intent_specific = None
    if intent:
        if intent in ["booking_service", "ubah_jadwal"]:
            intent_specific = extract_service_request_entities(text)

    return EntityResponse(
        entities=entities if entities else {},
        intent_specific_data=intent_specific
    )


@app.post("/extract-booking-code")
def extract_booking_code_endpoint(req: IntentRequest):
    """
    Extract booking code from text.
    """
    code = extract_booking_code(req.text)
    return {"booking_code": code, "found": code is not None}


class Document(BaseModel):
    id: str
    title: str
    source: str
    text: str


class RagIndexRequest(BaseModel):
    documents: list[Document]
    corpus_hash: str


class RagAnswerRequest(BaseModel):
    question: str
    corpus_hash: str


corpus_cache = {}


@app.post("/rag/index")
def rag_index(req: RagIndexRequest):
    docs_text = [d.text for d in req.documents]
    if not docs_text:
        return {"status": "ok", "indexed": 0}

    tfidf = TfidfVectorizer()
    X = tfidf.fit_transform(docs_text)

    corpus_cache[req.corpus_hash] = {"docs": req.documents, "tfidf": tfidf, "X": X}
    return {"status": "ok", "indexed": len(req.documents)}


@app.post("/rag/answer")
def rag_answer(req: RagAnswerRequest):
    corpus = corpus_cache.get(req.corpus_hash)
    if not corpus:
        raise HTTPException(status_code=409, detail="Corpus hash not found, please re-index")

    # Sanitize question to prevent prompt injection
    question = req.question.strip()
    sanitized_question = question
    for pattern in ["ignore all previous", "forget all", "disregard all", "ignore all instructions",
                   "system:", "assistant:", "user:", "[INST]", "[/INST]",
                   "<s>", "</s>", "<|im_start|>", "<|im_end|>"]:
        sanitized_question = sanitized_question.replace(pattern.lower(), "")
        sanitized_question = sanitized_question.replace(pattern, "")

    max_input_length = 1000
    if len(sanitized_question) > max_input_length:
        sanitized_question = sanitized_question[:max_input_length]

    q_vec = corpus["tfidf"].transform([sanitized_question])
    sims = cosine_similarity(q_vec, corpus["X"])[0]
    best_idx = int(sims.argmax())
    best_score = float(sims[best_idx])

    if best_score < 0.2:
        return {"in_domain": False, "answer": "", "sources": [], "mode": "none"}

    best_doc = corpus["docs"][best_idx]
    return {
        "in_domain": True,
        "answer": best_doc.text,
        "sources": [best_doc.source],
        "mode": "extractive",
    }


if __name__ == "__main__":
    import uvicorn
    import os

    # Use 127.0.0.1 by default for security; bind to 0.0.0.0 only if explicitly configured
    host = os.getenv("AI_HOST", "127.0.0.1")
    port = int(os.getenv("AI_PORT", "8000"))
    reload = os.getenv("AI_RELOAD", "true").lower() == "true"

    uvicorn.run("main:app", host=host, port=port, reload=reload)
