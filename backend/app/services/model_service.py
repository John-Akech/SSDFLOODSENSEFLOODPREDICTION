import joblib
import torch
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, Tuple
import logging
from pathlib import Path
import sys
import os
import time


sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from core.config import settings

logger = logging.getLogger(__name__)

# Helper functions
def get_device():
    return torch.device('cuda' if torch.cuda.is_available() else 'cpu')

def ensure_tensor_on_device(t, device, dtype=None):
    t = torch.tensor(t, dtype=dtype) if not isinstance(t, torch.Tensor) else t
    return t.to(device)


class TCNModel(torch.nn.Module):
    """Temporal Convolutional Network for flood prediction"""
    
    def __init__(self, input_dim=10, hidden_dim=32, kernel_size=3, dropout=0.3):
        super(TCNModel, self).__init__()
        self.conv1 = torch.nn.Conv1d(1, hidden_dim, kernel_size, padding=kernel_size//2)
        self.conv2 = torch.nn.Conv1d(hidden_dim, hidden_dim//2, kernel_size, padding=kernel_size//2)
        self.dropout = torch.nn.Dropout(dropout)
        self.fc1 = torch.nn.Linear(hidden_dim//2 * input_dim, 16)
        self.fc2 = torch.nn.Linear(16, 2)
    
    def forward(self, x):
        x = x.unsqueeze(1)
        x = torch.relu(self.conv1(x))
        x = self.dropout(x)
        x = torch.relu(self.conv2(x))
        x = x.flatten(1)
        x = torch.relu(self.fc1(x))
        return self.fc2(x)


class ModelService:
    """Service for loading and managing ML models"""

    models_loaded = False
    rf_model = None
    tcn_model = None
    prototypical_model = None
    # Top 10 features used by the trained model
    feature_columns = [
        'sar_change', 'pre_flood_precipitation', 'sar_difference',
        'water_occurrence', 'annual_precipitation', 'sar_after',
        'flood_season_precipitation', 'upstream_precipitation',
        'sar_before', 'elevation'
    ]

    @classmethod
    async def load_models(cls):
        """Load all ML models"""
        try:
            # Try multiple paths to find models directory
            possible_paths = [
                Path("/app/models"),  # Docker container path (priority)
                Path(__file__).parent.parent.parent.parent / "models",  # From backend/app/services
                Path.cwd() / "models",  # From current working directory
            ]
            
            models_dir = None
            for path in possible_paths:
                if path.exists():
                    models_dir = path
                    break
            
            if not models_dir:
                logger.error("Models directory not found")
                cls.models_loaded = False
                return

            # Load Random Forest model
            rf_path = models_dir / "random_forest.pkl"
            if rf_path.exists():
                cls.rf_model = joblib.load(rf_path)
                logger.info("Random Forest model loaded")

            # Load TCN model
            tcn_path = models_dir / "tcn_model.pt"
            if tcn_path.exists():
                cls.tcn_model = TCNModel()
                cls.tcn_model.load_state_dict(torch.load(tcn_path, map_location=get_device()))
                cls.tcn_model.eval()
                logger.info("TCN model loaded")

            # Mark as loaded if at least one model is available
            if cls.rf_model or cls.tcn_model:
                cls.models_loaded = True
                logger.info(f"Models loaded: RF={cls.rf_model is not None}, TCN={cls.tcn_model is not None}")
            else:
                cls.models_loaded = False
                logger.error("No models were loaded")

        except Exception as e:
            logger.error(f"Error loading models: {e}")
            cls.models_loaded = False

    @classmethod
    def get_model_metadata(cls) -> Dict[str, Any]:
        """Return lightweight metadata about loaded models (no large tensors)."""
        meta: Dict[str, Any] = {
            "rf": None,
            "tcn": None,
            "models_loaded": cls.models_loaded,
        }
        if cls.rf_model is not None:
            rf = cls.rf_model
            try:
                meta["rf"] = {
                    "type": rf.__class__.__name__,
                    "n_features": getattr(rf, "n_features_in_", None),
                    "n_estimators": getattr(rf, "n_estimators", None),
                    "classes": [int(c) if isinstance(c, (int, float)) else c for c in getattr(rf, "classes_", [])],
                }
            except Exception as e:
                meta["rf"] = {"error": str(e)}
        if cls.tcn_model is not None:
            tcn = cls.tcn_model
            try:
                num_params = sum(p.numel() for p in tcn.parameters())
                meta["tcn"] = {
                    "type": tcn.__class__.__name__,
                    "num_parameters": int(num_params),
                    "layers": [
                        {
                            "name": name,
                            "shape": list(param.shape),
                            "trainable": bool(param.requires_grad),
                        }
                        for name, param in list(tcn.named_parameters())[:6]  # cap for brevity
                    ],
                }
            except Exception as e:
                meta["tcn"] = {"error": str(e)}
        return meta

    @classmethod
    def sanity_predict_from_dataset(cls, dataset_path: str) -> Dict[str, Any]:
        """Run a quick prediction using the first row of a dataset to verify feature ordering.
        Returns per-model probabilities and confidence along with used features.
        """
        if not Path(dataset_path).exists():
            return {"error": f"Dataset not found: {dataset_path}"}
        df = pd.read_csv(dataset_path)
        # Build features dict in expected order
        row = df.iloc[0].to_dict()
        features = {col: row.get(col) for col in cls.feature_columns}
        out: Dict[str, Any] = {"features_used": features}
        try:
            if cls.rf_model is not None:
                p, c, t = cls.predict_rf(features)
                out["rf"] = {"probability": p, "confidence": c, "inference_time_ms": t}
        except Exception as e:
            out["rf"] = {"error": str(e)}
        try:
            if cls.tcn_model is not None:
                p, c, t = cls.predict_tcn(features)
                out["tcn"] = {"probability": p, "confidence": c, "inference_time_ms": t}
        except Exception as e:
            out["tcn"] = {"error": str(e)}
        try:
            p, c, model_probs, t = cls.predict_ensemble(features)
            out["ensemble"] = {
                "probability": p,
                "confidence": c,
                "model_probabilities": model_probs,
                "inference_time_ms": t,
            }
        except Exception as e:
            out["ensemble"] = {"error": str(e)}
        return out

    @classmethod
    def preprocess_features(cls, features: Dict[str, Any]) -> np.ndarray:
        """Preprocess input features for model prediction"""
        # Create feature vector in correct order
        feature_vector = []
        for col in cls.feature_columns:
            if col in features:
                feature_vector.append(features[col])
            else:
                # Use default values for missing features
                default_values = {
                    'sar_before': -25.0, 'sar_after': -25.0, 'sar_difference': 1.0, 'sar_change': 0.0,
                    'elevation': 410.0, 'slope': 1.0, 'aspect': 180.0, 'water_occurrence': 50.0,
                    'river_distance': 50.0, 'water_distance': 10.0, 'annual_precipitation': 850.0,
                    'flood_season_precipitation': 700.0, 'pre_flood_precipitation': 50.0,
                    'upstream_precipitation': 1.0, 'flood_month': 7.0, 'year': 2024.0
                }
                feature_vector.append(default_values.get(col, 0.0))

        return np.array(feature_vector).reshape(1, -1)

    @classmethod
    def predict_rf(cls, features: Dict[str, Any]) -> Tuple[float, float, float]:
        """Make prediction using Random Forest model with calibrated confidence"""
        if cls.rf_model is None:
            raise ValueError("Random Forest model not loaded. Please check server logs and ensure models directory is mounted correctly.")

        start_time = time.time()
        X = cls.preprocess_features(features)
        proba = cls.rf_model.predict_proba(X)[0]
        probability = float(proba[1])
        
        entropy = -sum(p * np.log(p + 1e-10) for p in proba)
        confidence = float(1.0 - (entropy / np.log(len(proba))))
        inference_time = (time.time() - start_time) * 1000

        return probability, confidence, inference_time

    @classmethod
    def predict_tcn(cls, features: Dict[str, Any]) -> Tuple[float, float, float]:
        """Make prediction using TCN model with temperature scaling"""
        if cls.tcn_model is None:
            raise ValueError("TCN model not loaded. Please check server logs and ensure models directory is mounted correctly.")

        start_time = time.time()
        device = get_device()
        X = cls.preprocess_features(features)
        X_tensor = ensure_tensor_on_device(X, device, dtype=torch.float32)

        with torch.no_grad():
            output = cls.tcn_model(X_tensor)
            temperature = 1.5
            probs = torch.softmax(output / temperature, dim=1)
            probability = probs[0, 1].item()
            confidence = float(max(probs[0]).item())
        
        inference_time = (time.time() - start_time) * 1000
        return float(probability), float(confidence), inference_time


    
    @classmethod
    def predict_ensemble(cls, features: Dict[str, Any]) -> Tuple[float, float, Dict[str, float], float]:
        """Ensemble prediction combining RF and TCN with weighted averaging"""
        start_time = time.time()
        predictions = {}
        weights = {'rf': 0.6, 'tcn': 0.4}
        
        try:
            if cls.rf_model is not None:
                rf_prob, rf_conf, _ = cls.predict_rf(features)
                predictions['rf'] = {'probability': rf_prob, 'confidence': rf_conf}
        except Exception as e:
            logger.warning(f"RF prediction failed: {e}")
        
        try:
            if cls.tcn_model is not None:
                tcn_prob, tcn_conf, _ = cls.predict_tcn(features)
                predictions['tcn'] = {'probability': tcn_prob, 'confidence': tcn_conf}
        except Exception as e:
            logger.warning(f"TCN prediction failed: {e}")
        
        if not predictions:
            raise ValueError("No models available for ensemble prediction")
        
        # Weighted average of probabilities
        total_weight = sum(weights[m] for m in predictions.keys())
        ensemble_prob = sum(
            predictions[m]['probability'] * weights[m] 
            for m in predictions.keys()
        ) / total_weight
        
        # Confidence is average of individual confidences weighted by agreement
        ensemble_conf = sum(
            predictions[m]['confidence'] * weights[m] 
            for m in predictions.keys()
        ) / total_weight
        
        # Boost confidence if models agree
        if len(predictions) > 1:
            probs = [predictions[m]['probability'] for m in predictions.keys()]
            agreement = 1.0 - (max(probs) - min(probs))  # 1.0 if perfect agreement
            ensemble_conf = min(0.99, ensemble_conf * (1.0 + 0.2 * agreement))
        
        model_predictions = {m: predictions[m]['probability'] for m in predictions.keys()}
        inference_time = (time.time() - start_time) * 1000
        
        return float(ensemble_prob), float(ensemble_conf), model_predictions, inference_time

    @classmethod
    def get_risk_level(cls, probability: float) -> str:
        """Convert probability to risk level"""
        if probability >= 0.8:
            return "critical"
        elif probability >= 0.6:
            return "high"
        elif probability >= 0.4:
            return "medium"
        else:
            return "low"

    @classmethod
    def generate_features_from_location(cls, latitude: float, longitude: float) -> Dict[str, Any]:
        """Generate features from location coordinates"""
        return cls._generate_features_impl(latitude, longitude)
    
    @classmethod
    def _generate_features_impl(cls, latitude: float, longitude: float) -> Dict[str, Any]:
        """Generate features based on location with realistic variability"""
        import random
        import hashlib
        
        # Use location + timestamp for variability while keeping some consistency
        base_seed = int(hashlib.md5(f"{latitude:.4f},{longitude:.4f}".encode()).hexdigest()[:8], 16)
        random.seed(base_seed)
        
        # Base values influenced by location
        elevation = 400 + (latitude - 6) * 5 + random.uniform(-10, 10)
        water_occurrence = max(0, min(100, 50 + (8 - latitude) * 10 + random.uniform(-20, 20)))
        
        # SAR values with realistic variation
        sar_before = random.uniform(-28, -18)
        sar_change = random.uniform(-12, 3)
        sar_after = sar_before + sar_change
        sar_difference = sar_after / sar_before if sar_before != 0 else 1.0
        
        # Precipitation varies by season and location
        annual_precip = 700 + (latitude - 6) * 50 + random.uniform(-150, 150)
        flood_season_precip = annual_precip * random.uniform(0.6, 0.85)
        pre_flood_precip = random.uniform(30, 100) if water_occurrence > 60 else random.uniform(10, 60)
        upstream_precip = random.uniform(0.8, 2.0)
        
        # High risk conditions
        if elevation < 405 and water_occurrence > 70 and pre_flood_precip > 60:
            sar_change = random.uniform(-15, -8)
            pre_flood_precip = random.uniform(70, 120)
        
        features = {
            'sar_change': sar_change,
            'pre_flood_precipitation': pre_flood_precip,
            'sar_difference': sar_difference,
            'water_occurrence': water_occurrence,
            'annual_precipitation': annual_precip,
            'sar_after': sar_after,
            'flood_season_precipitation': flood_season_precip,
            'upstream_precipitation': upstream_precip,
            'sar_before': sar_before,
            'elevation': elevation
        }
        
        return features
