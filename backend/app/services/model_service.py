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
from functools import lru_cache

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
            # Get absolute path from backend/app directory
            base_dir = Path(__file__).parent.parent.parent.parent
            models_dir = base_dir / "models"

            print(f"Looking for models in: {models_dir.absolute()}")
            print(f"Models directory exists: {models_dir.exists()}")

            if models_dir.exists():
                print(
                    f"Files in models directory: {list(models_dir.glob('*'))}")

            # Load Random Forest model
            rf_path = models_dir / "random_forest.pkl"
            print(f"Checking RF model at: {rf_path.absolute()}")
            if rf_path.exists():
                cls.rf_model = joblib.load(rf_path)
                print(f"[OK] Random Forest model loaded from {rf_path}")
                logger.info(f"Random Forest model loaded from {rf_path}")
            else:
                print(f"[WARN] Random Forest model not found at {rf_path}")
                logger.warning(f"Random Forest model not found at {rf_path}")

            # Load TCN model
            tcn_path = models_dir / "tcn_model.pt"
            print(f"Checking TCN model at: {tcn_path.absolute()}")
            if tcn_path.exists():
                cls.tcn_model = TCNModel()
                cls.tcn_model.load_state_dict(torch.load(
                    tcn_path, map_location=get_device()))
                cls.tcn_model.eval()
                print(f"[OK] TCN model loaded from {tcn_path}")
                logger.info(f"TCN model loaded from {tcn_path}")
            else:
                print(f"[WARN] TCN model not found at {tcn_path}")
                logger.warning(f"TCN model not found at {tcn_path}")

            # Load Prototypical model (placeholder for now)
            proto_path = models_dir / "prototypical_model.pt"
            if proto_path.exists():
                print(f"[OK] Prototypical model found at {proto_path}")
                logger.info(
                    f"Prototypical model found at {proto_path} but not implemented yet")
            else:
                print(f"[WARN] Prototypical model not found at {proto_path}")
                logger.warning(f"Prototypical model not found at {proto_path}")

            cls.models_loaded = True
            print("[OK] Model loading complete")
            logger.info("All available models loaded successfully")

        except Exception as e:
            print(f"[ERROR] Error loading models: {e}")
            logger.error(f"Error loading models: {e}")
            import traceback
            traceback.print_exc()
            cls.models_loaded = False

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
            raise ValueError("Random Forest model not loaded")

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
            raise ValueError("TCN model not loaded")

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
    def predict_prototypical(cls, features: Dict[str, Any]) -> Tuple[float, float]:
        """Make prediction using Prototypical Network (placeholder)"""
        # Placeholder implementation
        # In a real implementation, this would use few-shot learning
        probability = 0.5  # Neutral prediction
        confidence = 0.3   # Low confidence for placeholder

        return float(probability), float(confidence)
    
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
        """Public method for feature generation with caching"""
        lat_lon_key = f"{latitude:.4f},{longitude:.4f}"
        return cls._cached_features(lat_lon_key)
    
    @classmethod
    @lru_cache(maxsize=1000)
    def _cached_features(cls, lat_lon_key: str) -> Dict[str, Any]:
        """Cached feature generation"""
        latitude, longitude = map(float, lat_lon_key.split(','))
        return cls._generate_features_impl(latitude, longitude)
    
    @classmethod
    def _generate_features_impl(cls, latitude: float, longitude: float) -> Dict[str, Any]:
        """Generate synthetic features based on location (for demo purposes)"""
        import random
        random.seed(int(latitude * 1000 + longitude * 1000))

        # Generate base values
        sar_before = random.uniform(-30, -15)
        sar_after = random.uniform(-35, -10)
        elevation = random.uniform(395, 430)
        water_occurrence = random.uniform(0, 100)

        # Calculate derived features
        sar_difference = sar_after / sar_before
        sar_change = sar_after - sar_before

        # Adjust for flood-prone areas
        if elevation < 405 and water_occurrence > 70:
            sar_change = random.uniform(-15, -5)
            pre_flood_precipitation = random.uniform(60, 120)
        else:
            pre_flood_precipitation = random.uniform(20, 120)

        # Return only the 10 features the model expects
        features = {
            'sar_change': sar_change,
            'pre_flood_precipitation': pre_flood_precipitation,
            'sar_difference': sar_difference,
            'water_occurrence': water_occurrence,
            'annual_precipitation': random.uniform(600, 1200),
            'sar_after': sar_after,
            'flood_season_precipitation': random.uniform(500, 1000),
            'upstream_precipitation': random.uniform(0.5, 2.5),
            'sar_before': sar_before,
            'elevation': elevation
        }

        return features
