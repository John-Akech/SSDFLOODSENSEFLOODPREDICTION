"""
Unit tests for GEE feature mapping function.

Tests the map_gee_to_model_features() function with:
- Mock GEE API responses
- All 19 feature mappings
- Edge cases (missing data, out of range values)
- Region encoding from coordinates
"""

import pytest
from datetime import datetime, timedelta
from backend.app.services.prediction_service import map_gee_to_model_features


# Mock GEE API responses for testing
def create_mock_gee_response(
    flood_extent=150.0,
    water_presence=0.25,
    rainfall_30d=85.0,
    rainfall_7d=25.0,
    temperature=28.5,
    ndvi=-0.15,
    elevation=425.0,
    slope=2.5,
    complete=True
):
    """
    Create a mock GEE API response.
    
    Args:
        complete: If False, returns response with missing values
    """
    if not complete:
        # Missing some values to test robustness
        return {
            "flood_extent_km2": flood_extent,
            "water_presence": water_presence,
            "rainfall_30d": rainfall_30d,
            # rainfall_7d is missing
            "temperature": temperature,
            # ndvi is missing
            "elevation": elevation,
            "slope": slope
        }
    
    return {
        "flood_extent_km2": flood_extent,
        "water_presence": water_presence,
        "rainfall_30d": rainfall_30d,
        "rainfall_7d": rainfall_7d,
        "rainfall_60d": rainfall_30d * 2.1,  # Typical 60d is ~2x 30d
        "rainfall_90d": rainfall_30d * 3.2,
        "temperature": temperature,
        "temperature_anomaly": temperature - 27.0,  # Baseline 27°C
        "ndvi": ndvi,
        "ndvi_anomaly": ndvi - 0.3,  # Baseline 0.3
        "elevation": elevation,
        "slope": slope,
        "soil_moisture": 0.35,
        "land_cover": "grassland"
    }


