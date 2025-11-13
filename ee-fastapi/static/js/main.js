var baseUrl = window.location.origin;
var isAuthenticated = false;
var processingStartTime = 0;
var currentStep = 0;

// Forward geocoding function
async function searchLocation(placeName) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)},South Sudan&format=json&limit=5&countrycodes=ss`,
            { headers: { 'User-Agent': 'FloodSense/1.0' } }
        );
        const data = await response.json();

        if (data && data.length > 0) {
            for (const item of data) {
                const lat = parseFloat(item.lat);
                const lon = parseFloat(item.lon);
                if (lat >= 3.5 && lat <= 12.2 && lon >= 24 && lon <= 36) {
                    return { lat, lon, displayName: item.display_name };
                }
            }
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

// Check authentication status on load
async function checkAuthStatus() {
    try {
        const response = await fetch(`${baseUrl}/gee/status`);
        const data = await response.json();

        if (data.initialized) {
            isAuthenticated = true;
            document.getElementById('statusBadge').textContent = 'LIVE MONITORING';
            document.getElementById('statusBadge').style.background = 'rgba(76, 175, 80, 0.3)';
            document.getElementById('display').disabled = false;
            document.getElementById('download').disabled = false;
            document.getElementById('authWarning').style.display = 'none';
        } else {
            document.getElementById('statusBadge').textContent = 'NOT AUTHENTICATED';
            document.getElementById('statusBadge').style.background = 'rgba(244, 67, 54, 0.3)';
            document.getElementById('authModal').classList.add('active');
            document.getElementById('authWarning').style.display = 'block';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        document.getElementById('statusBadge').textContent = 'CONNECTION ERROR';
        document.getElementById('authModal').classList.add('active');
    }
}

// Authenticate with GEE
document.getElementById('authenticateBtn').addEventListener('click', async function () {
    const projectId = document.getElementById('projectId').value.trim();
    const btn = this;
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Initializing...</span>';

    try {
        const url = projectId
            ? `${baseUrl}/gee/authenticate?project_id=${encodeURIComponent(projectId)}`
            : `${baseUrl}/gee/authenticate`;

        const response = await fetch(url, { method: 'POST' });
        const data = await response.json();

        if (response.ok) {
            document.getElementById('authAlert').className = 'alert alert-success';
            document.getElementById('authAlert').innerHTML = '<strong>Success!</strong><br>Earth Engine authenticated successfully.';

            setTimeout(() => {
                document.getElementById('authModal').classList.remove('active');
                checkAuthStatus();
            }, 1500);
        } else {
            throw new Error(data.detail || 'Authentication failed');
        }
    } catch (error) {
        document.getElementById('authAlert').className = 'alert alert-error';
        document.getElementById('authAlert').innerHTML = `<strong>[ERROR] Error</strong><br>${error.message}`;
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

// Retry connection
document.getElementById('skipAuthBtn').addEventListener('click', function () {
    document.getElementById('authModal').classList.remove('active');
    checkAuthStatus();
});

// Initialize on page load
checkAuthStatus();

// Location search handler
window.handleLocationSearch = async function () {
    const searchInput = document.getElementById('locationSearch');
    const searchBtn = document.getElementById('searchLocationBtn');
    const placeName = searchInput.value.trim();

    if (!placeName) return;

    searchBtn.disabled = true;
    searchBtn.innerHTML = '<span>Searching...</span>';

    try {
        const result = await searchLocation(placeName);
        if (result) {
            // Clear any existing features
            source.clear();

            // Create a bounding box around the location (approximately 10km x 10km)
            const bufferKm = 5; // 5km radius = 10km x 10km box
            const lon = result.lon;
            const lat = result.lat;

            // Convert degrees to approximate km (at equator: 1 degree ≈ 111km)
            const kmPerDegree = 111;
            const lonBuffer = bufferKm / (kmPerDegree * Math.cos(lat * Math.PI / 180));
            const latBuffer = bufferKm / kmPerDegree;

            // Create bbox coordinates
            const minLon = lon - lonBuffer;
            const maxLon = lon + lonBuffer;
            const minLat = lat - latBuffer;
            const maxLat = lat + latBuffer;

            // Create rectangle feature
            const coords = [
                [minLon, minLat],
                [maxLon, minLat],
                [maxLon, maxLat],
                [minLon, maxLat],
                [minLon, minLat]
            ];

            const feature = new ol.Feature({
                geometry: new ol.geom.Polygon([coords]).transform('EPSG:4326', 'EPSG:3857')
            });

            source.addFeature(feature);

            // Zoom to the created bbox
            const extent = feature.getGeometry().getExtent();
            map.getView().fit(extent, {
                padding: [50, 50, 50, 50],
                duration: 1000
            });

            // Show success message
            alert(`✓ Area of Interest created for: ${result.displayName}\nBounding Box: ${minLat.toFixed(4)}, ${minLon.toFixed(4)} to ${maxLat.toFixed(4)}, ${maxLon.toFixed(4)}\n\nYou can now run flood detection!`);
            searchInput.value = '';
        } else {
            alert('Location not found in South Sudan. Please check the spelling and try again.');
        }
    } catch (error) {
        console.error('Search failed:', error);
        alert('Failed to search location. Please try again.');
    } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<span>Search</span>';
    }
};

// raster layer (OSM)
var raster = new ol.layer.Tile({
    title: "basemap",
    source: new ol.source.OSM(),
})

// vector layer (bbox)
var source = new ol.source.Vector({ wrapX: false });
var vector = new ol.layer.Vector({
    title: "geometry",
    source: source,
});

// Keep references to SAR layers so we can replace/clear them
var layerBefore = null;
var layerAfter = null;
var layerFlood = null;
var layerWater = null;  // Permanent water bodies
var layerSlope = null;  // High slope areas

// Map Creator
function CreateMap(layers) {
    var map = new ol.Map({
        target: 'map',
        layers: layers,
        view: new ol.View({
            center: ol.proj.transform([31.307, 6.877], 'EPSG:4326', 'EPSG:3857'),
            zoom: 7
        })
    });
    return map
}

var map = CreateMap(layers = [raster, vector]);
map.getView().setCenter(ol.proj.transform([31.307, 6.877], 'EPSG:4326', 'EPSG:3857'));
map.getView().setZoom(7);

// Draw interactions
var draw;

function removeCurrentDraw() {
    if (draw) {
        map.removeInteraction(draw);
    }
}

function drawRectangle() {
    removeCurrentDraw();
    draw = new ol.interaction.Draw({
        source: source,
        type: "Circle",
        geometryFunction: ol.interaction.Draw.createBox()
    });
    map.addInteraction(draw);
}

function drawPolygon() {
    removeCurrentDraw();
    draw = new ol.interaction.Draw({
        source: source,
        type: "Polygon"
    });
    map.addInteraction(draw);
}

function drawCircle() {
    removeCurrentDraw();
    draw = new ol.interaction.Draw({
        source: source,
        type: "Circle"
    });
    map.addInteraction(draw);
}

function drawLine() {
    removeCurrentDraw();
    draw = new ol.interaction.Draw({
        source: source,
        type: "LineString"
    });
    map.addInteraction(draw);
}

document.getElementById('undo').addEventListener('click', function () {
    const layers = map.getLayers().getArray().slice();
    layers.forEach(layer => {
        const title = layer.get('title');
        if (title === "Flood Area" || title === "After Flood" || title === "Before Flood") {
            map.removeLayer(layer);
        }
    });
    source.clear();
    document.getElementById('result').classList.remove('active');
});

var downloadController = null;
var downloadProgress = 0;
var downloadBlob = null;

document.getElementById('download').addEventListener('click', function () {
    if (!isAuthenticated) {
        alert('Please authenticate with Google Earth Engine first');
        document.getElementById('authModal').classList.add('active');
        return;
    }

    document.getElementById('loading').classList.add('active');
    document.getElementById('download').disabled = true;

    var features = source.getFeatures();
    if (features.length === 0) {
        alert('Please draw a shape on the map first');
        document.getElementById('loading').classList.remove('active');
        document.getElementById('download').disabled = false;
        document.getElementById('pauseDownload').style.display = 'none';
        return;
    }

    var lastFeature = features[features.length - 1].clone();
    var geom3857 = lastFeature.getGeometry();
    var extent4326 = geom3857.clone().transform('EPSG:3857', 'EPSG:4326').getExtent();
    var bbox = extent4326.toString();

    var init_start = document.getElementById("init_start").value;
    var init_last = document.getElementById("init_last").value;
    var flood_start = document.getElementById("flood_start").value;
    var flood_last = document.getElementById("flood_last").value;
    var flood_threshold = parseFloat(document.getElementById("threshold").value);

    downloadController = new AbortController();

    fetch(`${baseUrl}/flood_download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            bbox: bbox,
            init_start: init_start,
            init_last: init_last,
            flood_start: flood_start,
            flood_last: flood_last,
            flood_threshold: flood_threshold
        }),
        signal: downloadController.signal
    })
        .then(response => {
            if (response.ok) {
                return response.blob();
            } else {
                return response.json().then(err => { throw new Error(err.detail); });
            }
        })
        .then(blob => {
            downloadBlob = blob;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flood_area_${Date.now()}.gpkg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.getElementById('loading').classList.remove('active');
            document.getElementById('download').disabled = false;
        })
        .catch(error => {
            console.error(error);
            alert('Download failed: ' + error.message);
            document.getElementById('loading').classList.remove('active');
            document.getElementById('download').disabled = false;
        });
});

