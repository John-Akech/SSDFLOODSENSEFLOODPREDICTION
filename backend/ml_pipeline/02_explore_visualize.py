"""
Step 2: Explore and Visualize Data

This script performs comprehensive exploratory data analysis (EDA) and creates
visualizations to understand the flood prediction dataset. These visuals help
us see patterns, identify important features, and spot any data quality issues.

What it creates:
- Distribution plots for all features
- Correlation heatmaps
- Flood vs non-flood comparisons
- Feature importance indicators
- Statistical summary report

These visualizations are crucial for understanding WHY the model makes predictions
and for presenting findings to stakeholders (or judges!).
"""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import json
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

# Set plotting style for professional-looking charts
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 8)
plt.rcParams['font.size'] = 10

# Configuration
PIPELINE_DIR = Path(__file__).parent
OUTPUT_DIR = PIPELINE_DIR / "outputs"
VIZ_DIR = OUTPUT_DIR / "visualizations"
VIZ_DIR.mkdir(exist_ok=True)

print("=" * 80)
print("STEP 2: EXPLORE AND VISUALIZE")
print("=" * 80)
print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 80)

# ============================================================================
# 1. LOAD MERGED DATASET
# ============================================================================
print("\n[1/5] LOADING MERGED DATASET...")

data_path = OUTPUT_DIR / "01_merged_dataset.csv"
if not data_path.exists():
  print(f" ERROR: Run 01_load_merge_data.py first")
  exit(1)

df = pd.read_csv(data_path)
print(f" Loaded: {data_path.name}")
print(f"  Samples: {len(df)}")

# ============================================================================
# 2. STATISTICAL SUMMARY
# ============================================================================
print("\n[2/5] STATISTICAL SUMMARY...")

# Identify numeric columns
numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
target_col = 'is_flood_event'

# Remove target from features
feature_cols = [col for col in numeric_cols if col not in [target_col, 'event_id']]

print(f"  Analyzing {len(feature_cols)} numeric features")

# Calculate statistics
stats_summary = {}
for col in feature_cols:
  data = df[col].dropna()
  stats_summary[col] = {
    "mean": float(data.mean()),
    "std": float(data.std()),
    "min": float(data.min()),
    "q25": float(data.quantile(0.25)),
    "median": float(data.median()),
    "q75": float(data.quantile(0.75)),
    "max": float(data.max()),
    "missing": int(df[col].isnull().sum()),
    "missing_pct": float(df[col].isnull().sum() / len(df) * 100)
  }

print(" Statistical summary computed")

# Feature ranges
print("\n  Feature Ranges (mean ± std):")
for col in feature_cols[:10]: # Show first 10
  mean = stats_summary[col]['mean']
  std = stats_summary[col]['std']
  print(f"  - {col:30s}: {mean:8.2f} ± {std:6.2f}")
if len(feature_cols) > 10:
  print(f"  ... and {len(feature_cols) - 10} more features")

# ============================================================================
# 3. DISTRIBUTION ANALYSIS
# ============================================================================
print("\n[3/5] DISTRIBUTION ANALYSIS...")

distribution_stats = {}

# Analyze flood vs non-flood distributions
flood_samples = df[df[target_col] == 1]
non_flood_samples = df[df[target_col] == 0]

print(f"  Flood samples: {len(flood_samples)}")
print(f"  Non-flood samples: {len(non_flood_samples)}")

for col in feature_cols:
  flood_data = flood_samples[col].dropna()
  non_flood_data = non_flood_samples[col].dropna()
  
  distribution_stats[col] = {
    "flood_mean": float(flood_data.mean()) if len(flood_data) > 0 else None,
    "non_flood_mean": float(non_flood_data.mean()) if len(non_flood_data) > 0 else None,
    "mean_difference": float(flood_data.mean() - non_flood_data.mean()) if len(flood_data) > 0 and len(non_flood_data) > 0 else None,
    "separation_score": float(abs(flood_data.mean() - non_flood_data.mean()) / (flood_data.std() + non_flood_data.std() + 1e-10)) if len(flood_data) > 0 and len(non_flood_data) > 0 else 0
  }

