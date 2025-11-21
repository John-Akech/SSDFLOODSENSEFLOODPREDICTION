# pyright: reportGeneralTypeIssues=false

"""Tests for the SAR flood mapping pipeline.

These tests focus on orchestration and error handling so we can exercise the
pipeline without making live calls to Google Earth Engine.
"""

from __future__ import annotations

import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from typing import Any, Dict, List
from unittest.mock import MagicMock

import pytest

# Ensure the src folder is importable even when pytest runs from the repo root
PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_PATH = PROJECT_ROOT / "src"
if str(SRC_PATH) not in sys.path:
    sys.path.insert(0, str(SRC_PATH))

# Provide a lightweight Earth Engine stub when the real dependency is missing
if "ee" not in sys.modules:  # pragma: no cover - defensive path
    def _noop_function(*args: Any, **kwargs: Any) -> None:
        return None

    def _ee_getattr(name: str) -> Any:
        return SimpleNamespace()

    ee_stub = ModuleType("ee")
    # type: ignore[attr-defined]
    ee_stub.ServiceAccountCredentials = _noop_function
    ee_stub.Initialize = _noop_function  # type: ignore[attr-defined]
    ee_stub.__getattr__ = _ee_getattr  # type: ignore[attr-defined]
    setattr(
        ee_stub,
        "batch",
        SimpleNamespace(
            Export=SimpleNamespace(
                image=SimpleNamespace(toDrive=_noop_function),
                table=SimpleNamespace(toDrive=_noop_function),
            )
        ),
    )
    sys.modules["ee"] = ee_stub

import sar_flood_mapping  # type: ignore[import]  # noqa: E402

sar: Any = sar_flood_mapping


def test_initialize_earth_engine_with_service_account(monkeypatch: pytest.MonkeyPatch) -> None:
    credentials = MagicMock(name="credentials")
    service_account_cls = MagicMock(return_value=credentials)
    initialize_fn = MagicMock()

    monkeypatch.setattr(sar, "logger", MagicMock())
    monkeypatch.setattr(sar.ee, "ServiceAccountCredentials",
                        service_account_cls)
    monkeypatch.setattr(sar.ee, "Initialize", initialize_fn)

    assert sar.initialize_earth_engine("/tmp/key.json") is True
    service_account_cls.assert_called_once_with(None, "/tmp/key.json")
    initialize_fn.assert_called_once_with(credentials)


def test_initialize_earth_engine_handles_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    failing_initialize = MagicMock(side_effect=Exception("boom"))

    monkeypatch.setattr(sar, "logger", MagicMock())
    monkeypatch.setattr(sar.ee, "ServiceAccountCredentials", MagicMock())
    monkeypatch.setattr(sar.ee, "Initialize", failing_initialize)

    assert sar.initialize_earth_engine() is False
    failing_initialize.assert_called_once_with()


def test_run_flood_detection_compiles_results(monkeypatch: pytest.MonkeyPatch) -> None:
    geometry = object()
    sar_data: Dict[str, Any] = {"before": "before_img", "after": "after_img"}
    flood_results: Dict[str, Any] = {"flooded": "mask", "flood_area_ha": 42}
    damage_results: Dict[str, Any] = {"exposed_population": 120}
    export_tasks: List[Dict[str, Any]] = [
        {"type": "raster", "description": "Flood extent"}]

    monkeypatch.setattr(sar, "logger", MagicMock())
    monkeypatch.setattr(sar, "db_creator", MagicMock(return_value=sar_data))
    monkeypatch.setattr(sar, "flood_estimation",
                        MagicMock(return_value=flood_results))
    monkeypatch.setattr(sar, "damage_assessment",
                        MagicMock(return_value=damage_results))
    monkeypatch.setattr(sar, "export_results",
                        MagicMock(return_value=export_tasks))

    result = sar.run_flood_detection(
        geometry=geometry,
        before_start="2025-01-01",
        before_end="2025-01-10",
        after_start="2025-01-11",
        after_end="2025-01-20",
    )

    assert result["sar_data"] == sar_data
    assert result["flood_results"] == flood_results
    assert result["damage_results"] == damage_results
    assert result["export_tasks"] == export_tasks
    assert result["parameters"]["before_period"] == "2025-01-01 to 2025-01-10"
    assert result["parameters"]["after_period"] == "2025-01-11 to 2025-01-20"

    sar.db_creator.assert_called_once()
    sar.flood_estimation.assert_called_once()
    sar.damage_assessment.assert_called_once()
    sar.export_results.assert_called_once()