document.getElementById('display').addEventListener('click', function () {
    if (!isAuthenticated) {
        alert('[WARNING] Please authenticate with Google Earth Engine first');
        document.getElementById('authModal').classList.add('active');
        return;
    }

    document.getElementById('loading').classList.add('active');
    document.getElementById('display').disabled = true;
    document.getElementById('result').classList.remove('active');
    simulateProgress();

    var features = source.getFeatures();
    if (features.length === 0) {
        alert('[WARNING] Please draw a rectangle on the map first');
        document.getElementById('loading').classList.remove('active');
        document.getElementById('display').disabled = false;
        return;
    }

    var lastFeature = features[features.length - 1].clone();
    var bbox = lastFeature.getGeometry().transform('EPSG:3857', 'EPSG:4326').getExtent().toString();

    var init_start = document.getElementById("init_start").value;
    var init_last = document.getElementById("init_last").value;
    var flood_start = document.getElementById("flood_start").value;
    var flood_last = document.getElementById("flood_last").value;
    var flood_threshold = parseFloat(document.getElementById("threshold").value);

    fetch(`${baseUrl}/flood_display`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            bbox: bbox,
            init_start: init_start,
            init_last: init_last,
            flood_start: flood_start,
            flood_last: flood_last,
            flood_threshold: flood_threshold
        })
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                return response.json().then(err => { throw new Error(err.detail); });
            }
        })
        .then(response => {
            // Defensive checks
            if (!response.before_tile || !response.after_tile || !response.flood_tile) {
                throw new Error('Tiles not returned. Try adjusting dates/threshold or ensure GEE auth.');
            }

            // Remove existing SAR and reference layers
            [layerBefore, layerAfter, layerFlood, layerWater, layerSlope].forEach(l => { if (l) map.removeLayer(l); });

            // Create new SAR layers
            layerBefore = new ol.layer.Tile({ source: new ol.source.XYZ({ url: response.before_tile }), title: 'Before Flood' });
            layerAfter = new ol.layer.Tile({ source: new ol.source.XYZ({ url: response.after_tile }), title: 'After Flood' });
            layerFlood = new ol.layer.Tile({ source: new ol.source.XYZ({ url: response.flood_tile }), title: 'Flood Area' });

            // Create reference layers if available
            if (response.permanent_water_tile) {
                layerWater = new ol.layer.Tile({
                    source: new ol.source.XYZ({ url: response.permanent_water_tile }),
                    title: 'Permanent Water'
                });
            }
            if (response.high_slope_tile) {
                layerSlope = new ol.layer.Tile({
                    source: new ol.source.XYZ({ url: response.high_slope_tile }),
                    title: 'High Slope'
                });
            }

            // Apply opacity from UI
            var sarOpacityVal = parseInt(document.getElementById('sarOpacity')?.value || '80', 10) / 100;
            layerBefore.setOpacity(sarOpacityVal);
            layerAfter.setOpacity(sarOpacityVal);
            layerFlood.setOpacity(0.9);
            if (layerWater) layerWater.setOpacity(0.6);
            if (layerSlope) layerSlope.setOpacity(0.5);

            // Set initial visibility based on legend checkbox state
            const floodCheckbox = document.getElementById('toggleFloodLayers');
            const sarCheckbox = document.getElementById('toggleSarLayers');
            const refCheckbox = document.getElementById('toggleReferenceLayers');

            const floodVisible = floodCheckbox ? floodCheckbox.checked : true;
            const sarVisible = sarCheckbox ? sarCheckbox.checked : true;
            const refVisible = refCheckbox ? refCheckbox.checked : true;

            layerBefore.setVisible(sarVisible);
            layerAfter.setVisible(sarVisible);
            layerFlood.setVisible(floodVisible);
            if (layerWater) layerWater.setVisible(refVisible);
            if (layerSlope) layerSlope.setVisible(refVisible);

            console.log(`Layers created - Flood: ${floodVisible}, SAR: ${sarVisible}, Reference: ${refVisible}`);

            // Add in sensible order (reference layers at bottom, flood on top)
            if (layerWater) map.addLayer(layerWater);
            if (layerSlope) map.addLayer(layerSlope);
            map.addLayer(layerBefore);
            map.addLayer(layerAfter);
            map.addLayer(layerFlood);

            // Show layer controls
            document.getElementById('layerControls').style.display = 'block';

            // Fit view to drawn extent
            try {
                var extent3857 = ol.proj.transformExtent(extent4326, 'EPSG:4326', 'EPSG:3857');
                map.getView().fit(extent3857, { duration: 600, padding: [40, 40, 40, 40] });
            } catch (_) { }

            // Results panel
            if (typeof response.flood_area_ha === 'number') {
                document.getElementById('floodArea').textContent = response.flood_area_ha.toFixed(2);
                document.getElementById('confidence').textContent = (response.confidence || 0).toFixed(1) + '%';
                document.getElementById('floodCount').textContent = response.flood_patches || 0;
                document.getElementById('result').classList.add('active');

                // Update legend statistics
                updateLegendStats(response.flood_area_ha, response.flood_patches, response.confidence);
            } else {
                document.getElementById('result').classList.add('active');
                document.getElementById('floodArea').textContent = '0.00';
                document.getElementById('confidence').textContent = '0.0%';
                document.getElementById('floodCount').textContent = '0';

                // Update legend with zero values
                updateLegendStats(0, 0, 0);
            }

            document.getElementById('loading').classList.remove('active');
            document.getElementById('display').disabled = false;
        })
        .catch(error => {
            console.error(error);
            alert('[ERROR] Detection failed: ' + error.message);
            document.getElementById('loading').classList.remove('active');
            document.getElementById('display').disabled = false;
        });
});

