"""
ML Pipeline Runner
==================
Executes all 8 steps sequentially with error handling:
  Step 0: Extract data from Google Earth Engine
  Steps 1-7: Train models and deploy to production

Automated workflow from data extraction to deployment.
"""

import subprocess
import sys
from pathlib import Path
from datetime import datetime

PIPELINE_DIR = Path(__file__).parent

scripts = [
    "00_extract_gee_data.py",      # GEE data extraction
    "01_load_merge_data.py",
    "02_explore_visualize.py",
    "03_preprocess_data.py",
    "04_train_models.py",
    "05_evaluate_tune.py",
    "06_compare_models.py",
    "07_save_model.py"
]

print("=" * 80)
print("ML Pipeline - Automated Workflow")
print("=" * 80)
print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Steps: {len(scripts)}")
print("Flow: GEE Extraction → Training → Deployment")
print("=" * 80)

for i, script in enumerate(scripts, 1):
    print(f"\n{'=' * 80}")
    print(f"RUNNING STEP {i}/{len(scripts)}: {script}")
    print(f"{'=' * 80}\n")
    
    script_path = PIPELINE_DIR / script
    
    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            cwd=PIPELINE_DIR,
            capture_output=False,
            check=True
        )
        
        print(f"\nStep {i} completed successfully")
        
    except subprocess.CalledProcessError as e:
        print(f"\nERROR in step {i}: {script}")
        print(f"Exit code: {e.returncode}")
        print("Pipeline stopped.")
        sys.exit(1)
    except Exception as e:
        print(f"\nERROR in step {i}: {e}")
        print("Pipeline stopped.")
        sys.exit(1)

print("\n" + "=" * 80)
print("Pipeline Complete")
print("=" * 80)
print("All 8 steps executed successfully")
print("Satellite data extracted from GEE")
print("Models trained on latest observations")
print("Production model deployed to models/")
print("=" * 80)

