# Machine Learning Pipeline# Machine Learning Pipeline



## Overview## Architecture Overview



This pipeline automates model training from satellite data extraction to deployment. It's designed to run quarterly or after significant flood events to keep predictions current.This pipeline follows a **database-first architecture** where all Earth Engine data is stored in a database as the **single source of truth**. This ensures data consistency between extraction, training, and production.



## Architecture📖 **See [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) for detailed architecture documentation**



Database-first approach: All Google Earth Engine data stored in database as single source of truth.### Key Principles

- **Single Source of Truth**: Database stores all GEE data

```- **Environment-Specific**: SQLite for dev, PostgreSQL for production  

Google Earth Engine → Database → ML Pipeline → Production- **Traceable**: All data flows tracked through database

                        ↓- **Reproducible**: Query-based data loading for consistency

            gee_extracted_features table

```---



## Pipeline Steps## What This Does



8 automated steps:This pipeline automates the entire process of training our flood prediction models - from extracting satellite data to deploying a working model. It's designed to run regularly (like every quarter) to keep our predictions accurate as new flood data becomes available.



```**The Goal**: Automate model updates without manual intervention.

backend/ml_pipeline/

├── 00_extract_gee_data.py     # Retrieve satellite data, save to database---

├── 01_load_merge_data.py      # Load from database, merge with historical

├── 02_explore_visualize.py    # Statistical analysis## Data Flow

├── 03_preprocess_data.py      # Scaling, encoding, imputation

├── 04_train_models.py         # Train RF, GB, TCN models```

├── 05_evaluate_tune.py        # Test metrics, cross-validationGoogle Earth Engine → Database (Single Source) → ML Pipeline → Production API

├── 06_compare_models.py       # Select highest performing                         ↓

├── 07_save_model.py           # Deploy to production            gee_extracted_features table

└── run_pipeline.py            # Execute all steps                         ↓

```            [Load, Merge, Explore, Prepare]

                         ↓

## Usage            [Train, Evaluate, Compare]

                         ↓

### Automated (Recommended)            Approved Models → API

```

```bash

cd backend/ml_pipeline---

python run_pipeline.py

```## How It's Organized



Runs all 8 steps automatically. Takes 10-15 minutes.The pipeline has 8 steps, each in its own Python file:



### Manual (Individual Steps)```

backend/ml_pipeline/

```bash├── 00_extract_gee_data.py     → Get fresh satellite data → SAVE TO DATABASE

# Must run in order├── 01_load_merge_data.py      → LOAD FROM DATABASE → Combine with historical

python 00_extract_gee_data.py├── 02_explore_visualize.py    → Look at patterns and relationships in the data

python 01_load_merge_data.py├── 03_preprocess_data.py      → Clean up and prepare data for training

python 02_explore_visualize.py├── 04_train_models.py         → Train PRIMARY (RF, TCN) + OPTIONAL (LSTM, GB) models

python 03_preprocess_data.py├── 05_evaluate_tune.py        → Check how well the models perform

python 04_train_models.py├── 06_compare_models.py       → Select the highest performing model

python 05_evaluate_tune.py├── 07_save_model.py           → Save the selected model for use in production

python 06_compare_models.py├── run_pipeline.py            → Run everything automatically

python 07_save_model.py├── DATABASE_ARCHITECTURE.md   → Complete architecture documentation

```├── MODEL_ARCHITECTURE.md      → Model selection and configuration guide

└── outputs/                   → Where results get saved

## Step Details```



### Step 0: Extract GEE DataEach script does one specific thing and saves its results for the next step to use.

- Connects to Google Earth Engine

- Extracts Sentinel-1, CHIRPS, SRTM, JRC data---

- Saves to `gee_extracted_features` database table

- Regions: Jonglei, Unity, Upper Nile## Running the Pipeline

- Output: `outputs/00_gee_extracted_features.csv`

### Automated Execution (Recommended)

### Step 1: Load & Merge

- Loads from databaseRun one command to execute all steps:

- Combines with historical events (126 samples)

- Verifies 21 required columns```bash

- Output: `outputs/01_merged_dataset.csv`cd backend/ml_pipeline

python run_pipeline.py

### Step 2: Explore```

- Statistical summaries

- Correlation analysisThis will:

- Feature distributions1. Pull the latest satellite data from Google Earth Engine → **Store in Database**

- Output: `outputs/02_analysis_report.json`2. **Load from Database** → Merge it with our historical flood records  

3. Train new models on the combined dataset

### Step 3: Preprocess4. Test the models to ensure accuracy requirements are met

- Missing value imputation5. Select the highest performing model and deploy it

- StandardScaler normalization

- One-hot encoding (regions)Takes approximately 10-15 minutes depending on internet connection (Step 0 downloads satellite data).

- Output: `outputs/03_preprocessed_data.csv`

### Manual Execution (Step by Step)

### Step 4: Train

- 75/25 train/test splitTo run steps individually (for debugging or testing):

- SMOTE for class balance

