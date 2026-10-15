import pytest
import requests

AI_SERVICE_URL = "http://localhost:8000"

# Test predict-intent endpoint
test_cases = [
    ("Halo", "greeting"),
    ("halo", "greeting"),
    ("Hai", "greeting"),
    ("hai", "greeting"),
    ("Pagi", "greeting"),
    ("selamat pagi", "greeting"),
    ("Assalamualaikum", "greeting"),
    ("AC saya bocor", "keluhan_ac"),
    ("berapa harga cuci ac", "tanya_harga"),
    ("saya mau booking", "booking_service"),
]


def test_predict_intent_e2e():
    """End-to-end integration test against running AI service."""
    try:
        response = requests.get(f"{AI_SERVICE_URL}/health", timeout=2)
        if response.status_code != 200:
            pytest.skip(f"AI Service health check returned status {response.status_code}")
    except Exception as e:
        pytest.skip(f"AI Service is not running ({e}). Skipping E2E test.")

    for message, expected_intent in test_cases:
        res = requests.post(
            f"{AI_SERVICE_URL}/predict-intent",
            json={"text": message},
            timeout=5,
        )
        assert res.status_code == 200, f"Expected 200 for '{message}', got {res.status_code}"
        result = res.json()
        assert result.get("intent") == expected_intent, f"Expected {expected_intent} for '{message}', got {result.get('intent')}"


if __name__ == "__main__":
    print("=" * 80)
    print("End-to-End AI Service Test")
    print("=" * 80)
    try:
        r = requests.get(f"{AI_SERVICE_URL}/health", timeout=2)
        if r.status_code == 200:
            print(f"\n✓ AI Service is running at {AI_SERVICE_URL}")
        else:
            print(f"\n✗ AI Service health check failed: {r.status_code}")
    except Exception as err:
        print(f"\n✗ AI Service is not running: {err}")
        print("  Please start the AI service with: python3 main.py")
        sys.exit(1)

    for msg, exp in test_cases:
        try:
            resp = requests.post(f"{AI_SERVICE_URL}/predict-intent", json={"text": msg}, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                print(f"✓ '{msg}' -> {data.get('intent')}")
            else:
                print(f"✗ '{msg}' -> HTTP {resp.status_code}")
        except Exception as ex:
            print(f"✗ '{msg}' -> Error: {ex}")

