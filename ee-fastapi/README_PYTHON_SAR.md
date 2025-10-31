# SAR Flood Detection - Python Implementation

This Python implementation converts the original JavaScript Google Earth Engine code into a more maintainable, object-oriented Python module for SAR-based flood detection.

## Key Improvements Over JavaScript Version

### 1. **Better Code Organization**
- **Modular Design**: Separated into logical functions and classes
- **Type Hints**: Full type annotations for better IDE support
- **Error Handling**: Comprehensive exception handling with logging
- **Documentation**: Detailed docstrings for all functions

### 2. **Enhanced Functionality**
- **Multiple Speckle Filters**: Lee, Frost, Kuan, Gamma Map filters
- **Advanced Thresholding**: Fixed, Adaptive, Otsu's Method, K-Means
- **Edge Detection**: Sobel, Canny, Laplacian methods
- **Morphological Operations**: Opening, Closing, Both
- **Confidence Scoring**: Automated confidence assessment

### 3. **Better Integration**
- **FastAPI Compatible**: Designed to work with the existing FastAPI backend
- **Async Support**: Can be easily adapted for async operations
- **Configuration Management**: Easy parameter configuration
- **Export Flexibility**: Multiple export formats (raster, vector, both)

## 📁 File Structure

```
ee-fastapi/src/
├── sar_flood_mapping.py    # Main Python implementation
├── model.py               # Original backend model
└── README_PYTHON_SAR.md   # This documentation
```

## Installation & Setup

### Prerequisites
```bash
pip install earthengine-api
pip install fastapi
pip install uvicorn
```

### Earth Engine Authentication
```python
# Option 1: Service Account (Recommended for production)
import ee
credentials = ee.ServiceAccountCredentials(None, 'path/to/service-account-key.json')
ee.Initialize(credentials)

# Option 2: User Authentication (for development)
import ee
ee.Authenticate()  # Follow the authentication flow
ee.Initialize()
```

## Usage Examples

### Basic Usage
```python
from sar_flood_mapping import run_flood_detection, initialize_earth_engine
import ee

# Initialize Earth Engine
initialize_earth_engine()

# Define your study area
geometry = ee.Geometry.Polygon([[
    [longitude1, latitude1],
    [longitude2, latitude2],
    [longitude3, latitude3],
    [longitude4, latitude4]
]])

# Run flood detection
results = run_flood_detection(
    geometry=geometry,
    before_start='2023-01-01',
    before_end='2023-01-10',
    after_start='2023-01-15',
    after_end='2023-01-25',
    polarization='VH',
    difference_threshold=1.25
)

print(f"Flood area: {results['flood_results']['flood_area_ha'].getInfo()} hectares")
```

### Advanced Usage with Custom Parameters
```python
from sar_flood_mapping import (
    run_flood_detection, 
    SpeckleFilter, 
    ThresholdMethod, 
    EdgeDetection,
    MorphologyOperation
)

results = run_flood_detection(
    geometry=geometry,
    before_start='2023-01-01',
    before_end='2023-01-10',
    after_start='2023-01-15',
    after_end='2023-01-25',
    polarization='VH',
    pass_direction='DESCENDING',
    difference_threshold=1.25,
    speckle_filter=SpeckleFilter.LEE,  # Use Lee filter
    filter_window=100,                 # 100m window
    threshold_method=ThresholdMethod.ADAPTIVE,  # Adaptive thresholding
    min_flood_area=5.0,               # 5 hectares minimum
    connectivity_filter=8,             # 8-connected pixels
    temporal_check=True,              # Enable temporal consistency
    edge_detection=EdgeDetection.SOBEL,  # Sobel edge detection
    morphology=MorphologyOperation.OPENING,  # Morphological opening
    confidence_threshold=80,           # 80% confidence threshold
    export_format='both'              # Export both raster and vector
)
```

### Step-by-Step Processing
```python
from sar_flood_mapping import db_creator, flood_estimation, damage_assessment

# Step 1: Create SAR database
sar_data = db_creator(
    geometry=geometry,
    before_start='2023-01-01',
    before_end='2023-01-10',
    after_start='2023-01-15',
    after_end='2023-01-25',
    polarization='VH',
    speckle_filter=SpeckleFilter.FROST
)

# Step 2: Perform flood estimation
flood_results = flood_estimation(
    before_image=sar_data['before'],
    after_image=sar_data['after'],
    geometry=geometry,
    threshold_method=ThresholdMethod.OTSU
)

# Step 3: Damage assessment
damage_results = damage_assessment(
    flooded=flood_results['flooded'],
    geometry=geometry,
    after_end='2023-01-25'
)
```

## 🔧 Configuration Options

### Speckle Filters
- `FOCAL_MEAN`: Simple focal mean filter (default)
- `LEE`: Lee speckle filter
- `FROST`: Frost speckle filter
- `KUAN`: Kuan speckle filter
- `GAMMA_MAP`: Gamma Map filter

### Threshold Methods
- `FIXED`: Fixed threshold (default)
- `ADAPTIVE`: Adaptive threshold based on local statistics
- `OTSU`: Otsu's method for optimal thresholding
- `KMEANS`: K-means clustering for thresholding

### Edge Detection
- `DISABLED`: No edge detection (default)
- `SOBEL`: Sobel edge detection
- `CANNY`: Canny edge detection
- `LAPLACIAN`: Laplacian edge detection

### Morphological Operations
- `NONE`: No morphological operations (default)
- `OPENING`: Opening (erosion + dilation)
- `CLOSING`: Closing (dilation + erosion)
- `BOTH`: Both opening and closing