- Random Forest (200 estimators, depth=12)```bash

- Gradient Boosting (150 estimators, lr=0.05)# Always start here - gets fresh satellite data

- Output: `outputs/04_trained_models/*.pkl`python 00_extract_gee_data.py



### Step 5: Evaluate# Then run the rest in order

- Test set metricspython 01_load_merge_data.py

- 5-fold cross-validationpython 02_explore_visualize.py

- Confusion matricespython 03_preprocess_data.py

- Output: `outputs/05_evaluation_report.json`python 04_train_models.py

python 05_evaluate_tune.py

### Step 6: Comparepython 05_evaluate_tune.py

- Side-by-side comparison

- Stability analysis (test vs CV)# Step 6: Compare

- Error breakdownpython 06_compare_models.py

- Output: `outputs/06_model_comparison.json`

# Step 7: Deploy

### Step 7: Deploypython 07_save_model.py

- Copies best model to `models/` directory```

- Generates metadata

- Creates deployment guide### Run All Steps (Automated)

- Output: `models/gradient_boosting_pipeline_*.pkl`

```bash

## Outputscd backend/ml_pipeline

python run_pipeline.py  # Runs all 7 steps sequentially

All outputs in `backend/ml_pipeline/outputs/`:```



### Data Files---

- `00_gee_extracted_features.csv` - Fresh satellite data

- `01_merged_dataset.csv` - Combined dataset## OUTPUTS

- `02_correlation_matrix.csv` - Feature correlations

- `03_preprocessed_data.csv` - Scaled featuresEach step produces verifiable outputs:



### Models| Step | Output Files | Purpose |

- `04_trained_models/random_forest.pkl`|------|-------------|---------|

- `04_trained_models/gradient_boosting.pkl`| 1 | `01_merged_dataset.csv`<br>`01_metadata.json` | Verified dataset |

- `04_trained_models/tcn_model.pt`| 2 | `02_analysis_report.json`<br>`02_correlation_matrix.csv` | Statistical insights |

| 3 | `03_preprocessed_data.csv`<br>`03_feature_scaler.pkl`<br>`03_preprocessing_config.json` | ML-ready data |

### Reports| 4 | `04_trained_models/*.pkl`<br>`04_training_log.json`<br>`04_test_data.npz` | Trained models |

- `02_analysis_report.json` - Statistical summary| 5 | `05_evaluation_report.json` | Performance metrics |

- `05_evaluation_report.json` - Performance metrics| 6 | `06_model_comparison.json`<br>`06_comparison_table.csv` | Model comparison |

- `06_model_comparison.json` - Model comparison| 7 | `models/*_pipeline_*.pkl`<br>`DEPLOYMENT_GUIDE_*.md` | Production model |



### Visualizations---

- `visualizations/class_distribution.png`

- `visualizations/feature_distributions.png`## PRODUCTION STANDARDS

- `visualizations/correlation_heatmap.png`

- `visualizations/confusion_matrices.png`### Real Data Only

- `visualizations/roc_curves.png`- No synthetic/mock data

- Verified sources (GEE, CHIRPS, SRTM)

## Requirements- Documented time ranges



### Environment### Reproducibility

```bash- Fixed random seeds (42)

# Database- Saved configurations

SQLite (development)- Documented transformations

PostgreSQL (production)

### Quality Gates

# Python packages- ≥86% accuracy required

pandas>=2.2.3- Full metrics (accuracy, precision, recall, F1, ROC-AUC)

scikit-learn>=1.7.2- Confusion matrix analysis

torch>=2.5.1- Cross-validation (5-fold)

joblib>=1.3.2

matplotlib>=3.9.2### No Duplication

seaborn>=0.13.2- Single-purpose files

```- No repeated logic

- Clear data flow

### Google Earth Engine

```bash### Verifiable Outputs

# Authentication (one-time)- JSON metadata for each step

earthengine authenticate- CSV exports for inspection

- Saved models with versioning

# Service account (production)

# Place gee-service-account.json in ee-fastapi/---

```

## DATA FLOW

## Configuration

```

Edit `run_pipeline.py` for custom settings:aggregated_flood_events.csv (126 samples, 2014-2024)

    ↓

```python[01] Load & Verify

# Model parameters    ↓

RF_N_ESTIMATORS = 20001_merged_dataset.csv (126 × 21 features)

GB_N_ESTIMATORS = 150    ↓

[02] Explore & Analyze

# Data split    ↓

TEST_SIZE = 0.2502_analysis_report.json (statistical summary)

RANDOM_STATE = 42    ↓

[03] Preprocess & Scale

# Performance threshold    ↓

MIN_ACCURACY = 0.8603_preprocessed_data.csv (126 × 24 features, scaled)

```    ↓

[04] Train Models (RF, GB)

## Retraining Schedule    ↓

04_trained_models/ (2 models, test set saved)

- **Quarterly**: Every 3 months with new observations    ↓

- **Event-triggered**: After major floods (5+ new samples)[05] Evaluate (Test + CV)

- **Performance-triggered**: If accuracy drops below 86%    ↓

05_evaluation_report.json (full metrics)

## Troubleshooting    ↓

[06] Compare Models

### GEE Authentication Error    ↓

```bash06_model_comparison.json (side-by-side)

# Re-authenticate    ↓

earthengine authenticate[07] Save Highest Performing Model

```    ↓

models/*_pipeline_*.pkl (production model)

### Database Connection Error```

```bash

# Check DATABASE_URL in backend/.env---

# SQLite: sqlite:///./flood_prediction.db

# PostgreSQL: postgresql://user:pass@host:port/db## QUALITY CHECKS

```

Each step validates:

### Model Performance Below Threshold

- Check data quality (missing values, outliers)1. **Load**: All columns present, no duplicates, date ranges valid

- Verify class balance (should be 60-70% flood class)2. **Explore**: Feature distributions, correlations, class balance

- Review feature distributions in Step 2 outputs3. **Preprocess**: Missing values handled, scaling applied, encoding correct

- Consider adjusting SMOTE parameters4. **Train**: Models trained successfully, test data saved

5. **Evaluate**: ≥86% accuracy, confusion matrix, CV scores

### Memory Error6. **Compare**: Side-by-side metrics, stability analysis

- Reduce batch size in TCN training7. **Save**: Metadata complete, deployment guide generated

- Use fewer features (remove low-importance ones)

- Increase system RAM or use cloud instance---



## Author## TROUBLESHOOTING



John Akech  ### Issue: Step fails with "Run X first"

BSc. Software Engineering  **Solution**: Steps must run sequentially (01 → 07)

November 2025

### Issue: ≥86% accuracy not met
**Solution**: 
- Check data quality (Step 2)
- Try different hyperparameters (Step 4)
- Add more features (Step 3)
- Collect more training data

### Issue: High correlation warning
**Solution**: Feature selection in Step 3 (remove redundant features)

### Issue: Class imbalance warning
**Solution**: SMOTE already applied in Step 4, consider collecting more minority class samples

---

## MODEL ARCHITECTURE

### Primary Models (Always Trained)
1. **Random Forest** - Classical ML baseline with high interpretability
2. **TCN** (Temporal Convolutional Network) - Deep learning for time series patterns

### Optional Models (Configurable)
3. **LSTM** - Recurrent network for long-term forecasting
4. **Gradient Boosting** - Alternative ensemble method

📖 **See [MODEL_ARCHITECTURE.md](./MODEL_ARCHITECTURE.md) for detailed model documentation**

### Configuration

To train only PRIMARY models (faster, production):
```python
# In 04_train_models.py
TRAIN_OPTIONAL_MODELS = False
```

To train ALL models (research, comparison):
```python
# In 04_train_models.py
TRAIN_OPTIONAL_MODELS = True
```

---

## CUSTOMIZATION

### Add New Model

Edit `04_train_models.py`:

```python
# For scikit-learn models
from sklearn.ensemble import YourModel

your_model = YourModel(param1=value1, ...)
your_model.fit(X_train_balanced, y_train_balanced)
models['your_model'] = your_model

# For PyTorch models (like TCN/LSTM)
class YourModel(nn.Module):
    def __init__(self, input_dim):
        super().__init__()
        self.layers = nn.Sequential(...)
    
    def forward(self, x):
        return self.layers(x)
```

### Change Hyperparameters

Edit `04_train_models.py`:

```python
# Random Forest
rf_params = {
    'n_estimators': 300,  # Increase trees
    'max_depth': 15,      # Deeper trees
    # ...
}

# TCN
tcn_params = {
    'num_channels': [128, 64, 32],  # Larger network
    'epochs': 100,                   # More training
    # ...
}
```

### Modify Features

Edit `03_preprocess_data.py`:

```python
# Add feature engineering
df['new_feature'] = df['feature1'] / df['feature2']
```

---

## MAINTENANCE

### Retraining Schedule
- **Quarterly**: Recommended for production
- **After major floods**: Update with new event data
- **When accuracy drops**: Monitor production metrics

### Version Control
All models saved with timestamps:
- `random_forest_pipeline_20251109_143052.pkl`
- Rollback capability maintained

### Monitoring
Track in production:
- Prediction accuracy vs ground truth
- Feature distribution drift
- Model confidence scores

---

## REQUIREMENTS

```
# Core ML Libraries
pandas>=2.0.0
numpy>=1.24.0
scikit-learn==1.5.2
imbalanced-learn>=0.11.0
joblib>=1.3.0

# Deep Learning (for TCN and LSTM)
torch>=2.0.0
torchvision>=0.15.0

# Database
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.0  # For PostgreSQL production
```

**Note**: PyTorch is optional. If not installed, only Random Forest and Gradient Boosting will be trained.

Install:
```bash
pip install -r requirements.txt
```

---

## DOCUMENTATION

- `PRODUCTION_AUDIT_REPORT.md` - System audit
- `MODEL_PRODUCTION_REPORT.md` - Model validation
- `OVERFITTING_INVESTIGATION.md` - Data integrity
- `DEPLOYMENT_GUIDE_*.md` - Generated per training

---

**Created**: November 9, 2025  
**Version**: 1.0.0  
**Compliance**: Production Standards