# Find most discriminative features
discriminative_features = sorted(
  distribution_stats.items(),
  key=lambda x: abs(x[1]['separation_score']) if x[1]['separation_score'] is not None else 0,
  reverse=True
)[:10]

print("\n  Top 10 Most Discriminative Features:")
for i, (col, stats) in enumerate(discriminative_features, 1):
  sep_score = stats['separation_score']
  flood_mean = stats['flood_mean']
  non_flood_mean = stats['non_flood_mean']
  print(f"  {i:2d}. {col:30s}: sep={sep_score:6.3f} (flood={flood_mean:7.2f}, non={non_flood_mean:7.2f})")

print(" Distribution analysis complete")

# ============================================================================
# 4. CORRELATION ANALYSIS
# ============================================================================
print("\n[4/5] CORRELATION ANALYSIS...")

# Calculate correlation with target
correlations = {}
for col in feature_cols:
  if df[col].isnull().sum() == 0:
    corr = df[col].corr(df[target_col])
    correlations[col] = float(corr)

# Sort by absolute correlation
sorted_correlations = sorted(
  correlations.items(),
  key=lambda x: abs(x[1]),
  reverse=True
)

print("\n  Top 10 Features Correlated with Flood Events:")
for i, (col, corr) in enumerate(sorted_correlations[:10], 1):
  direction = "positive" if corr > 0 else "negative"
  print(f"  {i:2d}. {col:30s}: {corr:7.4f} ({direction})")

# Feature intercorrelations
numeric_df = df[feature_cols].dropna()
corr_matrix = numeric_df.corr()

# Find highly correlated pairs (potential redundancy)
high_corr_pairs = []
for i in range(len(corr_matrix.columns)):
  for j in range(i+1, len(corr_matrix.columns)):
    if abs(corr_matrix.iloc[i, j]) > 0.8:
      high_corr_pairs.append({
        "feature1": corr_matrix.columns[i],
        "feature2": corr_matrix.columns[j],
        "correlation": float(corr_matrix.iloc[i, j])
      })

print(f"\n  Highly correlated feature pairs (|r| > 0.8): {len(high_corr_pairs)}")
if high_corr_pairs:
  for pair in high_corr_pairs[:5]:
    print(f"  - {pair['feature1']} <-> {pair['feature2']}: {pair['correlation']:.3f}")
  if len(high_corr_pairs) > 5:
    print(f"  ... and {len(high_corr_pairs) - 5} more pairs")

print(" Correlation analysis complete")

# ============================================================================
# 4. CREATE VISUALIZATIONS
# ============================================================================
print("\n[4/6] CREATING VISUALIZATIONS...")
print("   This helps us understand the data visually...")

viz_count = 0

# Visualization 1: Class Distribution (Flood vs Non-Flood)
print("   Creating class distribution plot...")
plt.figure(figsize=(10, 6))
class_counts = df[target_col].value_counts()
colors = ['#e74c3c', '#3498db']  # Red for flood, Blue for non-flood
plt.bar(['Non-Flood', 'Flood'], 
        [class_counts[0], class_counts[1]], 
        color=colors, alpha=0.7, edgecolor='black')
plt.title('Distribution of Flood Events in Dataset', fontsize=14, fontweight='bold')
plt.ylabel('Number of Samples', fontsize=12)
plt.xlabel('Class', fontsize=12)
# Add count labels on bars
for i, v in enumerate([class_counts[0], class_counts[1]]):
    plt.text(i, v + 2, str(v), ha='center', va='bottom', fontweight='bold')
# Add percentage
total = len(df)
plt.text(0, class_counts[0]/2, f'{class_counts[0]/total*100:.1f}%', 
         ha='center', fontsize=11, color='white', fontweight='bold')
plt.text(1, class_counts[1]/2, f'{class_counts[1]/total*100:.1f}%', 
         ha='center', fontsize=11, color='white', fontweight='bold')
plt.grid(axis='y', alpha=0.3)
plt.tight_layout()
plt.savefig(VIZ_DIR / '01_class_distribution.png', dpi=300, bbox_inches='tight')
plt.close()
viz_count += 1

