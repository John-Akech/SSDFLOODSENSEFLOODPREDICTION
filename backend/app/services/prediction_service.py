"""Thin wrappers around the heavyweight :mod:`model_service` utilities.

The historical test suite imports ``backend.app.services.prediction_service`` for
feature engineering helpers. During the platform hardening work everything was
moved into ``model_service`` and the compatibility module was accidentally
removed, which left the tests without an import path.  This module restores the
API surface that the tests expect while delegating all real work to
``ModelService`` so there is no duplicated logic to maintain.
"""

from __future__ import annotations

from typing import Any, Dict, Tuple
import asyncio
import logging

from .model_service import ModelService

logger = logging.getLogger(__name__)


def map_gee_to_model_features(
    gee_features: Dict[str, Any],
    latitude: float,
    longitude: float,
) -> Dict[str, Any]:
    """Expose the historical helper that test_feature_mapping relies on."""
    return ModelService.map_gee_to_model_features(gee_features, latitude, longitude)


def _ensure_models_loaded() -> None:
    """Load models on demand so callers can use prediction helpers safely."""
    if ModelService.models_loaded:
        return

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    try:
        if loop and loop.is_running():
            loop.create_task(ModelService.load_models())
        else:
            asyncio.run(ModelService.load_models())
    except Exception as exc:  # pragma: no cover - best effort logging only
        logger.warning("Unable to pre-load models: %s", exc)


def predict_probability(
    gee_features: Dict[str, Any],
    latitude: float,
    longitude: float,
    model_type: str = "rf",
) -> Tuple[float, Dict[str, Any]]:
    """High-level helper that normalises inputs and chooses a model."""
    _ensure_models_loaded()
    feature_vector = map_gee_to_model_features(
        gee_features, latitude, longitude)

    model_type = model_type.lower()
    if model_type == "rf" and ModelService.rf_model is not None:
        prob, label, metadata = ModelService.predict_rf(feature_vector)
    elif model_type == "gb" and ModelService.gb_model is not None:
        prob, label, metadata = ModelService.predict_gb(feature_vector)
    elif model_type == "tcn" and ModelService.tcn_model is not None:
        prob, label, metadata = ModelService.predict_tcn(feature_vector)
    else:
        prob, label, metadata, _ = ModelService.predict_ensemble(
            feature_vector)

    return prob, {"label": label, **metadata}
