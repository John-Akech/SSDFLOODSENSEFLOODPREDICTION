var baseUrl = window.location.origin;
var isAuthenticated = false;

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
document.getElementById('authenticateBtn').addEventListener('click', async function() {
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
        document.getElementById('authAlert').innerHTML = `<strong>❌ Error</strong><br>${error.message}`;
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

// Retry connection
document.getElementById('skipAuthBtn').addEventListener('click', function() {
    document.getElementById('authModal').classList.remove('active');
    checkAuthStatus();
});

// Initialize on page load
checkAuthStatus();

// Location search handler
window.handleLocationSearch = async function() {
    const searchInput = document.getElementById('locationSearch');
    const searchBtn = document.getElementById('searchLocationBtn');
    const placeName = searchInput.value.trim();
    
    if (!placeName) return;
    
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<span>Searching...</span>';
    
    try {
        const result = await searchLocation(placeName);
        if (result) {
            const coords = ol.proj.transform([result.lon, result.lat], 'EPSG:4326', 'EPSG:3857');
            map.getView().animate({
                center: coords,
                zoom: 12,
                duration: 1000
            });
            alert(`Location found: ${result.displayName}\nCoordinates: ${result.lat.toFixed(4)}, ${result.lon.toFixed(4)}`);
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
    title:"OSM basemap",
    source: new ol.source.OSM(),
})

// vector layer (bbox)
var source = new ol.source.Vector({wrapX: false});
var vector = new ol.layer.Vector({
    title:"geometry",
    source: source,    
});

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

var map = CreateMap(layers=[raster, vector]);
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
      if (title === "Flood Area" || title === "After Flood" || title === "Before Flood"){
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
    document.getElementById('pauseDownload').style.display = 'inline-block';
    document.getElementById('pauseDownload').disabled = false;

    var features = source.getFeatures();
    if (features.length === 0) {
        alert('Please draw a shape on the map first');
        document.getElementById('loading').classList.remove('active');
        document.getElementById('download').disabled = false;
        document.getElementById('pauseDownload').style.display = 'none';
        return;
    }

    var lastFeature = features[features.length - 1].clone();
    var bbox = lastFeature.getGeometry().transform('EPSG:3857', 'EPSG:4326').getExtent().toString();
    
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
        document.getElementById('pauseDownload').style.display = 'none';
        document.getElementById('resumeDownload').style.display = 'none';
    })
    .catch(error => {
        if (error.name === 'AbortError') {
            document.getElementById('downloadText').textContent = 'Download Paused';
            document.getElementById('loading').classList.remove('active');
            document.getElementById('pauseDownload').style.display = 'none';
            document.getElementById('resumeDownload').style.display = 'inline-block';
            document.getElementById('resumeDownload').disabled = false;
        } else {
            console.error(error);
            alert('Download failed: ' + error.message);
            document.getElementById('loading').classList.remove('active');
            document.getElementById('download').disabled = false;
            document.getElementById('pauseDownload').style.display = 'none';
        }
    });      
});

document.getElementById('pauseDownload').addEventListener('click', function() {
    if (downloadController) {
        downloadController.abort();
    }
});

document.getElementById('resumeDownload').addEventListener('click', function() {
    document.getElementById('downloadText').textContent = 'Download GeoPackage';
    document.getElementById('resumeDownload').style.display = 'none';
    document.getElementById('download').disabled = false;
    document.getElementById('download').click();
});

document.getElementById('display').addEventListener('click', function () {
    if (!isAuthenticated) {
        alert('⚠️ Please authenticate with Google Earth Engine first');
        document.getElementById('authModal').classList.add('active');
        return;
    }

    document.getElementById('loading').classList.add('active');
    document.getElementById('display').disabled = true;
    document.getElementById('result').classList.remove('active');
    simulateProgress();
    
    var features = source.getFeatures();
    if (features.length === 0) {
        alert('⚠️ Please draw a rectangle on the map first');
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
        
        if (response.flood_area_ha) {
          document.getElementById('floodArea').textContent = response.flood_area_ha.toFixed(2);
          document.getElementById('result').classList.add('active');
        }
        
        document.getElementById('loading').classList.remove('active');
        document.getElementById('display').disabled = false;
    })
    .catch(error => {
        console.error(error);
        alert('❌ Detection failed: ' + error.message);
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
document.addEventListener('keydown', function(e) {
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
