"""
STEP 6: COMPARE MODELS
=======================
Purpose: Compare model performance and select the best
Output: 06_model_comparison.json, 06_comparison_table.csv

PRODUCTION STANDARDS:
- Side-by-side comparison of all metrics
- Trade-off analysis (accuracy vs inference time)
- Production readiness assessment
- Final model recommendation with evidence
"""

import pandas as pd
from pathlib import Path
from datetime import datetime
import json

# Configuration
PIPELINE_DIR = Path(__file__).parent
OUTPUT_DIR = PIPELINE_DIR / "outputs"
MODELS_DIR = OUTPUT_DIR / "04_trained_models"

print("=" * 80)
print("STEP 6: COMPARE MODELS")
print("=" * 80)
print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 80)

# ============================================================================
# 1. LOAD EVALUATION RESULTS
# ============================================================================
print("\n[1/3] LOADING EVALUATION RESULTS...")

eval_path = OUTPUT_DIR / "05_evaluation_report.json"
if not eval_path.exists():
  print(" ERROR: Run 05_evaluate_tune.py first")
  exit(1)

with open(eval_path, "r") as f:
  evaluation = json.load(f)

models_results = evaluation['models']
print(f" Loaded: {eval_path.name}")
print(f"  Models: {len(models_results)}")

# ============================================================================
# 2. BUILD COMPARISON TABLE
# ============================================================================
print("\n[2/3] BUILDING COMPARISON TABLE...")

comparison_data = []

for model_name, results in models_results.items():
  test_metrics = results['test_metrics']
  cv = results['cross_validation']
  cm = results['confusion_matrix']
  
  comparison_data.append({
    'Model': model_name.replace('_', ' ').title(),
    'Test_Accuracy': test_metrics['accuracy'],
    'CV_Accuracy': cv['mean_accuracy'],
    'CV_Std': cv['std_accuracy'],
    'Precision': test_metrics['precision'],
    'Recall': test_metrics['recall'],
    'F1_Score': test_metrics['f1_score'],
    'ROC_AUC': test_metrics['roc_auc'],
    'True_Negatives': cm['tn'],
    'False_Positives': cm['fp'],
    'False_Negatives': cm['fn'],
    'True_Positives': cm['tp'],
    'False_Alarm_Rate': cm['fp'] / (cm['fp'] + cm['tn']) if (cm['fp'] + cm['tn']) > 0 else 0,
    'Miss_Rate': cm['fn'] / (cm['fn'] + cm['tp']) if (cm['fn'] + cm['tp']) > 0 else 0,
    'Passes_86': ' Yes' if results['passes_86'] else ' No'
  })

df_comparison = pd.DataFrame(comparison_data)

# Display comparison
print("\n" + "=" * 80)
print("MODEL COMPARISON TABLE")
print("=" * 80)
print(df_comparison.to_string(index=False))
print("=" * 80)

# ============================================================================
# 3. ANALYZE AND RECOMMEND
# ============================================================================
print("\n[3/3] ANALYZING AND RECOMMENDING...")

# Find best models for different criteria
best_accuracy = df_comparison.loc[df_comparison['Test_Accuracy'].idxmax()]
best_recall = df_comparison.loc[df_comparison['Recall'].idxmax()]
best_precision = df_comparison.loc[df_comparison['Precision'].idxmax()]
best_f1 = df_comparison.loc[df_comparison['F1_Score'].idxmax()]

print("\n BEST MODELS BY CRITERION:")
print(f"  Best Accuracy: {best_accuracy['Model']} ({best_accuracy['Test_Accuracy']:.2%})")
print(f"  Best Recall:  {best_recall['Model']} ({best_recall['Recall']:.2%})")
print(f"  Best Precision: {best_precision['Model']} ({best_precision['Precision']:.2%})")
print(f"  Best F1-Score: {best_f1['Model']} ({best_f1['F1_Score']:.2%})")

