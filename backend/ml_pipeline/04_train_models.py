"""
STEP 4: TRAIN MODELS
====================
Purpose: Train primary models (Random Forest, TCN) and optional models (LSTM)
Output: 04_trained_models/, 04_training_log.json

PRIMARY MODELS (Required):
- Random Forest: Classical ML baseline with high interpretability
- TCN (Temporal Convolutional Network): Deep learning for time series patterns

OPTIONAL MODELS:
- LSTM: Recurrent network for long-term forecasting
- Gradient Boosting: Alternative ensemble method (if needed)

PRODUCTION STANDARDS:
- Train multiple model types for comparison
- Use stratified train/test split
- Apply SMOTE for class balance
- Log all hyperparameters and training metrics
"""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import json
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from imblearn.over_sampling import SMOTE
import warnings
warnings.filterwarnings('ignore')

# Optional: Import deep learning libraries
try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import TensorDataset, DataLoader
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    print("⚠ PyTorch not available. TCN and LSTM models will be skipped.")
    print("  Install with: pip install torch")

# Configuration
PIPELINE_DIR = Path(__file__).parent
OUTPUT_DIR = PIPELINE_DIR / "outputs"
MODELS_DIR = OUTPUT_DIR / "04_trained_models"
MODELS_DIR.mkdir(exist_ok=True)

# Training configuration
TRAIN_OPTIONAL_MODELS = True  # Set to False to train only primary models

# Deep Learning Model Architectures
class TCNModel(nn.Module):
    """Temporal Convolutional Network for time series flood prediction"""
    def __init__(self, input_dim, num_channels=[64, 32, 16], kernel_size=3, dropout=0.2):
        super(TCNModel, self).__init__()
        self.tcn_layers = nn.ModuleList()
        in_channels = 1
        
        for out_channels in num_channels:
            self.tcn_layers.append(nn.Sequential(
                nn.Conv1d(in_channels, out_channels, kernel_size, padding=kernel_size//2),
                nn.BatchNorm1d(out_channels),
                nn.ReLU(),
                nn.Dropout(dropout)
            ))
            in_channels = out_channels
        
        # Calculate output size dynamically
        with torch.no_grad():
            dummy_input = torch.randn(1, 1, input_dim)
            for layer in self.tcn_layers:
                dummy_input = layer(dummy_input)
            flattened_size = dummy_input.flatten(1).shape[1]
        
        self.fc = nn.Linear(flattened_size, 2)
    
    def forward(self, x):
        # x shape: (batch, features)
        x = x.unsqueeze(1)  # (batch, 1, features)
        for layer in self.tcn_layers:
            x = layer(x)
        x = x.flatten(1)
        return self.fc(x)

class LSTMModel(nn.Module):
    """LSTM Network for sequential flood forecasting"""
    def __init__(self, input_dim, hidden_dim=64, num_layers=2, dropout=0.2):
        super(LSTMModel, self).__init__()
        self.lstm = nn.LSTM(
            input_dim, hidden_dim, num_layers,
            batch_first=True, dropout=dropout if num_layers > 1 else 0
        )
        self.fc = nn.Linear(hidden_dim, 2)
    
    def forward(self, x):
        # x shape: (batch, features)
        x = x.unsqueeze(1)  # (batch, 1, features) - single time step
        lstm_out, _ = self.lstm(x)
        return self.fc(lstm_out[:, -1, :])

print("=" * 80)
print("STEP 4: TRAIN MODELS")
print("=" * 80)
print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 80)

# ============================================================================
# 1. LOAD PREPROCESSED DATA
# ============================================================================
print("\n[1/5] LOADING PREPROCESSED DATA...")

data_path = OUTPUT_DIR / "03_preprocessed_data.csv"
if not data_path.exists():
    print(f" ERROR: Run 03_preprocess_data.py first")
    exit(1)

df = pd.read_csv(data_path)
print(f" Loaded: {data_path.name}")
print(f"   Samples: {len(df)}")

# ============================================================================
# 2. PREPARE FEATURES AND TARGET
# ============================================================================
print("\n[2/5] PREPARING FEATURES AND TARGET...")

# Check which target column exists
if 'flood' in df.columns:
    target_col = 'flood'
elif 'is_flood_event' in df.columns:
    target_col = 'is_flood_event'
else:
    print("ERROR: No target column found ('flood' or 'is_flood_event')")
    exit(1)

print(f"  Using target column: '{target_col}'")

exclude_cols = ['event_id', 'flood', 'is_flood_event', 'start_date', 'end_date', 'region']

# Get feature columns (exclude any metadata/target columns)
feature_cols = [col for col in df.columns if col not in exclude_cols]
print(f"   Features: {len(feature_cols)}")

