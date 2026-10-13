#!/usr/bin/env python3
"""
End-to-end test for the AI service
"""

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

print("=" * 80)
print("End-to-End AI Service Test")
print("=" * 80)

# First check if the service is running
try:
    response = requests.get(f"{AI_SERVICE_URL}/health")
    if response.status_code == 200:
        print(f"\n✓ AI Service is running at {AI_SERVICE_URL}")
        print(f"  Health check: {response.json()}")
    else:
        print(f"\n✗ AI Service health check failed: {response.status_code}")
        print("  Starting the service might be needed...")
except Exception as e:
    print(f"\n✗ AI Service is not running: {e}")
    print("  Please start the AI service with: python3 main.py")
    exit(1)

print("\n" + "=" * 80)
print("Testing predict-intent endpoint")
print("=" * 80)

for message, expected_intent in test_cases:
    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/predict-intent",
            json={"text": message},
            timeout=5
        )
        if response.status_code == 200:
            result = response.json()
            intent = result.get("intent", "UNKNOWN")
            confidence = result.get("confidence", 0)
            fallback = result.get("fallback", False)
            status = "✓" if intent == expected_intent else "✗"
            print(f"{status} '{message}' -> {intent} (confidence: {confidence:.4f}, fallback: {fallback})")
            if intent != expected_intent:
                print(f"    Expected: {expected_intent}")
        else:
            print(f"✗ '{message}' -> HTTP {response.status_code}")
    except Exception as e:
        print(f"✗ '{message}' -> Error: {e}")

print("\n" + "=" * 80)
