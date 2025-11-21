"""Shared pytest for backend API tests."""

from __future__ import annotations

import os
import sys
import warnings
from typing import Callable, Dict, Tuple
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure "app" package is importable when pytest runs from repo root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Provide safe defaults for settings that Pydantic marks as required.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")

from app.core.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.services.model_service import ModelService  # noqa: E402

warnings.filterwarnings(
    "ignore",
    category=DeprecationWarning,
    message=r".*datetime\.datetime\.utcnow\(\) is deprecated.*",
)

TEST_DB_URL = os.getenv("TEST_DATABASE_URL", "sqlite:///./test.db")
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine)

DEFAULT_PASSWORD = "TestPassword123!"


@pytest.fixture(scope="function")
def db_session():
    """Provide a fresh database session per test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI test client wired to the temporary SQLite database."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def make_email() -> Callable[[str], str]:
    """Return a helper that generates unique email addresses per test."""

    def _build(prefix: str = "user") -> str:
        return f"{prefix}_{uuid4().hex[:8]}@example.com"

    return _build


@pytest.fixture
def register_user(client, make_email):
    """Register a user and return the payload + response."""

    def _register_user(**overrides) -> Tuple[Dict[str, str], Dict]:
        payload = {
            "email": overrides.get("email", make_email("tester")),
            "password": overrides.get("password", DEFAULT_PASSWORD),
            "full_name": overrides.get("full_name", "Test User"),
            "role": overrides.get("role", "community_member"),
            "language": overrides.get("language", "en"),
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code in (200, 201), response.text
        return payload, response.json()

    return _register_user


@pytest.fixture
def auth_headers(client, register_user):
    """Return Authorization headers for an authenticated user."""
    user_payload, _ = register_user()
    login_response = client.post(
        "/api/v1/auth/login",
        params={"email": user_payload["email"],
                "password": user_payload["password"]},
    )
    assert login_response.status_code == 200, login_response.text
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def prediction_payload() -> Dict[str, float]:
    """Base payload for creating flood predictions."""
    return {
        "latitude": 6.877,
        "longitude": 31.307,
        "model_type": "rf",
        "lead_time_hours": 12,
        "features": {
            "rainfall_anomaly": 0.12,
            "river_level": 5.3,
            "soil_moisture": 0.68,
            "elevation": 410.0,
        },
    }


@pytest.fixture(autouse=True)
def mock_model_service(monkeypatch):
    """Stub ML predictions so tests do not depend on serialized artifacts."""

    def _predict_rf(cls, features):
        return 0.42, 0.91, 3.2

    def _predict_tcn(cls, features):
        return 0.47, 0.88, 4.1

    def _predict_ensemble(cls, features):
        model_predictions = {
            "rf": 0.42,
            "gb": 0.39,
            "tcn": 0.47,
            "lstm": 0.41,
        }
        return 0.44, 0.9, model_predictions, 5.0

    monkeypatch.setattr(ModelService, "predict_rf",
                        classmethod(_predict_rf))
    monkeypatch.setattr(ModelService, "predict_tcn",
                        classmethod(_predict_tcn))
    monkeypatch.setattr(ModelService, "predict_ensemble",
                        classmethod(_predict_ensemble))

    original_state = ModelService.models_loaded
    ModelService.models_loaded = True
    yield
    ModelService.models_loaded = original_state
