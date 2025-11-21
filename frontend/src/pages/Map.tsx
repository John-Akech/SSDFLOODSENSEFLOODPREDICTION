import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Marker, Polygon, useMapEvents, useMap } from 'react-leaflet';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import { Prediction, Alert } from '../types';
import RiskBadge from '../components/RiskBadge';
import { useLanguage } from '../i18n/LanguageContext';
import { reverseGeocode, forwardGeocode } from '../services/geocoding';
import L from 'leaflet';
import '../styles/flood-colors.css';

// Custom icons for different risk levels
const createRiskIcon = (severity: string, size: number = 20) => {
  const getColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#ca8a04';
      default: return '#65a30d';
    }
  };

  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background-color: ${getColor(severity)};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      color: white;
    ">${severity.charAt(0).toUpperCase()}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

const MapClickHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
  disabled: boolean;
}> = ({ onMapClick, disabled }) => {
  useMapEvents({
    click: (e) => {
      if (!disabled) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
};

const MapController: React.FC<{
  center: [number, number] | null;
  zoom: number;
  bounds?: [[number, number], [number, number]];
}> = ({ center, zoom, bounds }) => {
  const map = useMap();

  React.useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [20, 20] });
    } else if (center) {
      map.setView(center, zoom, { animate: true, duration: 1 });
    }
  }, [center, zoom, bounds, map]);

  return null;
};

// Ensure Leaflet correctly sizes after animations/layout changes
const MapSizeInvalidator: React.FC = () => {
  const map = useMap();
  React.useEffect(() => {
    const invalidate = () => {
      try {
        map.invalidateSize(false);
      } catch (error) {
        console.warn("Failed to invalidate map size", error);
      }
    };
    const t = setTimeout(invalidate, 300);
    window.addEventListener('resize', invalidate);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', invalidate);
    };
  }, [map]);
  return null;
};

