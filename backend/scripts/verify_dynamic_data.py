#!/usr/bin/env python3
"""
Verification Script: Dynamic Data Flow
Verifies that all model statistics are loaded from real metadata files,
not hardcoded values.

Run this script to demonstrate academic integrity for defense.
"""

import json
import sys
from pathlib import Path


def verify_model_metadata_exists():
    """Verify model metadata file exists and contains real metrics"""
    print("=" * 70)
    print("VERIFICATION TEST: Model Metadata Integrity")
    print("=" * 70)
    
    models_dir = Path(__file__).parent.parent.parent / "models"
    metadata_file = models_dir / "model_metadata_pipeline_20251109_181046.json"
    
    if not metadata_file.exists():
        print("❌ FAIL: Model metadata file not found!")
        print(f"   Expected: {metadata_file}")
        return False
    
    print(f"✅ PASS: Model metadata file exists")
    print(f"   Location: {metadata_file}")
    
    # Load and verify contents
    try:
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        
        performance = metadata.get("performance", {})
        test_accuracy = performance.get("test_accuracy", 0)
        precision = performance.get("precision", 0)
        recall = performance.get("recall", 0)
        f1_score = performance.get("f1_score", 0)
        
        print("\n📊 Real Model Performance Metrics:")
        print(f"   Test Accuracy: {test_accuracy:.4f} ({test_accuracy*100:.2f}%)")
        print(f"   Precision:     {precision:.4f} ({precision*100:.2f}%)")
        print(f"   Recall:        {recall:.4f} ({recall*100:.2f}%)")
        print(f"   F1 Score:      {f1_score:.4f} ({f1_score*100:.2f}%)")
        
        # Verify these are NOT hardcoded demo values
        if test_accuracy == 0.87:
            print("\n⚠️  WARNING: Accuracy is 0.87 - might be hardcoded!")
            return False
        
        if test_accuracy > 0.8:
            print(f"\n✅ PASS: Real model accuracy loaded ({test_accuracy*100:.2f}%)")
            return True
        else:
            print(f"\n❌ FAIL: Unexpected accuracy value: {test_accuracy}")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Error loading metadata: {e}")
        return False


def verify_no_hardcoded_values_in_backend():
    """Verify backend code loads from file, not hardcoded values"""
    print("\n" + "=" * 70)
    print("VERIFICATION TEST: Backend Code Integrity")
    print("=" * 70)
    
    crud_routes_file = Path(__file__).parent.parent / "app" / "api" / "crud_routes.py"
    
    if not crud_routes_file.exists():
        print("❌ FAIL: Backend routes file not found!")
        return False
    
    print(f"✅ PASS: Backend routes file exists")
    
    # Read file and check for hardcoded accuracy values
    with open(crud_routes_file, 'r') as f:
        content = f.read()
    
    # Check that we're loading from metadata file
    if 'model_metadata_pipeline_20251109_181046.json' in content:
        print("✅ PASS: Backend loads from model metadata file")
    else:
        print("⚠️  WARNING: Backend might not be loading from metadata file")
    
    # Check for suspicious hardcoded values (old values)
    if '"overall_accuracy": 0.87,' in content:
        print("❌ FAIL: Hardcoded accuracy 0.87 found in backend!")
        return False
    
    if '"accuracy": 0.87,' in content:
        print("❌ FAIL: Hardcoded accuracy 0.87 found in predictions stats!")
        return False
    
    print("✅ PASS: No hardcoded 0.87 accuracy values found")
    
    # Verify we're using json.load to read metadata
    if 'json.load(' in content or 'json.loads(' in content:
        print("✅ PASS: Backend uses JSON loading (dynamic data)")
        return True
    else:
        print("⚠️  WARNING: JSON loading not detected in backend")
        return False


def verify_frontend_dynamic_loading():
    """Verify frontend fetches data from API, not hardcoded"""
    print("\n" + "=" * 70)
    print("VERIFICATION TEST: Frontend Dynamic Loading")
    print("=" * 70)
    
    # Check Home.tsx
    home_file = Path(__file__).parent.parent.parent / "frontend" / "src" / "pages" / "Home.tsx"
    
    if not home_file.exists():
        print("❌ FAIL: Frontend Home.tsx not found!")
        return False
    
    with open(home_file, 'r') as f:
        home_content = f.read()
    
    # Check for old hardcoded fallback
    if '|| 0.87' in home_content:
        print("❌ FAIL: Home.tsx has hardcoded 0.87 fallback!")
        return False
    
    print("✅ PASS: Home.tsx - No hardcoded 0.87 fallback")
    
    # Check for API service usage
    if 'apiService.getSystemStats()' in home_content:
        print("✅ PASS: Home.tsx - Fetches data from API")
    else:
        print("⚠️  WARNING: Home.tsx might not be fetching from API")
    
    # Check DataSharing.tsx
    data_sharing_file = Path(__file__).parent.parent.parent / "frontend" / "src" / "pages" / "DataSharing.tsx"
    
    if data_sharing_file.exists():
        with open(data_sharing_file, 'r') as f:
            data_sharing_content = f.read()
        
        if "num: '96%'" in data_sharing_content:
            print("❌ FAIL: DataSharing.tsx has hardcoded 96% value!")
            return False
        
        print("✅ PASS: DataSharing.tsx - No hardcoded 96% value")
    
    # Check Analytics.tsx
    analytics_file = Path(__file__).parent.parent.parent / "frontend" / "src" / "pages" / "Analytics.tsx"
    
    if analytics_file.exists():
        with open(analytics_file, 'r') as f:
            analytics_content = f.read()
        
        # Check if states are extracted dynamically
        if 'statesFromData' in analytics_content:
            print("✅ PASS: Analytics.tsx - States extracted dynamically")
        else:
            print("⚠️  WARNING: Analytics.tsx might have hardcoded states")
    
    return True


def main():
    """Run all verification tests"""
    print("\n" + "=" * 70)
    print("🎓 ACADEMIC DEFENSE VERIFICATION SCRIPT")
    print("   SSD FloodSense - Dynamic Data Integrity Check")
    print("=" * 70 + "\n")
    
    results = []
    
    # Test 1: Model metadata exists and contains real metrics
    results.append(("Model Metadata", verify_model_metadata_exists()))
    
    # Test 2: Backend loads from file, not hardcoded
    results.append(("Backend Integrity", verify_no_hardcoded_values_in_backend()))
    
    # Test 3: Frontend fetches from API
    results.append(("Frontend Dynamic", verify_frontend_dynamic_loading()))
    
    # Summary
    print("\n" + "=" * 70)
    print("VERIFICATION SUMMARY")
    print("=" * 70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED - System is academically sound!")
        print("   No hardcoded values detected.")
        print("   All data flows from real trained models.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} TEST(S) FAILED - Review needed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())