X = df[feature_cols].values
y = df[target_col].values

print(f" Feature matrix: {X.shape}")
print(f" Target vector: {y.shape}")
print(f"   Flood events: {y.sum()} ({y.mean()*100:.1f}%)")

# ============================================================================
# 3. TRAIN/TEST SPLIT
# ============================================================================
print("\n[3/5] SPLITTING DATA...")

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.25,
    random_state=42,
    stratify=y
)

print(f" Training: {len(X_train)} samples | Flood: {y_train.sum()} ({y_train.mean()*100:.1f}%)")
print(f" Test: {len(X_test)} samples | Flood: {y_test.sum()} ({y_test.mean()*100:.1f}%)")

# Apply SMOTE if class imbalance
train_balance = y_train.mean()
if train_balance < 0.4 or train_balance > 0.6:
    print(f"\n   Applying SMOTE (class imbalance: {train_balance:.1%})...")
    smote = SMOTE(random_state=42, k_neighbors=min(3, y_train.sum() - 1))
    X_train_balanced, y_train_balanced = smote.fit_resample(X_train, y_train)
    print(f"    Balanced: {len(X_train_balanced)} samples")
    print(f"      Flood: {y_train_balanced.sum()} | Non-flood: {len(y_train_balanced) - y_train_balanced.sum()}")
else:
    print(f"    Classes balanced ({train_balance:.1%}), no SMOTE needed")
    X_train_balanced = X_train
    y_train_balanced = y_train

# ============================================================================
# 4. TRAIN MODELS
# ============================================================================
print("\n[4/5] TRAINING MODELS...")

models = {}
training_log = {}
model_count = 0

# ===== PRIMARY MODELS =====

# [PRIMARY 1/2] Random Forest
print("\n   [PRIMARY 1/2] Training Random Forest (OPTIMIZED FOR 86%+ ACCURACY)...")
# Optimized for high accuracy while preventing overfitting
rf_params = {
    'n_estimators': 300,     # Increased for better ensemble
    'max_depth': 12,         # Slightly deeper for complex patterns
    'min_samples_split': 8,  # Balanced regularization
    'min_samples_leaf': 4,   # Allow finer-grained decisions
    'max_features': 'sqrt',  
    'class_weight': 'balanced',
    'random_state': 42,
    'n_jobs': -1,
    'bootstrap': True,
    'oob_score': True,       
    'criterion': 'gini',
    'min_impurity_decrease': 0.005,  # Less aggressive pruning
    'max_samples': 0.8,      # Use more data per tree
    'ccp_alpha': 0.0005      # Light regularization
}

rf = RandomForestClassifier(**rf_params)
start_time = datetime.now()
rf.fit(X_train_balanced, y_train_balanced)
train_time = (datetime.now() - start_time).total_seconds()

models['random_forest'] = rf
training_log['random_forest'] = {
    'model_type': 'RandomForestClassifier',
    'category': 'PRIMARY',
    'hyperparameters': rf_params,
    'training_time_seconds': train_time,
    'training_samples': int(len(X_train_balanced))
}
model_count += 1
print(f"       Trained in {train_time:.2f}s")

