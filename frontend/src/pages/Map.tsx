import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Marker, useMapEvents, useMap } from 'react-leaflet';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import { Prediction, Alert } from '../types';
import RiskBadge from '../components/RiskBadge';
import { useLanguage } from '../i18n/LanguageContext';
import { reverseGeocode, forwardGeocode } from '../services/geocoding';
import L from 'leaflet';

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [alertData, predData] = await Promise.all([
          apiService.getActiveAlerts(),
          apiService.getPredictions()
        ]);
        
        const alertList = alertData.alerts || [];
        setAlerts(alertList);
        setExistingPredictions(predData || []);
        
        for (const alert of alertList) {
          const name = await reverseGeocode(alert.latitude, alert.longitude);
          setLocationNames(prev => ({ ...prev, [`alert-${alert.id}`]: name }));
        }
        
        for (const pred of predData || []) {
          const name = await reverseGeocode(pred.latitude, pred.longitude);
          setLocationNames(prev => ({ ...prev, [`pred-${pred.id}`]: name }));
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMapClick = async (lat: number, lng: number) => {
    if (predicting) return;
    
    setPredicting(true);
    try {
      const pred = await apiService.createPrediction({
        latitude: lat,
        longitude: lng,
        model_type: 'ensemble',
        lead_time_hours: 12
      });
      const name = await reverseGeocode(pred.latitude, pred.longitude);
      setLocationNames(prev => ({ ...prev, [`pred-${pred.id}`]: name }));
      setPredictions(p => [...p, pred]);
      
      // Show success notification
      const riskMsg = pred.risk_level === 'critical' ? 'CRITICAL RISK' :
                      pred.risk_level === 'high' ? 'HIGH RISK' :
                      pred.risk_level === 'medium' ? 'MODERATE RISK' : 'LOW RISK';
      alert(`✓ Prediction Complete\n\nLocation: ${name}\nFlood Risk: ${riskMsg} (${(pred.flood_probability * 100).toFixed(1)}%)\nConfidence: ${(pred.confidence_score * 100).toFixed(0)}%`);
    } catch (err: any) {
      console.error('Prediction failed:', err);
      const errorMsg = err?.response?.data?.detail || err?.message || 'Unknown error';
      alert(`Failed to create prediction: ${errorMsg}\n\nPlease check if the backend server is running on port 8000.`);
    } finally {
      setPredicting(false);
    }
  };

  const handleSearchPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPlace.trim() || searching) return;
    
    setSearching(true);
    try {
      const result = await forwardGeocode(searchPlace);
      if (result) {
        setMapCenter([result.lat, result.lon]);
        alert(`Location found: ${result.displayName || searchPlace}\nCoordinates: ${result.lat.toFixed(4)}, ${result.lon.toFixed(4)}`);
        setSearchPlace('');
      } else {
        alert('Location not found in South Sudan. Please check the spelling and try again.');
      }
    } catch (err) {
      console.error('Search failed:', err);
      alert('Failed to search location. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const createCustomIcon = (color: string) => L.divIcon({
    className: 'custom-marker',
    html: `<div style="background: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });

  const getRiskColor = (level: string) => ({
    low: '#22c55e',
    medium: '#eab308',
    high: '#f97316',
    critical: '#dc2626'
  }[level] || '#6b7280');

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold gradient-text">
                Live Flood Risk Map
              </h1>
              <p className="text-gray-600 flex items-center gap-2 mt-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Search by place name or click map to predict flood risk
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSearchPlace} className="mb-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={searchPlace}
                onChange={(e) => setSearchPlace(e.target.value)}
                placeholder="Enter place name (e.g., Juba, Bor, Malakal)..."
                className="flex-1 px-6 py-4 bg-white border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all shadow-sm"
                disabled={searching || predicting}
              />
              <button
                type="submit"
                disabled={searching || predicting || !searchPlace.trim()}
                className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-cyan-500/50 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>
          <div>
            <div className="flex items-center gap-3 mb-4">
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 glass-card p-0 overflow-hidden relative"
            style={{ height: '700px' }}
          >
            {predicting && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[1000] bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-3"
              >
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Predicting flood risk...
              </motion.div>
            )}
          <MapContainer
            center={[7.8627, 29.6949]}
            zoom={7}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <MapClickHandler onMapClick={handleMapClick} />
            <MapController center={mapCenter} zoom={12} />
            
            {/* Current Flood Alerts */}
            {alerts.map(a => (
              <React.Fragment key={`alert-${a.id}`}>
                <Marker
                  position={[a.latitude, a.longitude]}
                  icon={createCustomIcon(getRiskColor(a.severity))}
                >
                  <Popup>
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">ACTIVE</span>
                        <RiskBadge level={a.severity as any} />
                      </div>
                      <p className="font-bold text-sm mb-1">{(locationNames as any)[`alert-${a.id}`] || 'Loading...'}</p>
                      <p className="text-xs text-gray-700 mb-2">{a.message}</p>
                      <p className="text-xs text-gray-500">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  </Popup>
                </Marker>
                <Circle
                  center={[a.latitude, a.longitude]}
                  radius={a.severity === 'critical' ? 12000 : a.severity === 'high' ? 10000 : 8000}
                  pathOptions={{
                    color: getRiskColor(a.severity),
                    fillColor: getRiskColor(a.severity),
                    fillOpacity: 0.2,
                    weight: 3
                  }}
                />
              </React.Fragment>
            ))}

            {/* Existing Predictions from Backend */}
            {existingPredictions.map(p => (
              <React.Fragment key={`existing-${p.id}`}>
                <Marker
                  position={[p.latitude, p.longitude]}
                  icon={createCustomIcon(getRiskColor(p.risk_level))}
                >
                  <Popup>
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">SYSTEM</span>
                        <RiskBadge level={p.risk_level} />
                      </div>
                      <p className="font-bold text-sm mb-1">{locationNames[`pred-${p.id}`] || 'Loading...'}</p>
                      <p className="text-xs text-gray-600 mb-1">Probability: {(p.flood_probability * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-600 mb-1">Confidence: {(p.confidence_score * 100).toFixed(0)}%</p>
                      <p className="text-xs text-gray-600">Model: {p.model_type}</p>
                    </div>
                  </Popup>
                </Marker>
                <Circle
                  center={[p.latitude, p.longitude]}
                  radius={p.risk_level === 'critical' ? 10000 : p.risk_level === 'high' ? 8000 : 6000}
                  pathOptions={{
                    color: getRiskColor(p.risk_level),
                    fillColor: getRiskColor(p.risk_level),
                    fillOpacity: 0.15,
                    weight: 2,
                    dashArray: '3, 3'
                  }}
                />
              </React.Fragment>
            ))}

            {/* User-Created Predictions */}
            {predictions.map(p => (
              <React.Fragment key={`pred-${p.id}`}>
                <Marker
                  position={[p.latitude, p.longitude]}
                  icon={createCustomIcon(getRiskColor(p.risk_level))}
                >
                  <Popup>
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">USER</span>
                        <RiskBadge level={p.risk_level} />
                      </div>
                      <p className="font-bold text-sm mb-1">{locationNames[`pred-${p.id}`] || 'Loading...'}</p>
                      <p className="text-xs text-gray-600 mb-1">Probability: {(p.flood_probability * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-600 mb-1">Confidence: {(p.confidence_score * 100).toFixed(0)}%</p>
                      <p className="text-xs text-gray-600">Model: {p.model_type}</p>
                    </div>
                  </Popup>
                </Marker>
                <Circle
                  center={[p.latitude, p.longitude]}
                  radius={p.risk_level === 'critical' ? 9000 : p.risk_level === 'high' ? 7000 : 5000}
                  pathOptions={{
                    color: getRiskColor(p.risk_level),
                    fillColor: getRiskColor(p.risk_level),
                    fillOpacity: 0.18,
                    weight: 3,
                    dashArray: '5, 5'
                  }}
                />
              </React.Fragment>
            ))}
          </MapContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-6"
          >
            <div className="glass-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Active Alerts</h3>
              </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="relative mx-auto w-16 h-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0"></div>
                </div>
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl animate-float">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-gray-900 mb-1">No Active Alerts</p>
                <p className="text-gray-600">All zones are safe</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {alerts.map((a, idx) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="alert-card border-red-500"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <RiskBadge level={a.severity as any} />
                      <span className="text-xs text-gray-500">{new Date(a.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 flex items-center gap-1 font-semibold">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {(locationNames as any)[`alert-${a.id}`] || 'Loading...'}
                    </p>
                    <p className="text-sm text-gray-900">{a.message}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

            <div className="glass-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Risk Levels</h3>
              </div>
              <div className="space-y-4">
              {[
                { color: '#22c55e', label: 'Low Risk', range: '0-25%' },
                { color: '#eab308', label: 'Medium Risk', range: '25-50%' },
                { color: '#f97316', label: 'High Risk', range: '50-75%' },
                { color: '#dc2626', label: 'Critical Risk', range: '75-100%' }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl shadow-lg animate-float" style={{ backgroundColor: item.color, animationDelay: `${i * 0.5}s` }}></div>
                    <span className="text-sm font-bold text-gray-800">{item.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">{item.range}</span>
                </motion.div>
              ))}
            </div>
          </div>

            <div className="gradient-card animate-glow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
              <div className="relative">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Map Statistics
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                    <span className="font-semibold">Active Alerts:</span>
                    <span className="text-2xl font-bold">{alerts.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                    <span className="font-semibold">Predictions:</span>
                    <span className="text-2xl font-bold">{existingPredictions.length + predictions.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                    <span className="font-semibold">Coverage:</span>
                    <span className="text-2xl font-bold">10 States</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Map;