class TestFeatureMapping:
    """Test suite for GEE feature mapping."""
    
    def test_complete_feature_mapping(self):
        """Test mapping with complete GEE response (all features present)."""
        gee_data = create_mock_gee_response()
        lat, lon = 6.5, 32.0  # Jonglei region
        
        features = map_gee_to_model_features(gee_data, lat, lon)
        
        # Verify all 19 features are present
        assert len(features) == 19, f"Expected 19 features, got {len(features)}"
        
        # Check feature names
        expected_features = [
            'rainfall_30d', 'rainfall_60d', 'rainfall_90d', 'rainfall_7d',
            'temperature', 'temperature_anomaly', 'ndvi', 'ndvi_anomaly',
            'elevation', 'slope', 'soil_moisture', 'flood_extent_km2',
            'water_presence', 'region_Jonglei', 'region_Unity', 
            'region_Upper_Nile', 'days_since_last_flood', 'month', 'season'
        ]
        
        for feature in expected_features:
            assert feature in features, f"Feature '{feature}' missing"
    
    def test_jonglei_region_encoding(self):
        """Test region encoding for Jonglei coordinates."""
        gee_data = create_mock_gee_response()
        lat, lon = 6.5, 32.0  # Jonglei
        
        features = map_gee_to_model_features(gee_data, lat, lon)
        
        assert features['region_Jonglei'] == 1
        assert features['region_Unity'] == 0
        assert features['region_Upper_Nile'] == 0
    
    def test_unity_region_encoding(self):
        """Test region encoding for Unity coordinates."""
        gee_data = create_mock_gee_response()
        lat, lon = 8.5, 30.5  # Unity
        
        features = map_gee_to_model_features(gee_data, lat, lon)
        
        assert features['region_Jonglei'] == 0
        assert features['region_Unity'] == 1
        assert features['region_Upper_Nile'] == 0
    
    def test_upper_nile_region_encoding(self):
        """Test region encoding for Upper Nile coordinates."""
        gee_data = create_mock_gee_response()
        lat, lon = 9.5, 32.5  # Upper Nile
        
        features = map_gee_to_model_features(gee_data, lat, lon)
        
        assert features['region_Jonglei'] == 0
        assert features['region_Unity'] == 0
        assert features['region_Upper_Nile'] == 1
    
    def test_month_extraction(self):
        """Test month extraction from current date."""
        gee_data = create_mock_gee_response()
        lat, lon = 6.5, 32.0
        
        features = map_gee_to_model_features(gee_data, lat, lon)
        
        current_month = datetime.now().month
        assert features['month'] == current_month
        assert 1 <= features['month'] <= 12
    
    def test_season_encoding(self):
        """Test season encoding for different months."""
        gee_data = create_mock_gee_response()
        lat, lon = 6.5, 32.0
        
        # Test will use current month's season
        features = map_gee_to_model_features(gee_data, lat, lon)
        
        # Season should be 0 (dry) or 1 (wet)
        assert features['season'] in [0, 1]
        
        # Wet season: May-October (5-10)
        # Dry season: November-April (11-12, 1-4)
        current_month = datetime.now().month
        if 5 <= current_month <= 10:
            assert features['season'] == 1, "May-Oct should be wet season (1)"
        else:
            assert features['season'] == 0, "Nov-Apr should be dry season (0)"
    
    def test_days_since_last_flood(self):
        """Test days_since_last_flood calculation (currently 365 default)."""
        gee_data = create_mock_gee_response()
        lat, lon = 6.5, 32.0
        
        features = map_gee_to_model_features(gee_data, lat, lon)
        
        # Default value when no flood history available
        assert features['days_since_last_flood'] == 365
        assert isinstance(features['days_since_last_flood'], (int, float))
    
    def test_missing_data_handling(self):
        """Test handling of incomplete GEE response."""
        gee_data = create_mock_gee_response(complete=False)
        lat, lon = 6.5, 32.0
        
        # Should still create features, using defaults or derived values
        features = map_gee_to_model_features(gee_data, lat, lon)
        
        # Should have all 19 features even with missing GEE data
        assert len(features) == 19
        
        # Check that present values are used
        assert features['rainfall_30d'] == 85.0
        assert features['temperature'] == 28.5
    
    def test_extreme_rainfall_values(self):
        """Test with extreme rainfall values (edge case)."""
        gee_data = create_mock_gee_response(
            rainfall_30d=250.0,  # Very high
            rainfall_7d=80.0      # Very high
        )
        lat, lon = 6.5, 32.0
        
        features = map_gee_to_model_features(gee_data, lat, lon)
        
        assert features['rainfall_30d'] == 250.0
        assert features['rainfall_7d'] == 80.0
        # Derived values
        assert features['rainfall_60d'] > 400.0
    
    def test_zero_rainfall(self):
        """Test with zero rainfall (dry period)."""
        gee_data = create_mock_gee_response(
            rainfall_30d=0.0,
            rainfall_7d=0.0
        )
        lat, lon = 6.5, 32.0
        
        features = map_gee_to_model_features(gee_data, lat, lon)
        
        assert features['rainfall_30d'] == 0.0
        assert features['rainfall_7d'] == 0.0
        assert features['rainfall_60d'] == 0.0
        assert features['rainfall_90d'] == 0.0
    
    def test_negative_ndvi(self):
        """Test with negative NDVI (water bodies)."""
        gee_data = create_mock_gee_response(ndvi=-0.5)
        lat, lon = 6.5, 32.0
        
        features = map_gee_to_model_features(gee_data, lat, lon)
        
        assert features['ndvi'] == -0.5
        assert features['ndvi_anomaly'] < 0  # Below baseline
    
    def test_high_elevation(self):
        """Test with high elevation (edge case for South Sudan)."""
        gee_data = create_mock_gee_response(elevation=800.0, slope=8.5)
        lat, lon = 6.5, 32.0
        
        features = map_gee_to_model_features(gee_data, lat, lon)
        
        assert features['elevation'] == 800.0
        assert features['slope'] == 8.5
    
    def test_high_flood_extent(self):
        """Test with large flood extent."""
        gee_data = create_mock_gee_response(
            flood_extent=500.0,  # Large flooded area
            water_presence=0.8    # 80% water coverage
        )
        lat, lon = 6.5, 32.0
        
        features = map_gee_to_model_features(gee_data, lat, lon)
        
        assert features['flood_extent_km2'] == 500.0
        assert features['water_presence'] == 0.8
    
    def test_temperature_anomaly_calculation(self):
        """Test temperature anomaly calculation."""
        gee_data = create_mock_gee_response(temperature=32.0)
        lat, lon = 6.5, 32.0
        
        features = map_gee_to_model_features(gee_data, lat, lon)
        
        # Anomaly = current - baseline (27°C)
        expected_anomaly = 32.0 - 27.0
        assert features['temperature_anomaly'] == pytest.approx(expected_anomaly, abs=0.1)
    
    def test_feature_types(self):
        """Test that all features have correct data types (numeric)."""
        gee_data = create_mock_gee_response()
        lat, lon = 6.5, 32.0
        
        features = map_gee_to_model_features(gee_data, lat, lon)
        
        for feature_name, value in features.items():
            assert isinstance(value, (int, float)), \
                f"Feature '{feature_name}' has non-numeric type: {type(value)}"
    
    def test_no_nan_values(self):
        """Test that no feature contains NaN or None."""
        gee_data = create_mock_gee_response()
        lat, lon = 6.5, 32.0
        
        features = map_gee_to_model_features(gee_data, lat, lon)
        
        import math
        for feature_name, value in features.items():
            assert value is not None, f"Feature '{feature_name}' is None"
            assert not (isinstance(value, float) and math.isnan(value)), \
                f"Feature '{feature_name}' is NaN"
    
    def test_boundary_coordinates(self):
        """Test with boundary coordinates (edge of South Sudan)."""
        gee_data = create_mock_gee_response()
        
        # Test various boundary points
        test_coords = [
            (4.0, 30.0),   # Southern boundary
            (12.0, 35.0),  # Northern boundary
            (6.5, 24.0),   # Western boundary
            (9.0, 36.0)    # Eastern boundary
        ]
        
        for lat, lon in test_coords:
            features = map_gee_to_model_features(gee_data, lat, lon)
            
            # Should successfully create features
            assert len(features) == 19
            
            # Exactly one region should be encoded as 1
            region_sum = (
                features['region_Jonglei'] + 
                features['region_Unity'] + 
                features['region_Upper_Nile']
            )
            assert region_sum == 1, f"Only one region should be 1 at ({lat}, {lon})"


