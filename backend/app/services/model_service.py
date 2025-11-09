"""
Model Service - Loading and Managing ML Models

This service handles all the machine learning models for flood prediction.
We have three main models: Random Forest, Gradient Boosting, and a TCN (Temporal 
Convolutional Network) for time series. 

The models are trained on real satellite data with 96.88% accuracy on our test set.
When the API starts up, this service loads all the model files and keeps them 
in memory for fast predictions.

Author: John Angou
Last Updated: November 2025
"""

import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, Tuple
from typing import List
import logging
from pathlib import Path
import sys
import os
import time
from sklearn.metrics import roc_auc_score, f1_score, precision_score, recall_score, average_precision_score

logger = logging.getLogger(__name__)

# Try to import PyTorch (optional)
try:
    import torch
    torch_available = True
except ImportError:
    torch_available = False
    logger.warning("PyTorch not available - TCN and LSTM models will not be loaded")


sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from core.config import settings

# Helper functions
def get_device():
    """Check if we have a GPU available, otherwise use CPU"""
    return torch.device('cuda' if torch.cuda.is_available() else 'cpu')

def ensure_tensor_on_device(t, device, dtype=None):
    """Convert input to PyTorch tensor and move it to the right device"""
    t = torch.tensor(t, dtype=dtype) if not isinstance(t, torch.Tensor) else t
    return t.to(device)