# Stability analysis (CV vs Test)
print("\nSTABILITY ANALYSIS (Test vs CV):")
for _, row in df_comparison.iterrows():
  test_acc = row['Test_Accuracy']
  cv_acc = row['CV_Accuracy']
  gap = abs(test_acc - cv_acc)
  stability = "Stable" if gap < 0.05 else "Unstable"
  print(f"  {row['Model']:20s}: Test={test_acc:.2%}, CV={cv_acc:.2%}, Gap={gap:.2%} ({stability})")

# Error analysis
print("\n ERROR ANALYSIS:")
for _, row in df_comparison.iterrows():
  print(f"  {row['Model']:20s}:")
  print(f"   False Alarms: {row['False_Positives']} ({row['False_Alarm_Rate']:.1%})")
  print(f"   Missed Floods: {row['False_Negatives']} ({row['Miss_Rate']:.1%})")

# Final recommendation
production_ready = df_comparison[df_comparison['Passes_86'] == ' Yes']

if len(production_ready) > 0:
  # Choose model with highest accuracy among production-ready models
  recommended = production_ready.loc[production_ready['Test_Accuracy'].idxmax()]
  
  print("\n" + "=" * 80)
  print("FINAL RECOMMENDATION")
  print("=" * 80)
  print(f"Model: {recommended['Model']}")
  print(f"Test Accuracy: {recommended['Test_Accuracy']:.2%}")
  print(f"CV Accuracy: {recommended['CV_Accuracy']:.2%} ± {recommended['CV_Std']:.2%}")
  print(f"Precision: {recommended['Precision']:.2%}")
  print(f"Recall: {recommended['Recall']:.2%}")
  print(f"F1-Score: {recommended['F1_Score']:.2%}")
  print(f"ROC-AUC: {recommended['ROC_AUC']:.4f}")
  print("\nProduction Ready: YES (exceeds 86% requirement)")
  print("=" * 80)
  
  recommendation_status = "production_ready"
  recommendation_reason = f"Highest accuracy ({recommended['Test_Accuracy']:.2%}) among production-ready models"
else:
  print("\n" + "=" * 80)
  print(" WARNING: NO PRODUCTION-READY MODELS")
  print("=" * 80)
  print("None of the models meet the 86% accuracy threshold.")
  print("Recommendation: Retrain with more data or different features.")
  print("=" * 80)
  
  recommended = df_comparison.loc[df_comparison['Test_Accuracy'].idxmax()]
  recommendation_status = "not_ready"
  recommendation_reason = f"Best model ({recommended['Model']}) only achieved {recommended['Test_Accuracy']:.2%}"

# Save comparison report
comparison_report = {
  "step": "06_compare_models",
  "created_at": datetime.now().isoformat(),
  "models_compared": len(df_comparison),
  "comparison_table": df_comparison.to_dict('records'),
  "best_by_criterion": {
    "accuracy": {
      "model": best_accuracy['Model'],
      "value": float(best_accuracy['Test_Accuracy'])
    },
    "recall": {
      "model": best_recall['Model'],
      "value": float(best_recall['Recall'])
    },
    "precision": {
      "model": best_precision['Model'],
      "value": float(best_precision['Precision'])
    },
    "f1_score": {
      "model": best_f1['Model'],
      "value": float(best_f1['F1_Score'])
    }
  },
  "final_recommendation": {
    "model": recommended['Model'],
    "status": recommendation_status,
    "reason": recommendation_reason,
    "test_accuracy": float(recommended['Test_Accuracy']),
    "cv_accuracy": float(recommended['CV_Accuracy']),
    "production_ready": recommendation_status == "production_ready"
  }
}

# Save comparison report
report_path = OUTPUT_DIR / "06_model_comparison.json"
with open(report_path, "w") as f:
  json.dump(comparison_report, f, indent=2)
print(f"\n Saved: {report_path}")

# Save comparison table CSV
table_path = OUTPUT_DIR / "06_comparison_table.csv"
df_comparison.to_csv(table_path, index=False)
print(f" Saved: {table_path}")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("STEP 6 COMPLETE")
print("=" * 80)
print(f" Models compared: {len(df_comparison)}")
print(f" Recommended model: {recommended['Model']}")
print(f" Production ready: {' YES' if recommendation_status == 'production_ready' else ' NO'}")
print("\nNext step: Run 07_save_model.py")
print("=" * 80)
