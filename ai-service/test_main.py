from main import CONFIDENCE_THRESHOLD, IntentResponse


def test_intent_response_includes_model_version():
    response = IntentResponse(
        intent="booking",
        confidence=0.9,
        fallback=False,
        model_version="1.0",
    )

    assert response.model_version == "1.0"


def test_confidence_threshold_matches_backend_default():
    assert CONFIDENCE_THRESHOLD == 0.55