# [PRIMARY 2/2] TCN (Temporal Convolutional Network) with Few-Shot Learning
if TORCH_AVAILABLE:
    print("\n   [PRIMARY 2/2] Training TCN with Few-Shot Learning (Data Augmentation)...")
    
    # Ensure data is numeric (convert object dtypes to float32)
    X_train_numeric = X_train_balanced.astype(np.float32)
    X_test_numeric = X_test.astype(np.float32)
    
    # FEW-SHOT LEARNING: Data Augmentation for small datasets
    print("      Applying few-shot learning techniques...")
    
    # 1. Add Gaussian noise (creates variations of existing samples)
    noise_factor = 0.05  # 5% noise
    X_augmented = []
    y_augmented = []
    
    # Original data
    X_augmented.append(X_train_numeric)
    y_augmented.append(y_train_balanced)
    
    # Augmentation 1: Add small random noise
    noise1 = np.random.normal(0, noise_factor, X_train_numeric.shape)
    X_noise1 = X_train_numeric + noise1 * np.abs(X_train_numeric)
    X_augmented.append(X_noise1.astype(np.float32))
    y_augmented.append(y_train_balanced)
    
    # Augmentation 2: Add different noise pattern
    noise2 = np.random.normal(0, noise_factor * 0.5, X_train_numeric.shape)
    X_noise2 = X_train_numeric + noise2 * np.abs(X_train_numeric)
    X_augmented.append(X_noise2.astype(np.float32))
    y_augmented.append(y_train_balanced)
    
    # Combine augmented data
    X_train_aug = np.vstack(X_augmented).astype(np.float32)
    y_train_aug = np.hstack(y_augmented)
    
    print(f"      Original samples: {len(X_train_numeric)} -> Augmented: {len(X_train_aug)}")
    
    # Prepare PyTorch datasets with augmented data
    X_train_tensor = torch.FloatTensor(X_train_aug)
    y_train_tensor = torch.LongTensor(y_train_aug)
    X_test_tensor = torch.FloatTensor(X_test_numeric)
    y_test_tensor = torch.LongTensor(y_test)
    
    train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)  # Smaller batch for few-shot
    
    # Initialize model with SIMPLER architecture for few-shot learning
    tcn_params = {
        'input_dim': X_train.shape[1],  # 16 features
        'num_channels': [32, 16],       # Reduced from [64, 32] for few-shot
        'kernel_size': 2,               # Smaller kernel to reduce parameters
        'dropout': 0.5                  # Very strong regularization for few-shot
    }
    tcn_model = TCNModel(**tcn_params)
    
    print(
        f"      TCN Parameters: input={X_train.shape[1]}, "
        f"channels={tcn_params['num_channels']}, "
        f"total_params={sum(p.numel() for p in tcn_model.parameters())}"
    )
    
    # Few-shot learning configuration
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)  # Label smoothing for few-shot
    optimizer = optim.Adam(tcn_model.parameters(), lr=0.0005, weight_decay=1e-3)  # Lower LR, higher reg
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=10)
    epochs = 100  # More epochs with early stopping
    
    # Train with early stopping
    start_time = datetime.now()
    tcn_model.train()
    best_loss = float('inf')
    patience_counter = 0
    patience = 10
    
    for epoch in range(epochs):
        epoch_loss = 0
        for batch_X, batch_y in train_loader:
            optimizer.zero_grad()
            outputs = tcn_model(batch_X)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
        
        avg_loss = epoch_loss / len(train_loader)
        scheduler.step(avg_loss)
        
        # Early stopping
        if avg_loss < best_loss:
            best_loss = avg_loss
            patience_counter = 0
        else:
            patience_counter += 1
        
        if (epoch + 1) % 10 == 0:
            print(f"        Epoch {epoch+1}/{epochs}, Loss: {avg_loss:.4f}, Best: {best_loss:.4f}")
        
        if patience_counter >= patience:
            print(f"        Early stopping at epoch {epoch+1}")
            break
    
    train_time = (datetime.now() - start_time).total_seconds()
    
    models['tcn'] = tcn_model
    training_log['tcn'] = {
        'model_type': 'TCNModel',
        'category': 'PRIMARY',
        'hyperparameters': tcn_params,
        'epochs': epochs,
        'training_time_seconds': train_time,
        'training_samples': int(len(X_train_balanced))
    }
    model_count += 1
    print(f"       Trained in {train_time:.2f}s")
else:
    print("\n   [PRIMARY 2/2] TCN skipped (PyTorch not available)")

# ===== OPTIONAL MODELS =====

