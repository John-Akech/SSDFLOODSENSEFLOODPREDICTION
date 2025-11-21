"""Targeted tests for the feature mapping helper without fallbacks."""

from __future__ import annotations

from typing import Dict, List

import pytest

from app.services.prediction_service import map_gee_to_model_features


MODERN_FEATURES: List[str] = [
    "VV_mean",
    "VV_std",
    "VV_min",
    "VV_max",
    "VH_mean",
    "VH_std",
    "VH_min",
    "VH_max",
    "VV_stdDev_mean",
    "VH_stdDev_mean",
    "precipitation_sum",
    "precipitation_mean",
    "precipitation_max",
    "elevation_mean",
    "slope_mean",
    "water_occurrence_mean",
]


@pytest.fixture
def modern_payload() -> Dict[str, Dict[str, float]]:
    return {
        "sar_vv": {"mean": 0.11, "std": 0.02, "min": -0.3, "max": 0.25, "stdDev_mean": 0.04},
        "sar_vh": {"mean": -0.05, "std": 0.01, "min": -0.4, "max": 0.1, "stdDev_mean": 0.03},
        "precipitation": {"sum": 210.0, "mean": 7.0, "max": 18.0},
        "elevation": {"mean": 380.0, "slope_mean": 2.5},
        "water_occurrence": {"mean": 0.55},
    }


def test_modern_payload_generates_sar_feature_block(modern_payload: Dict[str, Dict[str, float]]) -> None:
    features = map_gee_to_model_features(
        modern_payload, latitude=6.1, longitude=31.2)

    assert set(features.keys()) == set(MODERN_FEATURES)
    assert features["VV_mean"] == pytest.approx(0.11)
    assert features["water_occurrence_mean"] == pytest.approx(0.55)


def test_missing_required_section_raises(monkeypatch: pytest.MonkeyPatch, modern_payload: Dict[str, Dict[str, float]]) -> None:
    modern_payload.pop("sar_vv")
    with pytest.raises(ValueError, match="sar_vv"):
        map_gee_to_model_features(modern_payload, 6.0, 32.0)


def test_missing_metric_inside_section_raises(modern_payload: Dict[str, Dict[str, float]]) -> None:
    modern_payload["sar_vv"].pop("mean")
    with pytest.raises(ValueError, match="mean"):
        map_gee_to_model_features(modern_payload, 6.0, 32.0)
