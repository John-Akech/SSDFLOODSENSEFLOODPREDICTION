import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

import pywebpush

# Ensure the backend package is discoverable when tests run from the repo root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.alert_service import AlertService, Alert  # noqa: E402
from app.core.config import settings  # noqa: E402


def test_send_web_push_alert_uses_pywebpush(monkeypatch):
    """Ensure the real pywebpush client is triggered when VAPID keys exist."""
    service = AlertService()
    alert = Alert(
        id="test-alert",
        latitude=6.5,
        longitude=31.3,
        message="Test flood alert",
        severity="high",
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )

    subscription = {
        "endpoint": "https://example.com/send/test",
        "keys": {
            "p256dh": "BPN2gO-YU8QxJr8m5n3fjteXUv1t7p0lVRCbQqKQ42lV4Ymp6fegPGU4tW5rRusK5FKk1Lg6EoTuCI0Y6i3a8_A",
            "auth": "HXm_f2lB1OGwVtqlUxb1xA"
        }
    }

    webpush_calls = []

    def fake_webpush(*, subscription_info, data, vapid_private_key, vapid_claims):
        webpush_calls.append(
            {
                "subscription_info": subscription_info,
                "data": data,
                "vapid_private_key": vapid_private_key,
                "vapid_claims": vapid_claims,
            }
        )

    monkeypatch.setattr(pywebpush, "webpush", fake_webpush)
    monkeypatch.setattr(settings, "VAPID_PUBLIC_KEY", "test-public-key")
    monkeypatch.setattr(settings, "VAPID_PRIVATE_KEY", "test-private-key")
    monkeypatch.setattr(settings, "VAPID_SUBJECT", "mailto:test@example.com")

    result = asyncio.run(service.send_web_push_alert(alert, [subscription]))

    assert result is True
    assert len(webpush_calls) == 1
    push_call = webpush_calls[0]
    assert push_call["subscription_info"] == subscription
    assert push_call["vapid_private_key"] == "test-private-key"
    assert push_call["vapid_claims"] == {"sub": "mailto:test@example.com"}