class TestFeatureMappingIntegration:
    """Integration tests for feature mapping with model compatibility."""
    
    def test_output_matches_training_features(self):
        """Test that output features match the 19 expected by the model."""
        gee_data = create_mock_gee_response()
        lat, lon = 6.5, 32.0
        
        features = map_gee_to_model_features(gee_data, lat, lon)
        
        # These are the exact features the model expects (from training)
        expected_features = [
            'rainfall_30d', 'rainfall_60d', 'rainfall_90d', 'rainfall_7d',
            'temperature', 'temperature_anomaly', 'ndvi', 'ndvi_anomaly',
            'elevation', 'slope', 'soil_moisture', 'flood_extent_km2',
            'water_presence', 'region_Jonglei', 'region_Unity', 
            'region_Upper_Nile', 'days_since_last_flood', 'month', 'season'
        ]
        
        feature_names = list(features.keys())
        
        # Must match exactly (no extra, no missing)
        assert set(feature_names) == set(expected_features), \
            f"Feature mismatch. Got: {feature_names}"
    
    def test_feature_order_consistency(self):
        """Test that features are returned in consistent order."""
        gee_data = create_mock_gee_response()
        lat, lon = 6.5, 32.0
        
        features1 = map_gee_to_model_features(gee_data, lat, lon)
        features2 = map_gee_to_model_features(gee_data, lat, lon)
        
        # Same input should give same order
        assert list(features1.keys()) == list(features2.keys())
    
    def test_multiple_locations_batch(self):
        """Test feature mapping for multiple locations (batch prediction)."""
        gee_data = create_mock_gee_response()
        
        locations = [
            (6.5, 32.0),   # Jonglei
            (8.5, 30.5),   # Unity
            (9.5, 32.5)    # Upper Nile
        ]
        
        feature_sets = []
        for lat, lon in locations:
            features = map_gee_to_model_features(gee_data, lat, lon)
            feature_sets.append(features)
        
        # All should have same structure
        assert all(len(f) == 19 for f in feature_sets)
        
        # Regions should differ
        assert feature_sets[0]['region_Jonglei'] == 1
        assert feature_sets[1]['region_Unity'] == 1
        assert feature_sets[2]['region_Upper_Nile'] == 1


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])