function clearDrawing() {
    source.clear();
    document.getElementById('result').classList.remove('active');
    document.getElementById('drawTool').value = '';
}

function handleToolChange() {
    const tool = document.getElementById('drawTool').value;
    if (tool === 'rectangle') drawRectangle();
    else if (tool === 'polygon') drawPolygon();
    else if (tool === 'line') drawLine();
    else if (tool === 'circle') drawCircle();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.querySelector('.sidebar-toggle');
    sidebar.classList.toggle('open');
    toggle.classList.toggle('active');
}

drawRectangle();
document.getElementById('drawTool').value = 'rectangle';

// Add event listener for search button
if (document.getElementById('searchLocationBtn')) {
    document.getElementById('searchLocationBtn').addEventListener('click', handleLocationSearch);
}

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    // Ctrl+M - Toggle sidebar
    if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        toggleSidebar();
    }
    // Ctrl+D - Start detection
    if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        if (!document.getElementById('display').disabled) {
            document.getElementById('display').click();
        }
    }
    // Esc - Close modal
    if (e.key === 'Escape') {
        document.getElementById('authModal').classList.remove('active');
    }
    // Ctrl+C - Clear drawing
    if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        clearDrawing();
    }
    // Ctrl+L - Toggle legend
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        toggleFloatingLegend();
    }
    // Enter in search box
    if (e.key === 'Enter' && document.activeElement.id === 'locationSearch') {
        e.preventDefault();
        handleLocationSearch();
    }
});

