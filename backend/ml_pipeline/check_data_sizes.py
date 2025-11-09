"""Quick script to check sizes of all available data files."""
import pandas as pd
from pathlib import Path

data_dir = Path(__file__).parent.parent.parent / "data"

# Files to check
files = [
    "original_gee_data_2019_2024/flood_training_data_2019_2024.csv",
    "original_gee_data_2019_2024/flood_test_data_2019_2024.csv",
    "original_gee_data_2019_2024/flood_validation_data_2019_2024.csv",
    "model_ready_flood_data.csv",
    "processed_flood_data_combined.csv",
    "south_sudan_flood_combined_data.csv",
    "time_series_data/aggregated_flood_events.csv"  # Currently used
]

print("=" * 80)
print("AVAILABLE DATA FILES")
print("=" * 80)

total_rows = 0
for file in files:
    filepath = data_dir / file
    if filepath.exists():
        try:
            df = pd.read_csv(filepath)
            rows = len(df)
            cols = len(df.columns)
            total_rows += rows
            
            status = "✓ CURRENTLY USED" if "aggregated" in file else "✗ NOT USED"
            print(f"\n{file.split('/')[-1]}")
            print(f"  Rows: {rows:,} | Columns: {cols} | {status}")
            
            # Show first few column names
            if cols > 0:
                print(f"  Columns: {', '.join(df.columns[:5].tolist())}")
                if 'flood' in df.columns or 'Flood' in df.columns:
                    flood_col = 'flood' if 'flood' in df.columns else 'Flood'
                    floods = df[flood_col].sum()
                    print(f"  Floods: {floods} ({floods/len(df)*100:.1f}%)")
                    
        except Exception as e:
            print(f"\n{file}: ERROR - {e}")
    else:
        print(f"\n{file}: FILE NOT FOUND")

print("\n" + "=" * 80)
print(f"CURRENT: Using only aggregated_flood_events.csv = 126 rows")
print(f"AVAILABLE: Total across all files = {total_rows:,} rows")
print(f"POTENTIAL GAIN: {total_rows - 126:,} additional rows ({(total_rows/126)*100:.1f}% increase)")
print("=" * 80)