const Map: React.FC = () => {
  useLanguage();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [existingPredictions, setExistingPredictions] = useState<Prediction[]>([]);
  const [locationNames, setLocationNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [searchPlace, setSearchPlace] = useState('');
  const [searching, setSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [showLegend, setShowLegend] = useState(true);
  const [mapKey, setMapKey] = useState(0); // Force re-render when needed
  const [stats, setStats] = useState({
    totalAlerts: 0,
    totalPredictions: 0,
    highRiskAreas: 0,
    lastUpdate: new Date().toLocaleTimeString()
  });
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh] = useState(true);

  // South Sudan bounds
  const southSudanBounds: [[number, number], [number, number]] = [
    [3.5, 23.5], // Southwest
    [12.0, 35.9]  // Northeast
  ];

  // Fetch data with error handling
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [alertData, predData] = await Promise.all([
        apiService.getActiveAlerts(),
        apiService.getPredictions()
      ]);

      const alertList = alertData.alerts || [];
      const predList = predData.predictions || [];

      setAlerts(alertList);
      setExistingPredictions(predList);

      // Update stats
      setStats({
        totalAlerts: alertList.length,
        totalPredictions: predList.length,
        highRiskAreas: alertList.filter((a: Alert) => a.severity === 'critical' || a.severity === 'high').length,
        lastUpdate: new Date().toLocaleTimeString()
      });

      // Set initial map center to South Sudan if not set
      if (!mapCenter) {
        setMapCenter([7.5, 30.0]);
      }

      // Get location names for all alerts and predictions
      const allLocations = [...alertList, ...predList];
      const locationPromises = allLocations.map(async (item) => {
        try {
          const name = await reverseGeocode(item.latitude, item.longitude);
          return { key: `${item.latitude},${item.longitude}`, name };
        } catch (error) {
          console.warn('Failed to get location name:', error);
          return { key: `${item.latitude},${item.longitude}`, name: 'Unknown Location' };
        }
      });

      const locationResults = await Promise.all(locationPromises);
      const newLocationNames = locationResults.reduce((acc, { key, name }) => {
        acc[key] = name;
        return acc;
      }, {} as Record<string, string>);

      setLocationNames(prev => ({ ...prev, ...newLocationNames }));
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Could not load map data. Please check your network or backend status.');
      // Set fallback data
      setStats(prev => ({ ...prev, lastUpdate: new Date().toLocaleTimeString() }));
    } finally {
      setLoading(false);
    }
  }, [mapCenter]);

  useEffect(() => {
    if (!autoRefresh) return;
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchData, autoRefresh]);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (predicting) return;

    setPredicting(true);
    try {
      const prediction = await apiService.createPrediction(lat, lng);
      setPredictions(prev => [...prev, prediction]);

      // Get location name
      try {
        const name = await reverseGeocode(lat, lng);
        setLocationNames(prev => ({
          ...prev,
          [`${lat},${lng}`]: name
        }));
      } catch (error) {
        console.warn('Failed to get location name:', error);
        setLocationNames(prev => ({
          ...prev,
          [`${lat},${lng}`]: 'Unknown Location'
        }));
      }
    } catch (error) {
      console.error('Failed to create prediction:', error);
      // Show error notification
      alert('Failed to create prediction. Please try again.');
    } finally {
      setPredicting(false);
    }
  }, [predicting]);

  const handleSearch = useCallback(async () => {
    if (!searchPlace.trim() || searching) return;

    setSearching(true);
    try {
      const coords = await forwardGeocode(searchPlace);
      if (coords) {
        setMapCenter([coords.lat, coords.lon]);
        // Force map re-render
        setMapKey(prev => prev + 1);
        // Auto-create prediction for searched location
        setTimeout(() => {
          handleMapClick(coords.lat, coords.lon);
        }, 1000);
      } else {
        alert('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  }, [searchPlace, searching, handleMapClick]);

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#ca8a04';
      default: return '#65a30d';
    }
  };

  const getRiskRadius = (severity: string) => {
    switch (severity) {
      case 'critical': return 8000;
      case 'high': return 6000;
      case 'medium': return 4000;
      case 'low': return 2000;
      default: return 1000;
    }
  };

  const filteredAlerts = alerts.filter(alert =>
    selectedRiskLevel === 'all' || alert.severity === selectedRiskLevel
  );

  const filteredPredictions = [...predictions, ...existingPredictions].filter(pred =>
    selectedRiskLevel === 'all' || pred.risk_level === selectedRiskLevel
  );

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="flood-card max-w-md text-center p-8">
          <p className="text-red-600 font-bold mb-4">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); fetchData(); }}
            className="btn-flood-primary px-4 py-2 mt-2"
          >
            Retry</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading flood risk map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex flex-col">
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flood-card p-4 sm:p-6 mb-4 sm:mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-slate-900">
                <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 bg-clip-text text-transparent">
                  Flood Risk Map
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600">Interactive flood prediction and monitoring</p>
            </div>

            <div className="flex flex-row items-center gap-3 sm:gap-4 flex-wrap">
              {/* Search */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search location..."
                  value={searchPlace}
                  onChange={(e) => setSearchPlace(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={searching}
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="btn-flood-primary px-4 py-2 disabled:opacity-50"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Risk Level Filter */}
              <select
                value={selectedRiskLevel}
                onChange={(e) => setSelectedRiskLevel(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Risk Levels</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {/* Legend Toggle */}
              <button
                onClick={() => setShowLegend(!showLegend)}
                className="btn-risk-warning px-4 py-2"
              >
                {showLegend ? 'Hide Legend' : 'Show Legend'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Map Container */}
        <div className="relative flex-1 w-full min-h-0 m-4 sm:m-6 mt-0 sm:mt-0" style={{ minHeight: 'calc(70vh - 120px)' }}>
          <MapContainer
            key={mapKey}
            center={mapCenter || [7.5, 30.0]}
            zoom={6}
            style={{ height: '100%', width: '100%', zIndex: 1 }}
            bounds={southSudanBounds}
            boundsOptions={{ padding: [20, 20] }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapSizeInvalidator />

            <MapClickHandler onMapClick={handleMapClick} disabled={predicting} />
            <MapController
              center={mapCenter}
              zoom={6}
              bounds={mapCenter ? undefined : southSudanBounds}
            />

            {/* Flood Risk Circles for Alerts */}
            {filteredAlerts.map((alert) => (
              <Circle
                key={`alert-${alert.id}`}
                center={[alert.latitude, alert.longitude]}
                radius={getRiskRadius(alert.severity)}
                pathOptions={{
                  color: getRiskColor(alert.severity),
                  fillColor: getRiskColor(alert.severity),
                  fillOpacity: 0.2,
                  weight: 2
                }}
              >
                <Popup>
                  <div className="p-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <RiskBadge severity={alert.severity as 'low' | 'medium' | 'high' | 'critical'} />
                      <span className="font-semibold">Flood Alert</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-1">
                      {locationNames[`${alert.latitude},${alert.longitude}`] ||
                        `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`}
                    </p>
                    <p className="text-sm text-slate-500">
                      Created: {alert.created_at ? new Date(alert.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Unknown'}
                    </p>
                  </div>
                </Popup>
              </Circle>
            ))}

            {/* Prediction Markers */}
            {filteredPredictions.map((prediction) => (
              <Marker
                key={`pred-${prediction.id}`}
                position={[prediction.latitude, prediction.longitude]}
                icon={createRiskIcon(prediction.risk_level, 24)}
              >
                <Popup>
                  <div className="p-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <RiskBadge severity={prediction.risk_level} />
                      <span className="font-semibold">Flood Prediction</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-1">
                      {locationNames[`${prediction.latitude},${prediction.longitude}`] ||
                        `${prediction.latitude.toFixed(4)}, ${prediction.longitude.toFixed(4)}`}
                    </p>
                    <p className="text-sm text-slate-700 font-semibold">
                      Flood Probability: {Math.round(prediction.flood_probability * 100)}%
                    </p>
                    <p className="text-sm text-slate-500">
                      Confidence: {Math.round(prediction.confidence_score * 100)}%
                    </p>
                    <p className="text-sm text-slate-500">
                      Created: {new Date(prediction.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* South Sudan Boundary */}
            <Polygon
              positions={[
                [3.5, 23.5], [12.0, 23.5], [12.0, 35.9], [3.5, 35.9], [3.5, 23.5]
              ]}
              pathOptions={{
                color: '#1e40af',
                fillColor: 'transparent',
                weight: 2,
                dashArray: '5, 5'
              }}
            />
          </MapContainer>

          {/* Floating Legend */}
          {showLegend && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute top-4 right-4 flood-card p-4 sm:p-5 max-w-xs z-[100] shadow-xl"
            >
              <h3 className="text-lg font-bold mb-4 text-slate-900">Risk Levels</h3>
              <div className="space-y-2">
                {[
                  { level: 'Critical', color: '#dc2626', desc: 'Immediate evacuation' },
                  { level: 'High', color: '#ea580c', desc: 'Prepare for evacuation' },
                  { level: 'Medium', color: '#d97706', desc: 'Monitor closely' },
                  { level: 'Low', color: '#ca8a04', desc: 'Stay alert' },
                  { level: 'Minimal', color: '#65a30d', desc: 'Normal conditions' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <div>
                      <span className="text-sm font-medium text-slate-700">{item.level}</span>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Click on map to create flood prediction
                </p>
              </div>
            </motion.div>
          )}

          {/* Loading Overlay */}
          {predicting && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="flood-card p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Analyzing flood risk...</p>
              </div>
            </div>
          )}
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flood-card p-4 mt-4"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-flood-title">{stats.totalAlerts}</p>
              <p className="text-sm text-slate-600">Active Alerts</p>
            </div>
            <div>
              <p className="text-xl font-bold text-flood-title">{stats.totalPredictions}</p>
              <p className="text-sm text-slate-600">Predictions</p>
            </div>
            <div>
              <p className="text-xl font-bold text-flood-title">{stats.highRiskAreas}</p>
              <p className="text-sm text-slate-600">High Risk Areas</p>
            </div>
            <div>
              <p className="text-xl font-bold text-flood-title">{stats.lastUpdate}</p>
              <p className="text-sm text-slate-600">Last Update</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Map;