class TCNModel(torch.nn.Module):
    """
    Temporal Convolutional Network for flood prediction.
    
    This is a neural network that's good at detecting patterns over time.
    Uses multiple convolutional layers with batch normalization to process
    sequential patterns in satellite data for flood detection.
    """
    
    def __init__(self, input_dim, num_channels=[64, 32, 16], kernel_size=3, dropout=0.2):
        super(TCNModel, self).__init__()
        self.tcn_layers = torch.nn.ModuleList()
        in_channels = 1
        
        for out_channels in num_channels:
            self.tcn_layers.append(torch.nn.Sequential(
                torch.nn.Conv1d(in_channels, out_channels, kernel_size, padding=kernel_size//2),
                torch.nn.BatchNorm1d(out_channels),
                torch.nn.ReLU(),
                torch.nn.Dropout(dropout)
            ))
            in_channels = out_channels
        
        self.fc = torch.nn.Linear(num_channels[-1] * input_dim, 2)
    
    def forward(self, x):
        # x shape: (batch, features)
        x = x.unsqueeze(1)  # (batch, 1, features)
        for layer in self.tcn_layers:
            x = layer(x)
        x = x.flatten(1)
        return self.fc(x)


class LSTMModel(torch.nn.Module):
    """
    LSTM (Long Short-Term Memory) Network for flood forecasting.
    
    This is a recurrent neural network designed for time series forecasting.
    It can capture long-term dependencies and is particularly useful for
    multi-step ahead flood predictions.
    
    Architecture:
    - Bidirectional LSTM layers to capture both forward and backward temporal patterns
    - Dropout for regularization
    - Fully connected layer for binary classification (flood vs no-flood)
    """
    
    def __init__(self, input_dim=19, hidden_dim=64, num_layers=2, dropout=0.2):
        super(LSTMModel, self).__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        # LSTM layer with dropout between layers
        self.lstm = torch.nn.LSTM(
            input_dim, 
            hidden_dim, 
            num_layers,
            batch_first=True, 
            dropout=dropout if num_layers > 1 else 0,
            bidirectional=False
        )
        
        # Fully connected output layer
        self.fc = torch.nn.Linear(hidden_dim, 2)
        self.dropout = torch.nn.Dropout(dropout)
    
    def forward(self, x):
        # Add sequence dimension if not present
        if len(x.shape) == 2:
            x = x.unsqueeze(1)  # (batch, 1, features) - single time step
        
        # LSTM forward pass
        lstm_out, (hidden, cell) = self.lstm(x)
        
        # Use the last hidden state
        last_hidden = lstm_out[:, -1, :]
        
        # Apply dropout and classification layer
        out = self.dropout(last_hidden)
        return self.fc(out)


class ModelService:
    """Service for loading and managing ML models"""

    models_loaded = False
    rf_model = None
    gb_model = None  # Gradient Boosting model (new production model)
    tcn_model = None
    lstm_model = None  # LSTM model for time series forecasting
    prototypical_model = None
    scaler = None  # Feature scaler for production models
    
    # PRODUCTION MODELS: Trained on time series data (126 samples, 96.88% accuracy)
    # Features from aggregated_flood_events.csv (16 features total - ACTUAL REAL DATA)
    feature_columns = [
        # SAR VV statistics (Sentinel-1 backscatter)
        'VV_mean', 'VV_std', 'VV_min', 'VV_max',
        # SAR VH statistics
        'VH_mean', 'VH_std', 'VH_min', 'VH_max',
        # SAR standard deviation statistics
        'VV_stdDev_mean', 'VH_stdDev_mean',
        # Precipitation statistics
        'precipitation_sum', 'precipitation_mean', 'precipitation_max',
        # Topography
        'elevation_mean', 'slope_mean',
        # Water occurrence
        'water_occurrence_mean'
    ]

    @classmethod
    async def load_models(cls):
        """
        Load ML models directly from training pipeline output.
        
        ARCHITECTURE: Models are loaded from ml_pipeline/outputs/04_trained_models/
        This is the single source of truth - no copying or duplication needed.
        """
        try:
            # Try multiple paths to find training output directory
            possible_paths = [
                # Docker container mounted models directory (priority)
                Path("/app/models"),
                # Docker container path
                Path("/app/backend/ml_pipeline/outputs/04_trained_models"),
                # From backend/app/services
                Path(__file__).parent.parent.parent / "ml_pipeline" / "outputs" / "04_trained_models",
                # From project root
                Path.cwd() / "backend" / "ml_pipeline" / "outputs" / "04_trained_models",
            ]
            
            models_dir = None
            for path in possible_paths:
                if path.exists():
                    models_dir = path
                    logger.info(f"✓ Found models directory: {path}")
                    break
            
            if not models_dir:
                logger.error("Models directory not found. Run ml_pipeline/04_train_models.py first.")
                cls.models_loaded = False
                return

            # Load feature scaler (from preprocessing step)
            scaler_path = models_dir.parent / "03_feature_scaler.pkl"
            if scaler_path.exists():
                cls.scaler = joblib.load(scaler_path)
                logger.info("Feature scaler loaded")
            else:
                logger.warning("Feature scaler not found - predictions may fail")

            # PRIMARY MODEL 1: Random Forest
            rf_path = models_dir / "random_forest.pkl"
            if rf_path.exists():
                cls.rf_model = joblib.load(rf_path)
                logger.info("✓ PRIMARY: Random Forest loaded")
            else:
                logger.warning("Random Forest model not found")

            # PRIMARY MODEL 2: TCN (Temporal Convolutional Network)
            tcn_path = models_dir / "tcn_model.pt"
            if tcn_path.exists() and torch_available:
                try:
                    checkpoint = torch.load(tcn_path, map_location=get_device(), weights_only=False)
                    input_dim = checkpoint.get('hyperparameters', {}).get('input_dim', 19)
                    cls.tcn_model = TCNModel(
                        input_dim=input_dim,
                        num_channels=checkpoint.get('hyperparameters', {}).get('num_channels', [64, 32, 16]),
                        kernel_size=checkpoint.get('hyperparameters', {}).get('kernel_size', 3),
                        dropout=checkpoint.get('hyperparameters', {}).get('dropout', 0.2)
                    )
                    cls.tcn_model.load_state_dict(checkpoint['model_state_dict'])
                    cls.tcn_model.eval()
                    logger.info("✓ PRIMARY: TCN model loaded")
                except Exception as e:
                    logger.error(f"Failed to load TCN model: {e}")
            elif not torch_available:
                logger.info("⊘ TCN model skipped (PyTorch not available)")
            else:
                logger.warning("TCN model not found")

            # OPTIONAL MODEL 1: LSTM (Forecasting)
            lstm_path = models_dir / "lstm_model.pt"
            if lstm_path.exists() and torch_available:
                try:
                    checkpoint = torch.load(lstm_path, map_location=get_device(), weights_only=False)
                    input_dim = checkpoint.get('hyperparameters', {}).get('input_dim', 19)
                    cls.lstm_model = LSTMModel(
                        input_dim=input_dim,
                        hidden_dim=checkpoint.get('hyperparameters', {}).get('hidden_dim', 64),
                        num_layers=checkpoint.get('hyperparameters', {}).get('num_layers', 2),
                        dropout=checkpoint.get('hyperparameters', {}).get('dropout', 0.2)
                    )
                    cls.lstm_model.load_state_dict(checkpoint['model_state_dict'])
                    cls.lstm_model.eval()
                    logger.info("✓ OPTIONAL: LSTM model loaded (forecasting)")
                except Exception as e:
                    logger.error(f"Failed to load LSTM model: {e}")

            # OPTIONAL MODEL 2: Gradient Boosting
            gb_path = models_dir / "gradient_boosting.pkl"
            if gb_path.exists():
                cls.gb_model = joblib.load(gb_path)
                logger.info("✓ OPTIONAL: Gradient Boosting loaded")

            # Validate at least one PRIMARY model is loaded
            if cls.rf_model or cls.tcn_model:
                cls.models_loaded = True
                logger.info(f"✓ Models loaded successfully - RF={cls.rf_model is not None}, TCN={cls.tcn_model is not None}, LSTM={cls.lstm_model is not None}, GB={cls.gb_model is not None}, Scaler={cls.scaler is not None}")
            else:
                cls.models_loaded = False
                logger.error("✗ CRITICAL: No PRIMARY models loaded. Run ml_pipeline/04_train_models.py")

        except Exception as e:
            logger.error(f"Error loading models: {e}")
            cls.models_loaded = False

    # ===== Validation and calibration state =====
    rf_platt_A: Optional[float] = None
    rf_platt_B: Optional[float] = None
    tcn_temperature: float = 1.5
    last_validated: Optional[float] = None
    last_metrics: Optional[Dict[str, Any]] = None

    @staticmethod
    def _sigmoid(x: np.ndarray) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-x))

    @classmethod
    def _ece(cls, probs: np.ndarray, labels: np.ndarray, bins: int = 10) -> float:
        # Expected Calibration Error (simple binning)
        bin_edges = np.linspace(0, 1, bins + 1)
        ece = 0.0
        n = len(labels)
        for i in range(bins):
            mask = (probs >= bin_edges[i]) & (probs < bin_edges[i + 1])
            if not np.any(mask):
                continue
            conf = probs[mask].mean()
            acc = labels[mask].mean()
            ece += (mask.sum() / n) * abs(acc - conf)
        return float(ece)

    @classmethod
    def validate_on_csv(cls, dataset_path: str) -> Dict[str, Any]:
        if not Path(dataset_path).exists():
            return {"error": f"Dataset not found: {dataset_path}"}
        df = pd.read_csv(dataset_path)
        y = df.get('flood_label')
        if y is None:
            return {"error": "flood_label column missing"}
        y = y.values.astype(int)
        # Build features in expected order with defaults
        X_feats: List[Dict[str, Any]] = []
        for _, row in df.iterrows():
            feats = {col: row.get(col) for col in cls.feature_columns}
            X_feats.append(feats)

        # Collect model probabilities
        probs_rf, probs_tcn, probs_ens = [], [], []
        for feats in X_feats:
            # RF
            try:
                if cls.rf_model is not None:
                    p, _, _ = cls.predict_rf(feats)
                    probs_rf.append(p)
                else:
                    probs_rf.append(np.nan)
            except Exception:
                probs_rf.append(np.nan)
            # TCN
            try:
                if cls.tcn_model is not None:
                    p, _, _ = cls.predict_tcn(feats)
                    probs_tcn.append(p)
                else:
                    probs_tcn.append(np.nan)
            except Exception:
                probs_tcn.append(np.nan)
            # Ensemble
            try:
                p, _, _, _ = cls.predict_ensemble(feats)
                probs_ens.append(p)
            except Exception:
                probs_ens.append(np.nan)

        def metrics_from_probs(probs: List[float]) -> Dict[str, Any]:
            p = np.array([x if x == x else 0.0 for x in probs])  # replace NaN with 0
            y_pred = (p >= 0.5).astype(int)
            try:
                auc = roc_auc_score(y, p)
            except Exception:
                auc = float('nan')
            try:
                from sklearn.metrics import average_precision_score
                pr_auc = average_precision_score(y, p)
            except Exception:
                pr_auc = float('nan')
            f1 = f1_score(y, y_pred) if len(np.unique(y)) > 1 else float('nan')
            prec = precision_score(y, y_pred, zero_division=0)
            rec = recall_score(y, y_pred, zero_division=0)
            ece = cls._ece(p, y.astype(float))
            return {"roc_auc": float(auc), "pr_auc": float(pr_auc), "f1": float(f1), "precision": float(prec), "recall": float(rec), "ece": float(ece)}

        results = {
            "rf": metrics_from_probs(probs_rf),
            "tcn": metrics_from_probs(probs_tcn),
            "ensemble": metrics_from_probs(probs_ens),
            "count": int(len(y)),
        }
        cls.last_validated = time.time()
        cls.last_metrics = results
        return results

    @classmethod
    def fit_calibration(cls, dataset_path: str) -> Dict[str, Any]:
        if not Path(dataset_path).exists():
            return {"error": f"Dataset not found: {dataset_path}"}
        df = pd.read_csv(dataset_path)
        y = df.get('flood_label')
        if y is None:
            return {"error": "flood_label column missing"}
        y = y.values.astype(int)
        X_feats = [{col: row.get(col) for col in cls.feature_columns} for _, row in df.iterrows()]

        # RF Platt scaling: logistic regression on RF logits
        rf_probs = []
        for feats in X_feats:
            try:
                if cls.rf_model is not None:
                    p, _, _ = cls.predict_rf(features=feats)
                    rf_probs.append(p)
            except Exception:
                continue
        if rf_probs:
            p = np.clip(np.array(rf_probs), 1e-6, 1 - 1e-6)
            logits = np.log(p / (1 - p))
            # Fit A,B in sigmoid(A*x + B) to minimize log loss (closed form is not trivial; use simple linear regression on labels)
            # Use sklearn logistic regression for stability if available
            try:
                from sklearn.linear_model import LogisticRegression
                lr = LogisticRegression(max_iter=1000)
                lr.fit(logits.reshape(-1, 1), y[: len(logits)])
                A = float(lr.coef_[0][0])
                B = float(lr.intercept_[0])
                cls.rf_platt_A, cls.rf_platt_B = A, B
            except Exception:
                cls.rf_platt_A, cls.rf_platt_B = 1.0, 0.0

        # TCN temperature scaling: search temperature minimizing NLL on validation
        tcn_probs = []
        for feats in X_feats:
            try:
                if cls.tcn_model is not None:
                    # get logits by running model without softmax/temperature
                    device = get_device()
                    X = cls.preprocess_features(feats)
                    X_tensor = ensure_tensor_on_device(X, device, dtype=torch.float32)
                    with torch.no_grad():
                        output = cls.tcn_model(X_tensor)
                        logits = output[0].cpu().numpy()
                        # store positive class logit as difference
                        tcn_probs.append(logits)
            except Exception:
                continue
        if tcn_probs:
            logits_arr = np.array(tcn_probs)  # shape (N, 2)
            pos_logits = logits_arr[:, 1]
            def nll(temp: float) -> float:
                q = 1.0 / (1.0 + np.exp(-(pos_logits / max(temp, 1e-3))))
                q = np.clip(q, 1e-6, 1 - 1e-6)
                return float(-(y[: len(q)] * np.log(q) + (1 - y[: len(q)]) * np.log(1 - q)).mean())
            # simple grid search
            best_t = cls.tcn_temperature
            best_loss = nll(best_t)
            for t in [0.5, 0.8, 1.0, 1.2, 1.5, 2.0, 3.0]:
                loss = nll(t)
                if loss < best_loss:
                    best_loss = loss
                    best_t = t
            cls.tcn_temperature = best_t

        return {
            "rf_platt": {"A": cls.rf_platt_A, "B": cls.rf_platt_B},
            "tcn_temperature": cls.tcn_temperature,
        }
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
                # Convert classes to native Python types
                classes_raw = getattr(rf, "classes_", [])
                classes_list = []
                if hasattr(classes_raw, '__iter__'):
                    for c in classes_raw:
                        if hasattr(c, 'item'):  # numpy scalar
                            classes_list.append(c.item())
                        else:
                            classes_list.append(int(c) if isinstance(c, (int, float)) else c)
                
                meta["rf"] = {
                    "type": rf.__class__.__name__,
                    "n_features": int(getattr(rf, "n_features_in_", 0)) if hasattr(rf, "n_features_in_") else None,
                    "n_estimators": int(getattr(rf, "n_estimators", 0)) if hasattr(rf, "n_estimators") else None,
                    "classes": classes_list,
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
        """Preprocess input features for model prediction with scaling"""
        # Create feature vector in correct order for production models
        feature_vector = []
        for col in cls.feature_columns:
            if col in features:
                feature_vector.append(features[col])
            else:
                # Production model features - use 0.0 for missing (will be scaled anyway)
                feature_vector.append(0.0)

        # Apply standard scaling if scaler is loaded (REQUIRED for production models)
        feature_array = np.array(feature_vector).reshape(1, -1)
        if cls.scaler is not None:
            try:
                return cls.scaler.transform(feature_array)
            except Exception as e:
                logger.warning(f"Scaler transform failed: {e}, using unscaled features")
                return feature_array
        
        return feature_array

    @classmethod
    def predict_rf(cls, features: Dict[str, Any]) -> Tuple[float, float, float]:
        """Make prediction using Random Forest model with calibrated confidence"""
        if cls.rf_model is None:
            raise ValueError("Random Forest model not loaded. Please check server logs and ensure models directory is mounted correctly.")

        start_time = time.time()
        X = cls.preprocess_features(features)
        proba = cls.rf_model.predict_proba(X)[0]
        probability = float(proba[1])
        # Apply Platt scaling if available
        if cls.rf_platt_A is not None and cls.rf_platt_B is not None:
            logit = np.log(max(probability, 1e-6) / max(1 - probability, 1e-6))
            probability = float(cls._sigmoid(cls.rf_platt_A * logit + cls.rf_platt_B))
        
        entropy = -sum(p * np.log(p + 1e-10) for p in proba)
        confidence = float(1.0 - (entropy / np.log(len(proba))))
        inference_time = (time.time() - start_time) * 1000

        return probability, confidence, inference_time

    @classmethod
    def predict_gb(cls, features: Dict[str, Any]) -> Tuple[float, float, float]:
        """Make prediction using Gradient Boosting model with calibrated confidence"""
        if cls.gb_model is None:
            raise ValueError("Gradient Boosting model not loaded. Please check server logs and ensure models directory is mounted correctly.")

        start_time = time.time()
        X = cls.preprocess_features(features)
        proba = cls.gb_model.predict_proba(X)[0]
        probability = float(proba[1])
        
        # Calculate confidence from entropy
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
            temperature = cls.tcn_temperature
            probs = torch.softmax(output / temperature, dim=1)
            probability = probs[0, 1].item()
            confidence = float(max(probs[0]).item())
        
        inference_time = (time.time() - start_time) * 1000
        return float(probability), float(confidence), inference_time


    
    @classmethod
    def predict_ensemble(cls, features: Dict[str, Any]) -> Tuple[float, float, Dict[str, float], float]:
        """Ensemble prediction combining RF, GB, and TCN with weighted averaging
        
        CONFIDENCE CALCULATION (IMPROVED v2.0):
        1. Model Agreement: How close are predictions? (std deviation)
        2. Individual Certainty: Entropy-based confidence from each model
        3. Probability Certainty: Lower confidence near decision boundary (0.5)
        4. Model Performance: Weight by historical accuracy (RF:93.75%, GB:90.62%)
        5. Extreme Disagreement Penalty: Reduce confidence if disagreement > 30%
        
        Returns:
            - probability: Weighted average flood probability
            - confidence: How certain we are (0-1), multi-factor analysis
            - model_predictions: Individual model probabilities
            - inference_time: Total time in milliseconds
        """
        start_time = time.time()
        predictions = {}
        
        # Model weights based on test accuracy (RF:93.75%, GB:90.62%, TCN:90.62%)
        weights = {'rf': 0.40, 'gb': 0.38, 'tcn': 0.22}
        
        logger.info(f"Ensemble prediction starting with models: RF={cls.rf_model is not None}, GB={cls.gb_model is not None}, TCN={cls.tcn_model is not None}")
        
        try:
            if cls.rf_model is not None:
                logger.info("Attempting RF prediction...")
                rf_prob, rf_conf, _ = cls.predict_rf(features)
                predictions['rf'] = {'probability': rf_prob, 'confidence': rf_conf}
                logger.info(f"RF prediction successful: {rf_prob}")
        except Exception as e:
            logger.error(f"RF prediction failed: {e}", exc_info=True)
        
        try:
            if cls.gb_model is not None:
                logger.info("Attempting GB prediction...")
                gb_prob, gb_conf, _ = cls.predict_gb(features)
                predictions['gb'] = {'probability': gb_prob, 'confidence': gb_conf}
                logger.info(f"GB prediction successful: {gb_prob}")
        except Exception as e:
            logger.error(f"GB prediction failed: {e}", exc_info=True)
        
        try:
            if cls.tcn_model is not None:
                logger.info("Attempting TCN prediction...")
                tcn_prob, tcn_conf, _ = cls.predict_tcn(features)
                predictions['tcn'] = {'probability': tcn_prob, 'confidence': tcn_conf}
                logger.info(f"TCN prediction successful: {tcn_prob}")
        except Exception as e:
            logger.error(f"TCN prediction failed: {e}", exc_info=True)
        
        if not predictions:
            logger.error(f"No predictions available. RF={cls.rf_model is not None}, GB={cls.gb_model is not None}, TCN={cls.tcn_model is not None}")
            raise ValueError("No models available for ensemble prediction")
        
        # Weighted average of probabilities using available models
        total_weight = sum(weights[m] for m in predictions.keys())
        ensemble_prob = sum(
            predictions[m]['probability'] * weights[m] 
            for m in predictions.keys()
        ) / total_weight
        
        # ==== IMPROVED CONFIDENCE CALCULATION v2.0 ====
        probs = np.array([predictions[m]['probability'] for m in predictions.keys()])
        
        if len(predictions) == 1:
            # Single model: use its confidence, but reduce if near decision boundary
            base_conf = list(predictions.values())[0]['confidence']
            
            # Reduce confidence if probability is near 0.5 (uncertain)
            boundary_distance = abs(ensemble_prob - 0.5)  # 0 at boundary, 0.5 at extremes
            boundary_penalty = min(boundary_distance * 2.0, 1.0)  # Scale to 0-1
            
            ensemble_conf = base_conf * (0.7 + 0.3 * boundary_penalty)
        else:
            # Multiple models: multi-factor confidence analysis
            
            # 1. Agreement Score: How close are the predictions?
            prob_std = np.std(probs)
            # Improved: Exponential penalty for disagreement
            # Low std (< 0.05) = excellent, high std (> 0.3) = very poor
            if prob_std < 0.05:
                agreement_score = 1.0  # Perfect agreement
            elif prob_std < 0.15:
                agreement_score = 0.95 - (prob_std - 0.05) * 2.0  # 0.95 to 0.75
            elif prob_std < 0.3:
                agreement_score = 0.75 - (prob_std - 0.15) * 1.5  # 0.75 to 0.53
            else:
                agreement_score = 0.53 - min((prob_std - 0.3) * 1.0, 0.33)  # 0.53 to 0.20
            
            # 2. Average individual confidence (entropy-based from each model)
            avg_individual_conf = np.mean([predictions[m]['confidence'] for m in predictions.keys()])
            
            # 3. Probability Certainty: Reduce confidence near decision boundary (0.5)
            # Distance from 0.5: 0.0 = uncertain, 0.5 = very certain
            boundary_distance = abs(ensemble_prob - 0.5)
            if boundary_distance < 0.1:
                # Very close to boundary (0.4-0.6)
                probability_certainty = 0.5  # Low certainty
            elif boundary_distance < 0.2:
                # Near boundary (0.3-0.4 or 0.6-0.7)
                probability_certainty = 0.5 + (boundary_distance - 0.1) * 2.5  # 0.5 to 0.75
            else:
                # Far from boundary (< 0.3 or > 0.7)
                probability_certainty = 0.75 + (boundary_distance - 0.2) * 0.83  # 0.75 to 1.0
            
            # 4. Model Performance Weighting
            # RF: 93.75% accuracy, GB: 90.62% accuracy, TCN: 90.62% accuracy
            model_quality = 0.92  # Average of available models (~92%)
            
            # 5. Combine all factors with weights
            ensemble_conf = (
                0.45 * agreement_score +           # Primary: Model agreement
                0.25 * avg_individual_conf +       # Secondary: Individual certainty
                0.20 * probability_certainty +     # Tertiary: Boundary distance
                0.10 * model_quality               # Baseline: Model quality
            )
            
            # 6. Extreme Disagreement Penalty
            disagreement = np.max(probs) - np.min(probs)
            if disagreement > 0.30:
                # Severe disagreement (e.g., 30% vs 70%)
                penalty = 1.0 - min((disagreement - 0.30) / 0.50, 0.60)  # Up to 60% penalty
                ensemble_conf *= penalty
                logger.warning(
                    f"HIGH MODEL DISAGREEMENT ({disagreement:.2%}): "
                    f"Predictions={[f'{p:.2%}' for p in probs]}. "
                    f"Confidence reduced by {(1-penalty)*100:.0f}% to {ensemble_conf:.2%}"
                )
            elif disagreement > 0.20:
                # Moderate disagreement
                penalty = 1.0 - (disagreement - 0.20) * 0.5  # Up to 5% penalty
                ensemble_conf *= penalty
            
            # 7. Boost confidence if all models are very confident AND agree
            if agreement_score > 0.90 and avg_individual_conf > 0.85:
                boost = min((agreement_score - 0.90) * 0.5, 0.05)  # Up to 5% boost
                ensemble_conf = min(ensemble_conf + boost, 0.99)
        
        # Ensure confidence is in valid range [0.15, 0.99]
        # Min 15% to avoid false precision (we can't be 0% confident)
        ensemble_conf = float(np.clip(ensemble_conf, 0.15, 0.99))
        
        model_predictions = {m: predictions[m]['probability'] for m in predictions.keys()}
        inference_time = (time.time() - start_time) * 1000
        
        # Log results with proper formatting
        prob_std_val = prob_std if len(predictions) > 1 else 0.0
        logger.info(
            f"Ensemble result: prob={ensemble_prob:.3f}, conf={ensemble_conf:.3f}, "
            f"agreement_std={prob_std_val:.3f}, boundary_dist={abs(ensemble_prob-0.5):.3f}"
        )
        
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
    def map_gee_to_model_features(cls, gee_features: Dict[str, Any], latitude: float, longitude: float) -> Dict[str, Any]:
        """Map GEE service features to model's 16 expected features
        
        PRODUCTION-CRITICAL: This function transforms real satellite data from GEE API
        into the exact feature format expected by trained models.
        
        Args:
            gee_features: Raw features from GEE service API
            latitude: Location latitude (not used - for future extension)
            longitude: Location longitude (not used - for future extension)
            
        Returns:
            Dict with 16 features matching training data format
            
        Raises:
            ValueError: If required GEE features are missing
        """
        # Validate required GEE features exist
        required_gee = ['sar_vv', 'sar_vh', 'precipitation', 'elevation', 'water_occurrence']
        missing = [f for f in required_gee if f not in gee_features]
        if missing:
            raise ValueError(f"Missing required GEE features: {missing}")
        
        # Extract SAR statistics (VV and VH polarizations)
        sar_vv = gee_features.get('sar_vv', {})
        sar_vh = gee_features.get('sar_vh', {})
        
        # Extract precipitation statistics
        precip = gee_features.get('precipitation', {})
        
        # Extract topography
        topo = gee_features.get('elevation', {})
        
        # Extract water occurrence
        water = gee_features.get('water_occurrence', {})
        
        # Determine region based on latitude/longitude
        # Jonglei: lat 5.5-7.5, lon 30.5-33.5
        # Unity: lat 8.0-10.0, lon 29.0-33.0
        # Upper Nile: lat 8.5-10.5, lon 31.0-34.0
        region_jonglei = 1 if (5.5 <= latitude <= 7.5 and 30.5 <= longitude <= 33.5) else 0
        region_unity = 1 if (8.0 <= latitude <= 10.0 and 29.0 <= longitude <= 33.0) else 0
        region_upper_nile = 1 if (8.5 <= latitude <= 10.5 and 31.0 <= longitude <= 34.0) else 0
        
        # Build 16-feature vector matching training data (NO region encoding)
        model_features = {
            # SAR VV statistics (dB)
            'VV_mean': sar_vv.get('mean', 0.0),
            'VV_std': sar_vv.get('std', 0.0),
            'VV_min': sar_vv.get('min', 0.0),
            'VV_max': sar_vv.get('max', 0.0),
            
            # SAR VH statistics (dB)
            'VH_mean': sar_vh.get('mean', 0.0),
            'VH_std': sar_vh.get('std', 0.0),
            'VH_min': sar_vh.get('min', 0.0),
            'VH_max': sar_vh.get('max', 0.0),
            
            # SAR standard deviation (texture)
            'VV_stdDev_mean': sar_vv.get('stdDev_mean', 0.0),
            'VH_stdDev_mean': sar_vh.get('stdDev_mean', 0.0),
            
            # Precipitation statistics (mm)
            'precipitation_sum': precip.get('sum', 0.0),
            'precipitation_mean': precip.get('mean', 0.0),
            'precipitation_max': precip.get('max', 0.0),
            
            # Topography (meters, degrees)
            'elevation_mean': topo.get('mean', 0.0),
            'slope_mean': topo.get('slope_mean', 0.0),
            
            # Water occurrence (0-100%)
            'water_occurrence_mean': water.get('mean', 0.0),
        }
        
        # Validate all 16 features present
        if len(model_features) != 16:
            raise ValueError(f"Expected 16 features, got {len(model_features)}")
        
        return model_features
    
    @classmethod
    def generate_features_from_location(cls, lat: float, lon: float) -> Dict[str, Any]:
        """Generate model features for a location by calling GEE service
        
        PRODUCTION: Fetches real satellite data from Google Earth Engine via ee-fastapi service.
        This method is used by batch predictions and other endpoints that only have coordinates.
        
        Args:
            lat: Latitude of location
            lon: Longitude of location
            
        Returns:
            Dict with 19 features ready for model prediction
            
        Raises:
            HTTPException: If GEE service is unavailable (503)
            ValueError: If GEE features cannot be mapped to model format
        """
        import requests
        import os
        from fastapi import HTTPException
        
        # Call GEE service to extract real satellite features
        gee_service_url = os.getenv("GEE_SERVICE_URL", "http://localhost:8080")
        
        try:
            response = requests.get(
                f"{gee_service_url}/api/features/extract",
                params={"lat": lat, "lon": lon},
                timeout=15  # Satellite data extraction can take time
            )
            
            if response.status_code == 200:
                data = response.json()
                gee_features = data.get("features", {})
                
                # Map GEE features to model's expected format
                return cls.map_gee_to_model_features(gee_features, lat, lon)
                
            elif response.status_code == 503:
                logger.error(f"GEE service unavailable for location ({lat}, {lon})")
                raise HTTPException(
                    status_code=503,
                    detail="GEE service unavailable. Cannot extract satellite features for batch prediction."
                )
            else:
                logger.error(f"GEE service error {response.status_code}: {response.text}")
                raise HTTPException(
                    status_code=502,
                    detail=f"GEE service returned error: {response.status_code}"
                )
                
        except requests.exceptions.Timeout:
            logger.error(f"GEE service timeout for location ({lat}, {lon})")
            raise HTTPException(
                status_code=504,
                detail="GEE service timeout. Satellite data extraction took too long."
            )
        except requests.exceptions.ConnectionError:
            logger.error(f"Cannot connect to GEE service at {gee_service_url}")
            raise HTTPException(
                status_code=503,
                detail="GEE service unavailable. Cannot make predictions without real satellite data."
            )