if TRAIN_OPTIONAL_MODELS:
    print("\n   Training optional models...")
    
    # [OPTIONAL 1/2] LSTM for Forecasting
    if TORCH_AVAILABLE:
        print("\n   [OPTIONAL 1/2] Training LSTM (Forecasting)...")
        
        # Ensure data is numeric (use same numeric data as TCN)
        X_train_numeric = X_train_balanced.astype(np.float32)
        X_test_numeric = X_test.astype(np.float32)
        
        # Initialize with CORRECT input_dim (16 features, not 19)
        lstm_params = {
            'input_dim': X_train.shape[1],  # This will be 16
            'hidden_dim': 64,
            'num_layers': 2,
            'dropout': 0.2
        }
        lstm_model = LSTMModel(**lstm_params)
        
        # Prepare PyTorch datasets
        X_train_tensor = torch.FloatTensor(X_train_numeric)
        y_train_tensor = torch.LongTensor(y_train_balanced)
        
        train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
        train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
        
        # Training configuration
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(lstm_model.parameters(), lr=0.001)
        epochs = 50
        
        # Train
        start_time = datetime.now()
        lstm_model.train()
        for epoch in range(epochs):
            epoch_loss = 0
            for batch_X, batch_y in train_loader:
                optimizer.zero_grad()
                outputs = lstm_model(batch_X)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()
            
            if (epoch + 1) % 10 == 0:
                print(f"        Epoch {epoch+1}/{epochs}, Loss: {epoch_loss/len(train_loader):.4f}")
        
        train_time = (datetime.now() - start_time).total_seconds()
        
        models['lstm'] = lstm_model
        training_log['lstm'] = {
            'model_type': 'LSTMModel',
            'category': 'OPTIONAL',
            'purpose': 'Time series forecasting',
            'hyperparameters': lstm_params,
            'epochs': epochs,
            'training_time_seconds': train_time,
            'training_samples': int(len(X_train_balanced))
        }
        model_count += 1
        print(f"       Trained in {train_time:.2f}s")
    else:
        print("\n   [OPTIONAL 1/2] LSTM skipped (PyTorch not available)")
    
    # [OPTIONAL 2/2] Gradient Boosting
    print("\n   [OPTIONAL 2/2] Training Gradient Boosting (OPTIMIZED FOR 86%+ ACCURACY)...")
    # Optimized parameters for high accuracy
    gb_params = {
        'n_estimators': 200,      # Increased for better learning
        'max_depth': 6,           # Slightly deeper trees
        'min_samples_split': 8,   # Balanced regularization
        'min_samples_leaf': 4,    # Allow finer decisions
        'learning_rate': 0.08,    # Faster learning
        'subsample': 0.8,         # More data per tree
        'max_features': 'sqrt',   
        'random_state': 42,
        'validation_fraction': 0.15,  
        'n_iter_no_change': 20,       # More patience for convergence
        'tol': 1e-4,                  # Stricter tolerance
        'ccp_alpha': 0.0003          # Light pruning
    }
    
    gb = GradientBoostingClassifier(**gb_params)
    start_time = datetime.now()
    gb.fit(X_train_balanced, y_train_balanced)
    train_time = (datetime.now() - start_time).total_seconds()
    
    models['gradient_boosting'] = gb
    training_log['gradient_boosting'] = {
        'model_type': 'GradientBoostingClassifier',
        'category': 'OPTIONAL',
        'purpose': 'Alternative ensemble method',
        'hyperparameters': gb_params,
        'training_time_seconds': train_time,
        'training_samples': int(len(X_train_balanced))
    }
    model_count += 1
    print(f"       Trained in {train_time:.2f}s")
else:
    print("\n   Optional models skipped (TRAIN_OPTIONAL_MODELS=False)")

print(f"\n Total models trained: {model_count}")

# ============================================================================
# 5. SAVE MODELS
# ============================================================================
print("\n[5/5] SAVING MODELS...")

for name, model in models.items():
    if name in ['tcn', 'lstm']:
        # Save PyTorch models
        model_path = MODELS_DIR / f"{name}_model.pt"
        torch.save({
            'model_state_dict': model.state_dict(),
            'model_class': type(model).__name__,
            'hyperparameters': training_log[name]['hyperparameters']
        }, model_path)
        print(f" Saved: {model_path}")
    else:
        # Save scikit-learn models
        model_path = MODELS_DIR / f"{name}.pkl"
        joblib.dump(model, model_path)
        print(f" Saved: {model_path}")

# Save feature names
features_path = MODELS_DIR / "feature_names.json"
with open(features_path, "w") as f:
    json.dump(feature_cols, f, indent=2)
print(f" Saved: {features_path}")

# Save training configuration
config = {
    "step": "04_train_models",
    "created_at": datetime.now().isoformat(),
    "data": {
        "total_samples": int(len(df)),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "features": len(feature_cols),
        "smote_applied": len(X_train_balanced) > len(X_train)
    },
    "models": training_log,
    "test_data": {
        "X_test_shape": list(X_test.shape),
        "y_test_shape": list(y_test.shape),
        "saved_for_evaluation": True
    }
}

config_path = OUTPUT_DIR / "04_training_log.json"
with open(config_path, "w") as f:
    json.dump(config, f, indent=2)
print(f" Saved: {config_path}")

# Save test data for evaluation
test_data_path = OUTPUT_DIR / "04_test_data.npz"
np.savez(test_data_path, X_test=X_test, y_test=y_test)
print(f" Saved: {test_data_path}")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("STEP 4 COMPLETE")
print("=" * 80)
print(f" Total models trained: {model_count}")
print(f"\n PRIMARY MODELS:")
for name in models.keys():
    if training_log[name].get('category') == 'PRIMARY':
        train_time = training_log[name]['training_time_seconds']
        print(f"   - {name}: trained in {train_time:.2f}s")
if TRAIN_OPTIONAL_MODELS:
    print(f"\n OPTIONAL MODELS:")
    for name in models.keys():
        if training_log[name].get('category') == 'OPTIONAL':
            train_time = training_log[name]['training_time_seconds']
            purpose = training_log[name].get('purpose', '')
            print(f"   - {name}: trained in {train_time:.2f}s ({purpose})")
print(f"\n Test data saved for evaluation")
print(f" Training configuration logged")
print(f"\nNext step: Run 05_evaluate_tune.py")
print("=" * 80)
