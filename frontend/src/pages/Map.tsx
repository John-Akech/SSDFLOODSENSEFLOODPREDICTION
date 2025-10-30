import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Marker, useMapEvents, useMap, Polygon } from 'react-leaflet';
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
}> = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
};

const MapController: React.FC<{ center: [number, number] | null; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  React.useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true, duration: 1 });
    }
  }, [center, zoom, map]);
  
  return null;
};

const Map: React.FC = () => {
  const { } = useLanguage();
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

  // South Sudan bounds
  const southSudanBounds: [[number, number], [number, number]] = [
    [3.5, 23.5], // Southwest
    [12.0, 35.9]  // Northeast
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [alertData, predData] = await Promise.all([
          apiService.getActiveAlerts(),
          apiService.getPredictions()
        ]);
        
        const alertList = alertData.alerts || [];
        const predList = predData.predictions || [];
        
        setAlerts(alertList);
        setExistingPredictions(predList);
        
        // Set initial map center to South Sudan
        setMapCenter([7.5, 30.0]);
        
        // Get location names for all alerts and predictions
        const allLocations = [...alertList, ...predList];
        allLocations.forEach(async (item) => {
          const name = await reverseGeocode(item.latitude, item.longitude);
          setLocationNames(prev => ({ 
            ...prev, 
            [`${item.latitude},${item.longitude}`]: name 
          }));
        });
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleMapClick = async (lat: number, lng: number) => {
    if (predicting) return;
    
    setPredicting(true);
    try {
      const prediction = await apiService.createPrediction(lat, lng);
      setPredictions(prev => [...prev, prediction]);
      
      // Get location name
      const name = await reverseGeocode(lat, lng);
      setLocationNames(prev => ({ 
        ...prev, 
        [`${lat},${lng}`]: name 
      }));
    } catch (error) {
      console.error('Failed to create prediction:', error);
    } finally {
      setPredicting(false);
    }
  };

  const handleSearch = async () => {
    if (!searchPlace.trim()) return;
    
    setSearching(true);
    try {
      const coords = await forwardGeocode(searchPlace);
      if (coords) {
        setMapCenter([coords.lat, coords.lng]);
        // Auto-create prediction for searched location
        await handleMapClick(coords.lat, coords.lng);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

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
    selectedRiskLevel === 'all' || pred.severity === selectedRiskLevel
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading flood risk map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flood-card p-4 m-4 mb-0"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-flood-title text-2xl font-bold">Flood Risk Map</h1>
              <p className="text-water-subtitle">Interactive flood prediction and monitoring</p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-4">
              {/* Search */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search location..."
                  value={searchPlace}
                  onChange={(e) => setSearchPlace(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="btn-flood-primary px-4 py-2"
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
        <div className="flex-1 relative">
          <MapContainer
            center={mapCenter || [7.5, 30.0]}
            zoom={6}
            className="h-full w-full"
            bounds={southSudanBounds}
            boundsOptions={{ padding: [20, 20] }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            <MapClickHandler onMapClick={handleMapClick} />
            <MapController center={mapCenter} zoom={6} />

            {/* Flood Risk Circles for Alerts */}
            {filteredAlerts.map((alert, idx) => (
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
                      <RiskBadge severity={alert.severity} />
                      <span className="font-semibold">Flood Alert</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-1">
                      {locationNames[`${alert.latitude},${alert.longitude}`] || 
                       `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`}
                    </p>
                    <p className="text-sm text-slate-500">
                      Predicted: {new Date(alert.predicted_date).toLocaleDateString()}
                    </p>
                  </div>
                </Popup>
              </Circle>
            ))}

            {/* Prediction Markers */}
            {filteredPredictions.map((prediction, idx) => (
              <Marker
                key={`pred-${prediction.id || idx}`}
                position={[prediction.latitude, prediction.longitude]}
                icon={createRiskIcon(prediction.severity, 24)}
              >
                <Popup>
                  <div className="p-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <RiskBadge severity={prediction.severity} />
                      <span className="font-semibold">Flood Prediction</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-1">
                      {locationNames[`${prediction.latitude},${prediction.longitude}`] || 
                       `${prediction.latitude.toFixed(4)}, ${prediction.longitude.toFixed(4)}`}
                    </p>
                    <p className="text-sm text-slate-500">
                      Confidence: {Math.round(prediction.confidence * 100)}%
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
              className="absolute top-4 right-4 flood-card p-4 max-w-xs"
            >
              <h3 className="text-flood-title font-bold mb-3">Risk Levels</h3>
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
          className="flood-card p-4 m-4 mt-0"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-flood-title">{alerts.length}</p>
              <p className="text-sm text-slate-600">Active Alerts</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-flood-title">{predictions.length + existingPredictions.length}</p>
              <p className="text-sm text-slate-600">Predictions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-flood-title">
                {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length}
              </p>
              <p className="text-sm text-slate-600">High Risk Areas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-flood-title">
                {new Date().toLocaleTimeString()}
              </p>
              <p className="text-sm text-slate-600">Last Update</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Map;