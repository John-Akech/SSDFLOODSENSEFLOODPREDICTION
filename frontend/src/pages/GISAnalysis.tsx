import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { apiService } from '../services/api';
import { osmService, InfrastructureNode } from '../services/osm';
import { reverseGeocode } from '../services/geocoding';
import RiskBadge from '../components/RiskBadge';
import '../styles/flood-colors.css';

interface AnalysisResult {
  locationName: string;
  coordinates: string;
  elevation: number;
  floodRisk: number;
  recommendation: string;
  elevationSource?: string;
  lat: number;
  lng: number;
}

const GISAnalysis: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [floodZones, setFloodZones] = useState<any[]>([]);
  const [infrastructure, setInfrastructure] = useState<InfrastructureNode[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [showInfrastructure, setShowInfrastructure] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [locationNames, setLocationNames] = useState<Record<string, string>>({});

  const [mapCenter] = useState<[number, number]>([7.5, 30.0]);
  const southSudanBounds: [[number, number], [number, number]] = [
    [3.5, 23.5], [12.0, 35.9]
  ];

  // Fetch all data with auto-refresh and WebSockets
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [alertData, predData, zoneData] = await Promise.all([
          apiService.getActiveAlerts(),
          apiService.getPredictions(),
          apiService.getFloodZones()
        ]);

        const fetchedAlerts = alertData.alerts || [];
        const fetchedPredictions = predData.predictions || [];
        const fetchedZones = zoneData.zones || [];

        setAlerts(fetchedAlerts);
        setPredictions(fetchedPredictions);
        setFloodZones(fetchedZones);

        // Resolve location names for all items
        const namePromises = [
          ...fetchedAlerts.map((a: any) => ({ type: 'alert', id: a.id, lat: a.latitude, lng: a.longitude })),
          ...fetchedPredictions.map((p: any) => ({ type: 'pred', id: p.id, lat: p.latitude, lng: p.longitude })),
          ...fetchedZones.map((z: any) => ({ type: 'zone', id: z.id, lat: z.center[0], lng: z.center[1] }))
        ].map(async (item) => {
          try {
            const name = await reverseGeocode(item.lat, item.lng);
            return { key: `${item.type}-${item.id}`, name };
          } catch (e) {
            // STRICT: No mock "Unknown Location". Use actual coordinates if geocoding fails.
            return { key: `${item.type}-${item.id}`, name: `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}` };
          }
        });

        const resolvedNames = await Promise.all(namePromises);
        const newLocationNames = resolvedNames.reduce((acc, curr) => ({
          ...acc,
          [curr.key]: curr.name
        }), {} as Record<string, string>);

        setLocationNames(prev => ({ ...prev, ...newLocationNames }));

      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // WebSocket connection for real-time updates
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/v1/ws/alerts`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = () => {
      // Refresh data on update
      fetchData();
    };

    return () => {
      ws.close();
    };
  }, []);

  // Fetch infrastructure when map moves
  const handleMapMove = useCallback(async (bounds: L.LatLngBounds) => {
    if (!showInfrastructure || mapStyle === 'satellite') return;

    // Only fetch if zoom is high enough to avoid too much data
    // We can't easily check zoom here without passing it, but we can check bounds size
    const latDiff = bounds.getNorth() - bounds.getSouth();

    // If view is too large, clear infrastructure to avoid clutter and performance issues
    if (latDiff > 2.0) {
      if (infrastructure.length > 0) setInfrastructure([]);
      return;
    }

    try {
      const nodes = await osmService.getInfrastructure(
        bounds.getSouth(),
        bounds.getWest(),
        bounds.getNorth(),
        bounds.getEast()
      );
      setInfrastructure(nodes);
    } catch (error) {
      console.error('Failed to fetch infrastructure:', error);
    }
  }, [showInfrastructure, mapStyle, infrastructure.length]);

  // Analyze location when clicked
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setLoading(true);

    try {
      // Use backend analysis endpoint
      const analysis = await apiService.analyzeLocation(lat, lng);

      let locationName = '';
      try {
        locationName = await reverseGeocode(lat, lng);
      } catch (e) {
        locationName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }

      setAnalysisResult({
        locationName,
        coordinates: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        elevation: analysis.elevation,
        elevationSource: 'Open-Elevation API',
        floodRisk: analysis.flood_risk_percent,
        recommendation: analysis.recommendation,
        lat,
        lng
      });
      setRecommendations([]); // Clear previous recommendations
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisResult(null);
      alert('Failed to analyze location. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerateRecommendations = async () => {
    if (!analysisResult) return;

    setLoading(true);
    try {
      const data = await apiService.getDykeRecommendations({
        latitude: analysisResult.lat,
        longitude: analysisResult.lng,
        flood_probability: analysisResult.floodRisk / 100,
        elevation: analysisResult.elevation > 0 ? analysisResult.elevation : undefined
      });
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      alert('Failed to generate infrastructure recommendations');
    } finally {
      setLoading(false);
    }
  };

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

  // Check if a location is within any risk zone
  const checkInfrastructureRisk = useCallback((lat: number, lon: number) => {
    // Check flood zones
    for (const zone of floodZones) {
      const dist = L.latLng(lat, lon).distanceTo(zone.center);
      if (dist <= zone.radius) return { isAtRisk: true, source: 'Flood Zone', severity: zone.risk_level };
    }

    // Check predictions
    for (const pred of predictions) {
      const dist = L.latLng(lat, lon).distanceTo([pred.latitude, pred.longitude]);
      const radius = getRiskRadius(pred.risk_level || 'low');
      if (dist <= radius) return { isAtRisk: true, source: 'Prediction', severity: pred.risk_level };
    }

    // Check alerts
    for (const alert of alerts) {
      const dist = L.latLng(lat, lon).distanceTo([alert.latitude, alert.longitude]);
      const radius = getRiskRadius(alert.severity);
      if (dist <= radius) return { isAtRisk: true, source: 'Active Alert', severity: alert.severity };
    }

    return { isAtRisk: false, source: '', severity: '' };
  }, [floodZones, predictions, alerts]);

  const createInfrastructureIcon = (type: string, isAtRisk: boolean = false) => {
    let color = '#3b82f6';
    let icon = '📍';

    switch (type) {
      case 'hospital': color = '#ef4444'; icon = '🏥'; break;
      case 'school': color = '#f59e0b'; icon = '🏫'; break;
      case 'church': color = '#8b5cf6'; icon = '⛪'; break;
    }

    const pulseAnimation = isAtRisk ? `
      animation: pulse-red 1.5s infinite;
      border-color: #dc2626 !important;
      border-width: 3px !important;
    ` : '';

    return L.divIcon({
      className: 'custom-infra-icon',
      html: `<div style="
        background-color: white;
        width: ${isAtRisk ? '32px' : '24px'};
        height: ${isAtRisk ? '32px' : '24px'};
        border-radius: 50%;
        border: 2px solid ${color};
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isAtRisk ? '18px' : '14px'};
        transition: all 0.3s ease;
        ${pulseAnimation}
      ">${icon}</div>
      ${isAtRisk ? '<div style="position: absolute; -10px; right: -5px; background: #dc2626; color: white; font-size: 10px; padding: 2px 4px; border-radius: 4px; font-weight: bold;">⚠️</div>' : ''}`
    });
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

  const handleVerifyPrediction = async (id: number) => {
    try {
      await apiService.verifyPrediction(id, { verified: true, timestamp: new Date().toISOString() });
      alert('Prediction verified successfully. Thank you for your contribution.');
    } catch (error) {
      console.error('Verification failed:', error);
      alert('Failed to verify prediction.');
    }
  };

  return (
    <div className="flex flex-col pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 shadow-lg border-b border-blue-700 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl hidden">
              </div>
              <div className="text-white">
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                  Live GIS Analysis Dashboard
                  <span className="px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded-full animate-pulse">
                    LIVE
                  </span>
                </h1>
                <p className="text-sm text-blue-100 mt-1">
                  Real-time flood risk assessment with interactive geospatial analysis
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-white">Auto-refreshing every 30s</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Panel - Statistics */}
        <aside className="w-80 bg-white shadow-lg border-r border-gray-200 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 rounded-xl p-5 text-white shadow-lg">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                Live Statistics
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center bg-white/10 backdrop-blur-sm rounded-lg p-2">
                  <span className="text-blue-100">Total Alerts:</span>
                  <span className="font-bold text-xl">{alerts.length}</span>
                </div>
                <div className="flex justify-between items-center bg-white/10 backdrop-blur-sm rounded-lg p-2">
                  <span className="text-blue-100">High Risk Zones:</span>
                  <span className="font-bold text-xl text-red-200">
                    {floodZones.length}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-white/10 backdrop-blur-sm rounded-lg p-2">
                  <span className="text-blue-100">Active Predictions:</span>
                  <span className="font-bold text-xl">{predictions.length}</span>
                </div>
                <div className="flex justify-between items-center bg-white/10 backdrop-blur-sm rounded-lg p-2">
                  <span className="text-blue-100">Last Updated:</span>
                  <span className="font-semibold text-sm">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Map Legend */}
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                Map Legend
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow"></div>
                  <span className="text-gray-700">Critical Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow"></div>
                  <span className="text-gray-700">High Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white shadow"></div>
                  <span className="text-gray-700">Medium Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-lime-500 border-2 border-white shadow"></div>
                  <span className="text-gray-700">Low Risk</span>
                </div>
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <p className="text-xs text-gray-600">
                    Circles = Risk zones • Markers = Predictions
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
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
                    <div className="flex items-baseline gap-2">
                      <p className="text-lg font-bold text-purple-900">
                        {!analysisResult.elevationSource ? 'N/A' : `${analysisResult.elevation} m`}
                      </p>
                      <span className="text-xs text-purple-500">
                        ({analysisResult.elevationSource || 'Unavailable'})
                      </span>
                    </div>
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

                  {/* Dyke Placement Button */}
                  {analysisResult.floodRisk > 30 && (
                    <div className="pt-3 mt-2 border-t border-purple-200">
                      <button
                        onClick={handleGenerateRecommendations}
                        disabled={loading}
                        className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {loading ? 'Analyzing...' : 'Generate Infrastructure Plan'}
                      </button>
                    </div>
                  )}

                  {/* Recommendations List */}
                  {recommendations.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <h4 className="font-bold text-purple-900 text-sm">Proposed Infrastructure</h4>
                      {recommendations.map((rec, idx) => (
                        <div key={idx} className="bg-white/50 rounded p-2 text-xs border border-purple-100">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-purple-800 capitalize">
                              {rec.type.replace(/_/g, ' ')}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${rec.priority === 'critical' ? 'bg-red-100 text-red-700' :
                              rec.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                              {rec.priority.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-purple-900 mb-1">{rec.description}</p>
                          <div className="flex justify-between text-purple-700 opacity-80">
                            <span>Est. Cost: ${rec.estimated_cost_usd?.toLocaleString()}</span>
                            <span>{rec.construction_time_days} days</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
              url={mapStyle === 'satellite'
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
              attribution={mapStyle === 'satellite'
                ? '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
            />

            <MapClickHandler onMapClick={handleMapClick} />
            <MapEventsHandler onMoveEnd={handleMapMove} />

            {/* Infrastructure Markers */}
            {showInfrastructure && infrastructure.map((node) => {
              const risk = checkInfrastructureRisk(node.lat, node.lon);
              return (
                <Marker
                  key={`infra-${node.id}`}
                  position={[node.lat, node.lon]}
                  icon={createInfrastructureIcon(node.type, risk.isAtRisk)}
                >
                  <Popup>
                    <div className="p-2 min-w-[150px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">
                          {node.type === 'hospital' ? '🏥' : node.type === 'school' ? '🏫' : '⛪'}
                        </span>
                        <span className="font-semibold text-gray-800 capitalize">{node.type}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{node.name}</p>
                      {node.tags?.operator && (
                        <p className="text-xs text-gray-600 mt-1">Operated by: {node.tags.operator}</p>
                      )}

                      {risk.isAtRisk && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-1 text-red-700 font-bold text-xs mb-1">
                            <span>⚠️</span>
                            <span>AT RISK: {risk.severity?.toUpperCase()}</span>
                          </div>
                          <p className="text-xs text-red-600">
                            Affected by {risk.source}
                          </p>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {/* Flood Zones */}
            {floodZones.map((zone) => (
              <Circle
                key={`zone-${zone.id}`}
                center={zone.center}
                radius={zone.radius}
                pathOptions={{
                  color: getRiskColor(zone.risk_level),
                  fillColor: getRiskColor(zone.risk_level),
                  fillOpacity: 0.4,
                  weight: 1,
                  dashArray: '5, 5'
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <RiskBadge severity={zone.risk_level} />
                      <span className="font-semibold text-gray-800">
                        {locationNames[`zone-${zone.id}`] || 'High Risk Zone'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Probability: {Math.round(zone.probability * 100)}%
                    </p>
                  </div>
                </Popup>
              </Circle>
            ))}

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
                      <span className="font-semibold text-gray-800">
                        {locationNames[`alert-${alert.id}`] || 'Flood Alert'}
                      </span>
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
                      <span className="font-semibold text-gray-800">
                        {locationNames[`pred-${prediction.id}`] || 'Prediction'}
                      </span>
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
                      <button
                        onClick={() => handleVerifyPrediction(prediction.id)}
                        className="mt-2 w-full py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                      >
                        Verify Prediction
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Recommendation Markers */}
            {recommendations.map((rec, idx) => (
              <Marker
                key={`rec-${idx}`}
                position={[rec.latitude, rec.longitude]}
                icon={L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div style="
                    background-color: ${rec.type.includes('dyke') ? '#2563eb' : '#7c3aed'};
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    color: white;
                  ">${rec.type.includes('dyke') ? '🛡️' : '🏗️'}</div>`
                })}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{rec.type.includes('dyke') ? '🛡️' : '🏗️'}</span>
                      <span className="font-semibold text-gray-800 capitalize">
                        {rec.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2 rounded">
                      <div>
                        <span className="text-gray-500 block">Priority</span>
                        <span className="font-semibold text-gray-900 capitalize">{rec.priority}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Cost</span>
                        <span className="font-semibold text-gray-900">${rec.estimated_cost_usd?.toLocaleString()}</span>
                      </div>
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
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-blue-200 z-[1000]">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium text-gray-700">Analyzing location...</span>
              </div>
            </div>
          )}

          {/* Zoom Warning Overlay */}
          {showInfrastructure && infrastructure.length === 0 && mapStyle !== 'satellite' && (
            <div className="absolute top-20 right-4 bg-amber-50/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-amber-200 z-[1000] max-w-xs">
              <div className="flex items-start gap-2">
                <div>
                  <p className="text-xs font-medium text-amber-800">
                    Zoom in closer to view infrastructure (hospitals, schools, etc.)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Map Style Toggle */}
          <div className="absolute top-4 left-4 z-[1000] flex gap-2">
            <button
              onClick={() => setMapStyle('street')}
              className={`px-4 py-2 rounded-lg font-medium transition-all shadow-lg ${mapStyle === 'street'
                ? 'bg-blue-600 text-white'
                : 'bg-white/95 backdrop-blur-sm text-gray-700 hover:bg-white'
                }`}
            >
              Street
            </button>
            <button
              onClick={() => setMapStyle('satellite')}
              className={`px-4 py-2 rounded-lg font-medium transition-all shadow-lg ${mapStyle === 'satellite'
                ? 'bg-blue-600 text-white'
                : 'bg-white/95 backdrop-blur-sm text-gray-700 hover:bg-white'
                }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setShowInfrastructure(!showInfrastructure)}
              className={`px-4 py-2 rounded-lg font-medium transition-all shadow-lg ${showInfrastructure
                ? 'bg-blue-600 text-white'
                : 'bg-white/95 backdrop-blur-sm text-gray-700 hover:bg-white'
                }`}
            >
              Infrastructure
            </button>
          </div>

          {/* Data Info Badge */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200">
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-semibold">Live Data from API</span>
              </div>
              <div className="text-gray-600">
                {alerts.length} alerts • {predictions.length} predictions
              </div>
            </div>
          </div>
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

// Component to handle map moves
const MapEventsHandler: React.FC<{
  onMoveEnd: (bounds: L.LatLngBounds) => void;
}> = ({ onMoveEnd }) => {
  const map = useMapEvents({
    moveend: () => {
      onMoveEnd(map.getBounds());
    },
    // Trigger initial load
    load: () => {
      onMoveEnd(map.getBounds());
    }
  });

  // Trigger on mount as well if map is ready
  useEffect(() => {
    if (map) {
      onMoveEnd(map.getBounds());
    }
  }, [map, onMoveEnd]);

  return null;
};

export default GISAnalysis;