// Simulate progress for demo
function simulateProgress() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        document.getElementById('progressFill').style.width = progress + '%';
        document.getElementById('progressText').textContent = progress + '%';
        if (progress >= 100) {
            clearInterval(interval);
        }
    }, 300);
}

// UI Functions
function toggleAdvancedOptions() {
    const panel = document.getElementById('advancedPanel');
    const checkbox = document.getElementById('advancedOptions');

    if (checkbox && panel) {
        if (checkbox.checked) {
            panel.style.display = 'block';
            panel.style.animation = 'slideDown 0.3s ease-out';
        } else {
            panel.style.display = 'none';
        }
    }
}

// Range slider value updates
function updateRangeValue(sliderId, valueId, suffix = '') {
    const slider = document.getElementById(sliderId);
    const valueDisplay = document.getElementById(valueId);

    if (slider && valueDisplay) {
        slider.addEventListener('input', function () {
            valueDisplay.textContent = this.value + suffix;
        });
    }
}

// Initialize all range sliders
function initializeRangeSliders() {
    updateRangeValue('filterWindow', 'filterWindowValue', 'm');
    updateRangeValue('threshold', 'thresholdValue', '');
    updateRangeValue('sarOpacity', 'sarOpacityValue', '%');
    updateRangeValue('confidenceThreshold', 'confidenceValue', '%');
}

// Processing with step tracking
function startProcessing() {
    processingStartTime = Date.now();
    currentStep = 0;
    // Show loading panel
    const loadingPanel = document.getElementById('loading');
    const resultPanel = document.getElementById('result');

    if (loadingPanel) loadingPanel.classList.add('active');
    if (resultPanel) resultPanel.classList.remove('active');
    // Simple progress will be handled by simulateProgress()
}

function updateProgress(percentage) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const processingTime = document.getElementById('processingTime');

    if (progressFill) {
        progressFill.style.width = percentage + '%';
    }

    if (progressText) {
        progressText.textContent = Math.round(percentage) + '%';
    }

    if (processingTime) {
        const elapsed = Math.round((Date.now() - processingStartTime) / 1000);
        processingTime.textContent = elapsed + 's';
    }
}