# Visualization 2: Feature Distributions (Top 6 discriminative features)
print("   Creating feature distribution plots...")
fig, axes = plt.subplots(2, 3, figsize=(15, 10))
fig.suptitle('Feature Distributions: Flood vs Non-Flood', fontsize=16, fontweight='bold')
for idx, (col, _) in enumerate(discriminative_features[:6]):
    ax = axes[idx // 3, idx % 3]
    # Histogram for flood and non-flood
    flood_data = flood_samples[col].dropna()
    non_flood_data = non_flood_samples[col].dropna()
    
    ax.hist(non_flood_data, bins=20, alpha=0.6, label='Non-Flood', color='#3498db', edgecolor='black')
    ax.hist(flood_data, bins=20, alpha=0.6, label='Flood', color='#e74c3c', edgecolor='black')
    ax.set_xlabel(col, fontsize=10)
    ax.set_ylabel('Frequency', fontsize=10)
    ax.legend()
    ax.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(VIZ_DIR / '02_feature_distributions.png', dpi=300, bbox_inches='tight')
plt.close()
viz_count += 1

# Visualization 3: Correlation Heatmap (Top 15 features)
print("   Creating correlation heatmap...")
plt.figure(figsize=(14, 12))
top_15_features = [col for col, _ in sorted_correlations[:15]]
corr_subset = df[top_15_features + [target_col]].corr()
# Create mask for upper triangle
mask = np.triu(np.ones_like(corr_subset, dtype=bool), k=1)
sns.heatmap(corr_subset, mask=mask, annot=True, fmt='.2f', cmap='RdBu_r', 
            center=0, square=True, linewidths=1, cbar_kws={"shrink": 0.8},
            vmin=-1, vmax=1)
plt.title('Feature Correlation Matrix (Top 15 Features)', fontsize=14, fontweight='bold', pad=20)
plt.xticks(rotation=45, ha='right')
plt.yticks(rotation=0)
plt.tight_layout()
plt.savefig(VIZ_DIR / '03_correlation_heatmap.png', dpi=300, bbox_inches='tight')
plt.close()
viz_count += 1

# Visualization 4: Feature Importance (Correlation with Target)
print("   Creating feature importance plot...")
plt.figure(figsize=(12, 8))
top_10_features = [col for col, _ in sorted_correlations[:10]]
top_10_corrs = [corr for _, corr in sorted_correlations[:10]]
colors_fi = ['#e74c3c' if corr > 0 else '#3498db' for corr in top_10_corrs]
plt.barh(top_10_features, top_10_corrs, color=colors_fi, alpha=0.7, edgecolor='black')
plt.xlabel('Correlation with Flood Events', fontsize=12)
plt.title('Top 10 Features Correlated with Flooding', fontsize=14, fontweight='bold')
plt.axvline(x=0, color='black', linestyle='--', linewidth=1)
plt.grid(axis='x', alpha=0.3)
# Add correlation values
for i, (feat, corr) in enumerate(zip(top_10_features, top_10_corrs)):
    plt.text(corr + 0.01 if corr > 0 else corr - 0.01, i, f'{corr:.3f}', 
             va='center', ha='left' if corr > 0 else 'right', fontsize=9)
plt.tight_layout()
plt.savefig(VIZ_DIR / '04_feature_importance.png', dpi=300, bbox_inches='tight')
plt.close()
viz_count += 1

# Visualization 5: Box Plots (Top 6 features)
print("   Creating box plots for feature comparison...")
fig, axes = plt.subplots(2, 3, figsize=(15, 10))
fig.suptitle('Feature Distributions: Box Plots Comparison', fontsize=16, fontweight='bold')
for idx, (col, _) in enumerate(discriminative_features[:6]):
    ax = axes[idx // 3, idx % 3]
    data_to_plot = [non_flood_samples[col].dropna(), flood_samples[col].dropna()]
    bp = ax.boxplot(data_to_plot, labels=['Non-Flood', 'Flood'], patch_artist=True)
    # Color boxes
    bp['boxes'][0].set_facecolor('#3498db')
    bp['boxes'][1].set_facecolor('#e74c3c')
    for box in bp['boxes']:
        box.set_alpha(0.6)
    ax.set_ylabel(col, fontsize=10)
    ax.grid(alpha=0.3, axis='y')
plt.tight_layout()
plt.savefig(VIZ_DIR / '05_box_plots.png', dpi=300, bbox_inches='tight')
plt.close()
viz_count += 1

# Visualization 6: Scatter Plot Matrix (Top 4 features)
print("   Creating scatter plot matrix...")
# Filter out features with constant values (like VV_max, VH_max which are all 0)
valid_features = []
for col, _ in discriminative_features[:10]:
    if df[col].std() > 0 and not df[col].isnull().any():  # Only features with variation
        valid_features.append(col)
    if len(valid_features) == 4:
        break

if len(valid_features) >= 2:  # Need at least 2 features for scatter matrix
    scatter_df = df[valid_features + [target_col]].copy()
    scatter_df['Class'] = scatter_df[target_col].map({0: 'Non-Flood', 1: 'Flood'})
    g = sns.pairplot(scatter_df, hue='Class', palette={'Non-Flood': '#3498db', 'Flood': '#e74c3c'},
                     diag_kind='kde', plot_kws={'alpha': 0.6}, corner=False, height=3)
    g.fig.suptitle('Scatter Plot Matrix: Top Discriminative Features', 
                   fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    plt.savefig(VIZ_DIR / '06_scatter_matrix.png', dpi=300, bbox_inches='tight')
    plt.close()
    viz_count += 1
else:
    print("   ⚠ Skipping scatter matrix - not enough valid features")
    # Create a simple message instead
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.text(0.5, 0.5, 'Scatter Matrix\n(Skipped - insufficient variable features)',
            ha='center', va='center', fontsize=16, transform=ax.transAxes)
    ax.axis('off')
    plt.savefig(VIZ_DIR / '06_scatter_matrix.png', dpi=300, bbox_inches='tight')
    plt.close()
    viz_count += 1

# Visualization 7: Statistical Summary (Visual Table)
print("   Creating statistical summary visualization...")
fig, ax = plt.subplots(figsize=(14, 10))
ax.axis('tight')
ax.axis('off')
# Create table data for top 10 features
table_data = []
table_data.append(['Feature', 'Mean', 'Std', 'Min', 'Max', 'Flood Mean', 'Non-Flood Mean', 'Separation'])
for col, _ in discriminative_features[:10]:
    stats = stats_summary[col]
    dist_stats = distribution_stats[col]
    table_data.append([
        col[:20],  # Truncate long names
        f"{stats['mean']:.2f}",
        f"{stats['std']:.2f}",
        f"{stats['min']:.2f}",
        f"{stats['max']:.2f}",
        f"{dist_stats['flood_mean']:.2f}" if dist_stats['flood_mean'] else 'N/A',
        f"{dist_stats['non_flood_mean']:.2f}" if dist_stats['non_flood_mean'] else 'N/A',
        f"{dist_stats['separation_score']:.3f}"
    ])
table = ax.table(cellText=table_data, cellLoc='center', loc='center',
                colWidths=[0.25, 0.1, 0.1, 0.1, 0.1, 0.12, 0.12, 0.11])
table.auto_set_font_size(False)
table.set_fontsize(9)
table.scale(1, 2)
# Style header row
for i in range(len(table_data[0])):
    table[(0, i)].set_facecolor('#2c3e50')
    table[(0, i)].set_text_props(weight='bold', color='white')
# Alternate row colors
for i in range(1, len(table_data)):
    for j in range(len(table_data[0])):
        if i % 2 == 0:
            table[(i, j)].set_facecolor('#ecf0f1')
plt.title('Statistical Summary: Top 10 Discriminative Features', 
          fontsize=14, fontweight='bold', pad=20)
plt.tight_layout()
plt.savefig(VIZ_DIR / '07_statistical_summary.png', dpi=300, bbox_inches='tight')
plt.close()
viz_count += 1

# Visualization 8: Missing Data Analysis
print("   Creating missing data visualization...")
plt.figure(figsize=(12, 6))
missing_data = df[feature_cols].isnull().sum()
missing_pct = (missing_data / len(df) * 100).sort_values(ascending=False)
if missing_pct.max() > 0:
    missing_pct_display = missing_pct[missing_pct > 0]
    plt.bar(range(len(missing_pct_display)), missing_pct_display.values, 
            color='#e74c3c', alpha=0.7, edgecolor='black')
    plt.xticks(range(len(missing_pct_display)), missing_pct_display.index, rotation=45, ha='right')
    plt.ylabel('Missing Data (%)', fontsize=12)
    plt.title('Missing Data Analysis', fontsize=14, fontweight='bold')
    plt.grid(axis='y', alpha=0.3)
else:
    plt.text(0.5, 0.5, 'No Missing Data Found!\n✓ Dataset is Complete', 
             ha='center', va='center', fontsize=20, fontweight='bold', color='#27ae60')
    plt.title('Missing Data Analysis', fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig(VIZ_DIR / '08_missing_data.png', dpi=300, bbox_inches='tight')
plt.close()
viz_count += 1

print(f"   ✓ Created {viz_count} visualizations in {VIZ_DIR}/")

# ============================================================================
# 5. SAVE ANALYSIS REPORT
# ============================================================================
print("\n[5/6] SAVING ANALYSIS REPORT...")

# Compile report
report = {
  "step": "02_explore_visualize",
  "created_at": datetime.now().isoformat(),
  "dataset": {
    "total_samples": int(len(df)),
    "flood_samples": int(len(flood_samples)),
    "non_flood_samples": int(len(non_flood_samples)),
    "features": len(feature_cols)
  },
  "statistical_summary": stats_summary,
  "distribution_analysis": {
    "most_discriminative": [
      {"feature": col, "separation_score": float(stats['separation_score'])}
      for col, stats in discriminative_features
    ]
  },
  "correlation_analysis": {
    "target_correlations": {k: v for k, v in sorted_correlations[:20]},
    "high_corr_pairs": high_corr_pairs,
    "multicollinearity_warning": len(high_corr_pairs) > 0
  },
  "recommendations": {
    "feature_selection": [col for col, _ in discriminative_features[:15]],
    "potential_redundancy": [pair['feature1'] for pair in high_corr_pairs[:5]],
    "requires_scaling": True,
    "class_imbalance": len(flood_samples) / len(df) < 0.4 or len(flood_samples) / len(df) > 0.6
  }
}

# Save report
report_path = OUTPUT_DIR / "02_analysis_report.json"
with open(report_path, "w") as f:
  json.dump(report, f, indent=2)
print(f" Saved: {report_path}")

# Save correlation matrix (top features)
top_features = [col for col, _ in sorted_correlations[:20]]
top_corr_matrix = df[top_features + [target_col]].corr()
corr_matrix_path = OUTPUT_DIR / "02_correlation_matrix.csv"
top_corr_matrix.to_csv(corr_matrix_path)
print(f" Saved: {corr_matrix_path}")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("STEP 2 COMPLETE")
print("=" * 80)
print(f" Statistical summary: {len(feature_cols)} features analyzed")
print(f" Distribution analysis: Top 10 discriminative features identified")
print(f" Correlation analysis: {len(high_corr_pairs)} highly correlated pairs found")
print(f" Visualizations: {viz_count} charts created in {VIZ_DIR.name}/")
print(f" Analysis report saved")
print(f"\nKey Insights:")
print(f"  - Most discriminative feature: {discriminative_features[0][0]}")
print(f"  - Strongest correlation: {sorted_correlations[0][0]} (r={sorted_correlations[0][1]:.3f})")
print(f"  - Class imbalance: {'Yes' if report['recommendations']['class_imbalance'] else 'No'}")
print(f"\nView visualizations in: {VIZ_DIR}/")
print(f"\nNext step: Run 03_preprocess_data.py")
print("=" * 80)
