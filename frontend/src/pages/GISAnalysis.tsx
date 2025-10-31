import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, LayersControl, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { apiService } from '../services/api';
import { reverseGeocode } from '../services/geocoding';
import RiskBadge from '../components/RiskBadge';
import '../styles/flood-colors.css';

interface AnalysisResult {
  locationName: string;
  coordinates: string;
  elevation: number;
  floodRisk: number;
  recommendation: string;
}

const GISAnalysis: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  
  const [mapCenter] = useState([7.5, 30.0]);
  const southSudanBounds: [[number, number], [number, number]] = [
    [3.5, 23.5], [12.0, 35.9]
  ];

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [alertData, predData, systemStats] = await Promise.all([
          apiService.getActiveAlerts(),
          apiService.getPredictions(),
          apiService.getSystemStats()
        ]);
        
        setAlerts(alertData.alerts || []);
        setPredictions(predData.predictions || []);
        setStatistics(systemStats);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Analyze location when clicked
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setSelectedLocation({ lat, lng });
    
    try {
      // Get elevation data and location name
      const [elevationData, locationName] = await Promise.all([
        apiService.getElevationData(lat, lng),
        reverseGeocode(lat, lng).catch(() => 'Unknown Location')
      ]);
      
      // Find if this location has any alerts or predictions
      const nearbyAlerts = alerts.filter(a => {
        const dist = Math.sqrt(
          Math.pow(a.latitude - lat, 2) + Math.pow(a.longitude - lng, 2)
        );
        return dist < 0.01; // ~1km radius
      });
      
      const nearbyPredictions = predictions.filter(p => {
        const dist = Math.sqrt(
          Math.pow(p.latitude - lat, 2) + Math.pow(p.longitude - lng, 2)
        );
        return dist < 0.01;
      });

      // Calculate flood risk
      const highestRisk = nearbyPredictions.reduce((max, p) => 
        Math.max(max, (p.flood_probability || 0)), 0
      );
      
      // Generate recommendation
      let recommendation = '';
      if (highestRisk > 0.7) {
        recommendation = 'Immediate evacuation recommended';
      } else if (highestRisk > 0.5) {
        recommendation = 'High flood risk - prepare for evacuation';
      } else if (highestRisk > 0.3) {
        recommendation = 'Moderate risk - monitor conditions';
      } else if (nearbyAlerts.length > 0) {
        recommendation = 'Active flood alert in this area';
      } else {
        recommendation = 'Low flood risk - area appears safe';
      }

      setAnalysisResult({
        locationName,
        coordinates: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        elevation: elevationData.elevation,
        floodRisk: Math.round(highestRisk * 100),
        recommendation
      });
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisResult({
        locationName: 'Unknown Location',
        coordinates: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        elevation: 450,
        floodRisk: 0,
        recommendation: 'Could not analyze location'
      });
    } finally {
      setLoading(false);
    }
  }, [alerts, predictions]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#ca8a04';
      default: return '#65a30d';
    }
  };

  const getRiskRadius = (risk: string) => {
    switch (risk) {
      case 'critical': return 5000;
      case 'high': return 3000;
      case 'medium': return 2000;
      case 'low': return 1000;
      default: return 500;
    }
  };

  const createRiskIcon = (severity: string, size: number = 20) => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="
        background-color: ${getRiskColor(severity)};
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
      ">${severity.charAt(0).toUpperCase()}</div>`
    });
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex flex-col pb-16">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <div>
              GIS Analysis Dashboard
              <p className="text-sm font-normal text-gray-600 mt-1">
                Comprehensive flood risk assessment and geospatial analysis
              </p>
            </div>
          </h1>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Panel - Statistics */}
        <aside className="w-80 bg-white shadow-lg border-r border-gray-200 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg p-4 text-white">
              <h2 className="text-lg font-semibold mb-3">Quick Statistics</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-100">Total Alerts:</span>
                  <span className="font-bold">{alerts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">High Risk Areas:</span>
                  <span className="font-bold">
                    {alerts.filter(a => ['high', 'critical'].includes(a.severity)).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Predictions:</span>
                  <span className="font-bold">{predictions.length}</span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">👆</span>
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">How to Analyze</h3>
                  <p className="text-sm text-amber-800">
                    Click anywhere on the map to get detailed flood risk analysis for that location
                  </p>
                </div>
              </div>
            </div>

            {/* Analysis Results */}
            {analysisResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4"
              >
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Location Analysis
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-purple-700 font-medium">Location</label>
                    <p className="text-sm font-semibold text-purple-900">{analysisResult.locationName}</p>
                  </div>
                  <div>
                    <label className="text-xs text-purple-700 font-medium">Coordinates</label>
                    <p className="text-xs font-mono text-purple-700">{analysisResult.coordinates}</p>
                  </div>
                  <div>
                    <label className="text-xs text-purple-700 font-medium">Elevation</label>
                    <p className="text-lg font-bold text-purple-900">{analysisResult.elevation} m</p>
                  </div>
                  <div>
                    <label className="text-xs text-purple-700 font-medium">Flood Risk</label>
                    <div className="mt-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-purple-900">
                          {analysisResult.floodRisk}%
                        </span>
                        <RiskBadge severity={analysisResult.floodRisk > 70 ? 'critical' : analysisResult.floodRisk > 50 ? 'high' : 'low'} />
                      </div>
                      <div className="w-full bg-purple-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${analysisResult.floodRisk}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-purple-200">
                    <label className="text-xs text-purple-700 font-medium">Recommendation</label>
                    <p className="text-sm text-purple-900 mt-1">{analysisResult.recommendation}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Active Alerts */}
            {alerts.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Active Flood Alerts</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="bg-red-50 border border-red-200 rounded p-2">
                      <div className="flex items-center justify-between mb-1">
                        <RiskBadge severity={alert.severity} />
                        <span className="text-xs text-gray-600">
                          {new Date(alert.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 line-clamp-2">{alert.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Map Area */}
        <main className="flex-1 relative">
          <MapContainer
            center={mapCenter}
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

            {/* Alert Circles */}
            {alerts.map((alert) => (
              <Circle
                key={alert.id}
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
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <RiskBadge severity={alert.severity} />
                      <span className="font-semibold text-gray-800">Flood Alert</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                </Popup>
              </Circle>
            ))}

            {/* Prediction Markers */}
            {predictions.map((prediction) => (
              <Marker
                key={prediction.id}
                position={[prediction.latitude, prediction.longitude]}
                icon={createRiskIcon(prediction.risk_level || 'low', 18)}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <RiskBadge severity={prediction.risk_level || 'low'} />
                      <span className="font-semibold text-gray-800">Prediction</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      {prediction.latitude.toFixed(4)}, {prediction.longitude.toFixed(4)}
                    </p>
                    <div className="text-xs space-y-1">
                      <p className="text-gray-700">
                        Risk: {Math.round((prediction.flood_probability || 0) * 100)}%
                      </p>
                      <p className="text-gray-700">
                        Confidence: {Math.round((prediction.confidence_score || 0) * 100)}%
                      </p>
                    </div>
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
                fillColor: '#93c5fd',
                fillOpacity: 0.1,
                weight: 2
              }}
            />
          </MapContainer>

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium text-gray-700">Analyzing location...</span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// Component to handle map clicks
const MapClickHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
}> = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => onMapClick(e.latlng.lat, e.latlng.lng)
  });
  return null;
};

export default GISAnalysis;