function completeProcessing() {
    // Hide loading panel
    const loadingPanel = document.getElementById('loading');
    if (loadingPanel) loadingPanel.classList.remove('active');

    // Show results
    const resultPanel = document.getElementById('result');
    if (resultPanel) resultPanel.classList.add('active');

    // Simulate results
    const floodArea = Math.floor(Math.random() * 500) + 50;
    const confidence = Math.floor(Math.random() * 30) + 70;
    const floodCount = Math.floor(Math.random() * 10) + 1;
    const processingTime = Math.round((Date.now() - processingStartTime) / 1000);

    // Update result values
    const floodAreaEl = document.getElementById('floodArea');
    const confidenceEl = document.getElementById('confidence');
    const floodCountEl = document.getElementById('floodCount');
    const detectionMethodEl = document.getElementById('detectionMethod');
    const finalProcessingTimeEl = document.getElementById('finalProcessingTime');
    const dataQualityEl = document.getElementById('dataQuality');

    if (floodAreaEl) floodAreaEl.textContent = floodArea;
    if (confidenceEl) confidenceEl.textContent = confidence + '%';
    if (floodCountEl) floodCountEl.textContent = floodCount;
    if (detectionMethodEl) detectionMethodEl.textContent = document.getElementById('thresholdMethod').value;
    if (finalProcessingTimeEl) finalProcessingTimeEl.textContent = processingTime + 's';
    if (dataQualityEl) dataQualityEl.textContent = confidence > 80 ? 'Excellent' : confidence > 60 ? 'Good' : 'Fair';

    // Enable download button
    const downloadBtn = document.getElementById('download');
    if (downloadBtn) downloadBtn.disabled = false;
}