## Output Structure

The function returns a comprehensive dictionary with:

```python
{
    'sar_data': {
        'before': ee.Image,           # Before flood image
        'after': ee.Image,            # After flood image
        'before_collection': ee.ImageCollection,
        'after_collection': ee.ImageCollection,
        'before_count': int,          # Number of before images
        'after_count': int            # Number of after images
    },
    'flood_results': {
        'flooded': ee.Image,          # Flood extent mask
        'difference': ee.Image,       # Difference image
        'flood_area_ha': ee.Number,   # Flood area in hectares
        'confidence_score': ee.Number, # Confidence score
        'flood_stats': dict           # Flood statistics
    },
    'damage_results': {
        'exposed_population': ee.Number,      # Exposed population count
        'affected_cropland_ha': ee.Number,    # Affected cropland (ha)
        'affected_urban_ha': ee.Number,       # Affected urban areas (ha)
        'population_exposed_image': ee.Image, # Population exposure map
        'cropland_affected_image': ee.Image,  # Affected cropland map
        'urban_affected_image': ee.Image      # Affected urban map
    },
    'export_tasks': [                 # Export task information
        {
            'type': 'raster',
            'task': ee.batch.Export,
            'description': 'Flood extent raster export'
        },
        {
            'type': 'vector',
            'task': ee.batch.Export,
            'description': 'Flood extent vector export'
        }
    ],
    'parameters': {                   # All input parameters
        'before_period': str,
        'after_period': str,
        'polarization': str,
        # ... etc
    }
}
```

## Demo: Beira, Mozambique (Cyclone Idai 2019)

```python
from sar_flood_mapping import run_demo

# Run the demo for Beira, Mozambique
results = run_demo()

if results:
    print("Demo completed successfully!")
    print(f"Flood area: {results['flood_results']['flood_area_ha'].getInfo()} hectares")
    print(f"Exposed population: {results['damage_results']['exposed_population'].getInfo()}")
    print(f"Affected cropland: {results['damage_results']['affected_cropland_ha'].getInfo()} hectares")
    print(f"Affected urban: {results['damage_results']['affected_urban_ha'].getInfo()} hectares")
```

## Integration with FastAPI

The Python implementation can be easily integrated with the existing FastAPI backend:

```python
from fastapi import FastAPI, HTTPException
from sar_flood_mapping import run_flood_detection
import ee

app = FastAPI()

@app.post("/detect-flood")
async def detect_flood(request: FloodDetectionRequest):
    try:
        # Convert request to geometry
        geometry = ee.Geometry.Polygon(request.bounding_box)
        
        # Run flood detection
        results = run_flood_detection(
            geometry=geometry,
            before_start=request.before_start,
            before_end=request.before_end,
            after_start=request.after_start,
            after_end=request.after_end,
            polarization=request.polarization,
            difference_threshold=request.threshold,
            speckle_filter=SpeckleFilter(request.speckle_filter),
            threshold_method=ThresholdMethod(request.threshold_method)
        )
        
        return {
            "success": True,
            "flood_area_ha": results['flood_results']['flood_area_ha'].getInfo(),
            "confidence_score": results['flood_results']['confidence_score'].getInfo(),
            "exposed_population": results['damage_results']['exposed_population'].getInfo(),
            "affected_cropland_ha": results['damage_results']['affected_cropland_ha'].getInfo(),
            "affected_urban_ha": results['damage_results']['affected_urban_ha'].getInfo()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## 🎨 Visualization

The results can be visualized using the existing map interface:

```python
# Get visualization parameters
viz_params = {
    'before': GEOVIZ_APP['s1_img'],
    'after': GEOVIZ_APP['s1_img'],
    'difference': GEOVIZ_APP['diff_s1'],
    'flooded': GEOVIZ_APP['flood'],
    'population_exposed': GEOVIZ_APP['population_exposed']
}

# Add layers to map
Map.addLayer(results['sar_data']['before'], viz_params['before'], 'Before Flood')
Map.addLayer(results['sar_data']['after'], viz_params['after'], 'After Flood')
Map.addLayer(results['flood_results']['difference'], viz_params['difference'], 'Difference')
Map.addLayer(results['flood_results']['flooded'], viz_params['flooded'], 'Flooded Areas')
Map.addLayer(results['damage_results']['population_exposed_image'], 
             viz_params['population_exposed'], 'Exposed Population')
```

## Error Handling

The implementation includes comprehensive error handling:

```python
try:
    results = run_flood_detection(...)
except ValueError as e:
    print(f"Parameter error: {e}")
except Exception as e:
    print(f"Processing error: {e}")
    logger.error(f"Flood detection failed: {e}")
```

## Performance Optimization

- **Parallel Processing**: Multiple operations can run in parallel
- **Memory Management**: Efficient memory usage for large datasets
- **Caching**: Results can be cached for repeated operations
- **Batch Processing**: Multiple areas can be processed in batches

## Quality Assurance

- **Confidence Scoring**: Automated confidence assessment
- **Validation Checks**: Input parameter validation
- **Logging**: Comprehensive logging for debugging
- **Testing**: Unit tests for all functions

## References

- Original JavaScript implementation: UN-SPIDER December 2019
- Google Earth Engine documentation: https://developers.google.com/earth-engine
- SAR flood mapping techniques: Various academic papers and research

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This implementation follows the same license as the original project.

---

**Note**: This Python implementation provides the same functionality as the original JavaScript code but with better organization, error handling, and integration capabilities. It's designed to work seamlessly with the existing FastAPI backend while providing enhanced features and maintainability.