// Map visualization controls
function initializeMapControls() {
    // Base map control
    const baseMapSelect = document.getElementById('baseMap');
    if (baseMapSelect) {
        baseMapSelect.addEventListener('change', function () {
            let src;
            switch (this.value) {
                case 'terrain':
                    src = new ol.source.XYZ({ url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png', attributions: '© OpenTopoMap' });
                    break;
                case 'hybrid':
                    src = new ol.source.XYZ({ url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png' });
                    break;
                case 'street':
                    src = new ol.source.OSM();
                    break;
                case 'satellite':
                default:
                    src = new ol.source.XYZ({ url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png' });
            }
            raster.setSource(src);
        });
    }

    // SAR opacity control
    const sarOpacitySlider = document.getElementById('sarOpacity');
    if (sarOpacitySlider) {
        sarOpacitySlider.addEventListener('input', function () {
            const val = parseInt(this.value, 10) / 100;
            if (layerBefore) layerBefore.setOpacity(val);
            if (layerAfter) layerAfter.setOpacity(val);
        });
    }

    // Flood style control
    const floodStyleSelect = document.getElementById('floodStyle');
    if (floodStyleSelect) {
        floodStyleSelect.addEventListener('change', function () {
            console.log('Flood style changed to:', this.value);
            // Implementation for flood layer styling would go here
        });
    }
}

// Flood detection with parameters
function getBoundingBox() {
    var features = source.getFeatures();
    if (features.length === 0) {
        return null;
    }
    var lastFeature = features[features.length - 1].clone();
    return lastFeature.getGeometry().transform('EPSG:3857', 'EPSG:4326').getExtent().toString();
}

function detectFlood() {
    if (!isAuthenticated) {
        alert('Please authenticate with Google Earth Engine first.');
        return;
    }

    var features = source.getFeatures();
    if (features.length === 0) {
        alert('[WARNING] Please draw a rectangle on the map first');
        return;
    }

    // Get all parameters
    const params = {
        bbox: getBoundingBox(),
        init_start: document.getElementById('init_start').value,
        init_last: document.getElementById('init_last').value,
        flood_start: document.getElementById('flood_start').value,
        flood_last: document.getElementById('flood_last').value,
        flood_threshold: parseFloat(document.getElementById('threshold').value),
        polarization: document.getElementById('polarizationMode') ? document.getElementById('polarizationMode').value : 'VH',
        speckle_filter: document.getElementById('speckleFilter') ? document.getElementById('speckleFilter').value : 'focal_mean',
        filter_window: document.getElementById('filterWindow') ? parseInt(document.getElementById('filterWindow').value) : 50,
        threshold_method: document.getElementById('thresholdMethod') ? document.getElementById('thresholdMethod').value : 'fixed',
        min_flood_area: document.getElementById('minFloodArea') ? parseFloat(document.getElementById('minFloodArea').value) : 1,
        connectivity_filter: document.getElementById('connectivityFilter') ? document.getElementById('connectivityFilter').value : '8',
        temporal_check: document.getElementById('temporalCheck') ? document.getElementById('temporalCheck').value : 'disabled',
        edge_detection: document.getElementById('edgeDetection') ? document.getElementById('edgeDetection').value : 'disabled',
        morphology: document.getElementById('morphology') ? document.getElementById('morphology').value : 'none',
        confidence_threshold: document.getElementById('confidenceThreshold') ? parseInt(document.getElementById('confidenceThreshold').value) : 75
    };

    console.log('Flood detection parameters:', params);

    // Start processing
    document.getElementById('loading').classList.add('active');
    document.getElementById('display').disabled = true;
    document.getElementById('result').classList.remove('active');
    startProcessing();

    // Prepare abort controller with timeout (3 minutes)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);

    // Call the actual API
    fetch(`${baseUrl}/flood_display`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(params),
        signal: controller.signal
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                return response.json().then(err => { throw new Error(err.detail); });
            }
        })
        .then(response => {
            clearTimeout(timeoutId);
            console.log('✅ Flood detection completed successfully');
            console.log('📊 Detection Results:', {
                status: response.status || 'success',
                flood_area_ha: response.flood_area_ha,
                flood_patches: response.flood_patches,
                confidence: response.confidence,
                message: response.message || 'Detection completed'
            });

            // Log tile URLs for verification
            console.log('🗺️ Tile URLs:', {
                before: response.before_tile ? 'loaded' : 'missing',
                after: response.after_tile ? 'loaded' : 'missing',
                flood: response.flood_tile ? 'loaded' : 'missing'
            });

            // Handle different detection statuses
            const status = response.status || 'success';
            const statusMessage = response.message || 'Detection completed';

            // Display status message to user
            if (status === 'no_baseline_images' || status === 'no_flood_images') {
                // No satellite images available
                alert('ℹ️ No Satellite Images Available\n\n' + statusMessage);
                document.getElementById('loading').classList.remove('active');
                document.getElementById('display').disabled = false;
                return;
            }

            // Process the response data
            var bflood = new ol.layer.Tile({
                source: new ol.source.XYZ({ url: response.before_tile }),
                title: "Before Flood"
            });
            var aflood = new ol.layer.Tile({
                source: new ol.source.XYZ({ url: response.after_tile }),
                title: "After Flood"
            });
            var final = new ol.layer.Tile({
                source: new ol.source.XYZ({ url: response.flood_tile }),
                title: "Flood Area"
            });

            map.addLayer(bflood);
            map.addLayer(aflood);
            map.addLayer(final);

            console.log('✓ Layers added to map');

            // Show status-specific messages
            if (status === 'no_flood_detected') {
                // No flood detected - show informative message
                document.getElementById('floodArea').textContent = '0.00';
                document.getElementById('result').classList.add('active');
                alert('✓ Analysis Complete\n\n' + statusMessage);
                console.log('✓ No flood detected - analysis complete');
            } else if (status === 'uncertain_detection') {
                // Low confidence detection - warn user
                document.getElementById('floodArea').textContent = response.flood_area_ha.toFixed(2);
                document.getElementById('result').classList.add('active');
                alert('⚠️ Low Confidence Detection\n\n' + statusMessage);
                console.warn('⚠️ Uncertain detection:', statusMessage);
            } else if (status === 'flood_detected') {
                // Successful flood detection
                document.getElementById('floodArea').textContent = response.flood_area_ha.toFixed(2);
                document.getElementById('result').classList.add('active');
                console.log(`✓ ${statusMessage}`);
            } else if (response.flood_area_ha !== undefined) {
                // Fallback for backwards compatibility
                document.getElementById('floodArea').textContent = response.flood_area_ha.toFixed(2);
                document.getElementById('result').classList.add('active');

                if (response.flood_area_ha > 0) {
                    console.log(`🌊 Flood area detected: ${response.flood_area_ha.toFixed(2)} hectares`);
                } else {
                    console.warn('⚠️ No significant flood area detected (0 hectares)');
                }
            }

            document.getElementById('loading').classList.remove('active');
            document.getElementById('display').disabled = false;
        })
        .catch(error => {
            clearTimeout(timeoutId);
            console.error('Flood detection failed:', error);
            let message = error && error.message ? error.message : 'Unknown error';
            if (error.name === 'AbortError') {
                message = 'Request timed out. Try a smaller area or narrower date range.';
            } else if (!navigator.onLine) {
                message = 'You appear to be offline. Please check your connection.';
            } else if (message === 'Failed to fetch') {
                message = 'Network error or server unavailable. Ensure backend is running and GEE is authenticated.';
            }
            alert('[ERROR] Detection failed: ' + message);
            document.getElementById('loading').classList.remove('active');
            document.getElementById('display').disabled = false;
        });
}

// Legend Control Functions
function toggleFloatingLegend() {
    const legend = document.getElementById('floatingLegend');
    if (legend) {
        legend.classList.toggle('active');
    }
}

// Toggle layer group visibility
function toggleLayerGroup(groupType) {
    // Map group types to their actual checkbox IDs
    const checkboxIds = {
        'flood': 'toggleFloodLayers',
        'sar': 'toggleSarLayers',
        'reference': 'toggleReferenceLayers'
    };

    const checkbox = document.getElementById(checkboxIds[groupType]);
    if (!checkbox) {
        console.error(`Checkbox not found for group: ${groupType}`);
        return;
    }

    const isVisible = checkbox.checked;

    console.log(`Toggle ${groupType} - Checked: ${isVisible}`);
    console.log('Layer status:', {
        layerFlood: layerFlood ? 'exists' : 'null',
        layerBefore: layerBefore ? 'exists' : 'null',
        layerAfter: layerAfter ? 'exists' : 'null',
        layerWater: layerWater ? 'exists' : 'null',
        layerSlope: layerSlope ? 'exists' : 'null',
        map: map ? 'exists' : 'null'
    });

    // Toggle legend items visibility
    const items = document.querySelectorAll(`.legend-item[data-layer="${groupType}"]`);
    items.forEach(item => {
        item.style.display = isVisible ? 'flex' : 'none';
    });

    // Toggle actual map layers and sync with old individual checkboxes
    if (groupType === 'flood') {
        if (layerFlood) {
            layerFlood.setVisible(isVisible);
            console.log(`✓ Flood layer visibility set to: ${isVisible}`);
        } else {
            console.warn('⚠ Flood layer does not exist yet - run detection first');
        }
        // Sync old checkbox
        const oldCheckbox = document.getElementById('toggleFlood');
        if (oldCheckbox) oldCheckbox.checked = isVisible;

    } else if (groupType === 'sar') {
        if (layerBefore) {
            layerBefore.setVisible(isVisible);
            console.log(`✓ Before layer visibility set to: ${isVisible}`);
        } else {
            console.warn('⚠ Before layer does not exist yet');
        }
        if (layerAfter) {
            layerAfter.setVisible(isVisible);
            console.log(`✓ After layer visibility set to: ${isVisible}`);
        } else {
            console.warn('⚠ After layer does not exist yet');
        }
        // Sync old checkboxes
        const beforeCheckbox = document.getElementById('toggleBefore');
        const afterCheckbox = document.getElementById('toggleAfter');
        if (beforeCheckbox) beforeCheckbox.checked = isVisible;
        if (afterCheckbox) afterCheckbox.checked = isVisible;

    } else if (groupType === 'reference') {
        // Toggle reference layers (permanent water and high slope)
        if (layerWater) {
            layerWater.setVisible(isVisible);
            console.log(`✓ Water layer visibility set to: ${isVisible}`);
        } else {
            console.warn('⚠ Water layer does not exist yet');
        }
        if (layerSlope) {
            layerSlope.setVisible(isVisible);
            console.log(`✓ Slope layer visibility set to: ${isVisible}`);
        } else {
            console.warn('⚠ Slope layer does not exist yet');
        }
    }

    // Force map to re-render
    if (map) {
        map.render();
        console.log('✓ Map refreshed');
    } else {
        console.error('✗ Map object not found!');
    }
}

// Update flood layer opacity from legend
function updateFloodOpacity(value) {
    const opacity = value / 100;
    if (layerFlood) {
        layerFlood.setOpacity(opacity);
    }
    document.getElementById('floodOpacityValue').textContent = value + '%';
}

// Update SAR layers opacity from legend
function updateSarOpacity(value) {
    const opacity = value / 100;
    if (layerBefore) {
        layerBefore.setOpacity(opacity);
    }
    if (layerAfter) {
        layerAfter.setOpacity(opacity);
    }
    document.getElementById('sarOpacityValueLegend').textContent = value + '%';

    // Sync with sidebar control if it exists
    const sidebarOpacity = document.getElementById('sarOpacity');
    if (sidebarOpacity) {
        sidebarOpacity.value = value;
    }
}

// Update legend statistics when flood is detected
function updateLegendStats(floodArea, floodPatches, confidence) {
    const statsDiv = document.getElementById('floodStats');
    const opacityControl = document.getElementById('floodOpacityControl');
    const sarOpacityControl = document.getElementById('sarOpacityControlLegend');

    if (statsDiv && floodArea !== undefined) {
        document.getElementById('legendFloodArea').textContent = floodArea.toFixed(2) + ' ha';
        document.getElementById('legendFloodPatches').textContent = floodPatches || 0;
        document.getElementById('legendFloodConfidence').textContent = (confidence || 0).toFixed(1) + '%';
        statsDiv.style.display = 'block';
        opacityControl.style.display = 'block';
        sarOpacityControl.style.display = 'block';
    }
}

function toggleLegend() {
    const legendGroups = document.querySelectorAll('.legend-group');
    legendGroups.forEach(group => {
        group.classList.toggle('collapsed');
    });
}

function exportLegend() {
    // Create a simple text version of the legend
    const legendData = {
        'SAR Imagery': {
            'Before Flood (Baseline)': 'Blue gradient',
            'After Flood (Event)': 'Purple gradient',
            'Change Detection Ratio': 'Red gradient'
        },
        'Flood Detection': {
            'High Confidence (>90%)': 'Red with pulse animation',
            'Medium Confidence (70-90%)': 'Orange gradient',
            'Low Confidence (50-70%)': 'Yellow gradient',
            'Uncertain (<50%)': 'Gray gradient'
        },
        'Terrain Features': {
            'Permanent Water Bodies': 'Blue gradient',
            'High Slope (>5°)': 'Brown gradient',
            'Urban Areas': 'Dark gray gradient',
            'Dense Vegetation': 'Green gradient'
        },
        'Processing Status': {
            'Pending Processing': 'Gray gradient',
            'Currently Processing': 'Blue with pulse animation',
            'Processing Complete': 'Green gradient',
            'Processing Error': 'Red gradient'
        }
    };

    // Convert to downloadable text
    let legendText = 'FloodSense SAR Detection Legend\n';
    legendText += '=====================================\n\n';

    Object.entries(legendData).forEach(([category, items]) => {
        legendText += `${category}:\n`;
        Object.entries(items).forEach(([item, description]) => {
            legendText += `  • ${item}: ${description}\n`;
        });
        legendText += '\n';
    });

    legendText += 'Generated by FloodSense SAR Detection System\n';
    legendText += `Date: ${new Date().toLocaleString()}\n`;

    // Create and download file
    const blob = new Blob([legendText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floodsense-legend-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Update legend based on current processing state
function updateLegendStatus(status) {
    const legendItems = document.querySelectorAll('.legend-item');

    // Reset all status indicators
    legendItems.forEach(item => {
        const colorBox = item.querySelector('.legend-color');
        if (colorBox) {
            colorBox.classList.remove('processing-active', 'processing-complete', 'processing-error');
        }
    });

    // Update based on status
    if (status === 'processing') {
        const activeItems = document.querySelectorAll('.legend-color.processing-active');
        activeItems.forEach(item => {
            item.classList.add('processing-active');
        });
    } else if (status === 'complete') {
        const completeItems = document.querySelectorAll('.legend-color.processing-complete');
        completeItems.forEach(item => {
            item.classList.add('processing-complete');
        });
    } else if (status === 'error') {
        const errorItems = document.querySelectorAll('.legend-color.processing-error');
        errorItems.forEach(item => {
            item.classList.add('processing-error');
        });
    }
}

// Initialize features when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeRangeSliders();
    initializeMapControls();

    // Set up layer toggle event listeners (sync with legend)
    const toggleBefore = document.getElementById('toggleBefore');
    const toggleAfter = document.getElementById('toggleAfter');
    const toggleFlood = document.getElementById('toggleFlood');

    if (toggleBefore) {
        toggleBefore.addEventListener('change', function () {
            if (layerBefore) {
                layerBefore.setVisible(this.checked);
            }
            // Sync with legend checkbox (SAR group controls both before/after)
            const sarCheckbox = document.getElementById('toggleSarLayers');
            if (sarCheckbox && toggleAfter) {
                // Only check if both before and after are checked
                sarCheckbox.checked = this.checked && toggleAfter.checked;
                toggleLayerGroup('sar');
            }
        });
    }

    if (toggleAfter) {
        toggleAfter.addEventListener('change', function () {
            if (layerAfter) {
                layerAfter.setVisible(this.checked);
            }
            // Sync with legend checkbox (SAR group controls both before/after)
            const sarCheckbox = document.getElementById('toggleSarLayers');
            if (sarCheckbox && toggleBefore) {
                // Only check if both before and after are checked
                sarCheckbox.checked = this.checked && toggleBefore.checked;
                toggleLayerGroup('sar');
            }
        });
    }

    if (toggleFlood) {
        toggleFlood.addEventListener('change', function () {
            if (layerFlood) {
                layerFlood.setVisible(this.checked);
            }
            // Sync with legend checkbox
            const floodCheckbox = document.getElementById('toggleFloodLayers');
            if (floodCheckbox) {
                floodCheckbox.checked = this.checked;
                toggleLayerGroup('flood');
            }
        });
    }

    // Update the main detect button
    const detectButton = document.getElementById('display');
    if (detectButton) {
        // Add event listener for the detection function
        detectButton.addEventListener('click', detectFlood);
    }

    // Initialize legend - show it by default
    const floatingLegend = document.getElementById('floatingLegend');
    if (floatingLegend) {
        floatingLegend.classList.add('active');
    }

    // Initialize legend
    updateLegendStatus('pending');
});
