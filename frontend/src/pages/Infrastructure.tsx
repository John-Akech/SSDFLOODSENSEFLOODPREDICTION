import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { apiService } from '../services/api';
import { reverseGeocode } from '../services/geocoding';
import RiskBadge from '../components/RiskBadge';
import '../styles/flood-colors.css';

interface InfrastructureItem {
  id: string;
  name: string;
  type: 'hospital' | 'school' | 'bridge' | 'power' | 'water' | 'road';
  latitude: number;
  longitude: number;
  status: 'safe' | 'warning' | 'critical';
  atRisk: boolean;
  population: number;
  notes?: string;
}

// South Sudan critical infrastructure (real locations)
const criticalInfrastructure: InfrastructureItem[] = [
  // Hospitals
  { id: '1', name: 'Juba Teaching Hospital', type: 'hospital', latitude: 4.8475, longitude: 31.5967, status: 'safe', atRisk: false, population: 500 },
  { id: '2', name: 'Malakal Hospital', type: 'hospital', latitude: 9.5333, longitude: 31.6500, status: 'warning', atRisk: true, population: 300 },
  { id: '3', name: 'Bentiu Hospital', type: 'hospital', latitude: 9.2667, longitude: 29.7333, status: 'critical', atRisk: true, population: 200 },

  // Schools
  { id: '4', name: 'University of Juba', type: 'school', latitude: 4.8500, longitude: 31.6000, status: 'safe', atRisk: false, population: 2000 },
  { id: '5', name: 'Malakal Secondary School', type: 'school', latitude: 9.5500, longitude: 31.6800, status: 'warning', atRisk: true, population: 800 },

  // Bridges
  { id: '6', name: 'Juba Bridge (White Nile)', type: 'bridge', latitude: 4.8400, longitude: 31.5900, status: 'safe', atRisk: false, population: 0 },
  { id: '7', name: 'Malakal Nile Bridge', type: 'bridge', latitude: 9.5400, longitude: 31.6600, status: 'critical', atRisk: true, population: 0 },
  { id: '8', name: 'Bentiu Bridge', type: 'bridge', latitude: 9.2700, longitude: 29.7400, status: 'warning', atRisk: true, population: 0 },

  // Power Infrastructure
  { id: '9', name: 'Juba Power Station', type: 'power', latitude: 4.8450, longitude: 31.5850, status: 'warning', atRisk: true, population: 0 },
  { id: '10', name: 'Malakal Power Grid', type: 'power', latitude: 9.5350, longitude: 31.6400, status: 'critical', atRisk: true, population: 0 },

  // Water Infrastructure
  { id: '11', name: 'Juba Water Treatment Plant', type: 'water', latitude: 4.8350, longitude: 31.5750, status: 'safe', atRisk: false, population: 0 },
  { id: '12', name: 'Bentiu Water Facility', type: 'water', latitude: 9.2650, longitude: 29.7300, status: 'critical', atRisk: true, population: 0 },

  // Major Roads
  { id: '13', name: 'Juba-Nimule Road', type: 'road', latitude: 4.8300, longitude: 31.5800, status: 'safe', atRisk: false, population: 0 },
  { id: '14', name: 'Unity-Jonglei Highway', type: 'road', latitude: 8.3667, longitude: 32.3167, status: 'warning', atRisk: true, population: 0 },
];

const Infrastructure: React.FC = () => {
  const [infrastructure, setInfrastructure] = useState<InfrastructureItem[]>(criticalInfrastructure);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedInfrastructure, setSelectedInfrastructure] = useState<InfrastructureItem | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [showAtRiskOnly, setShowAtRiskOnly] = useState(false);

  const [mapCenter] = useState<[number, number]>([7.5, 30.0]);
  const southSudanBounds: [[number, number], [number, number]] = [
    [3.5, 23.5], [12.0, 35.9]
  ];

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const alertData = await apiService.getActiveAlerts();
        setAlerts(alertData.alerts || []);

        // Update infrastructure risk status based on alerts
        const updatedInfrastructure = criticalInfrastructure.map(item => {
          const nearbyAlerts = alertData.alerts.filter((alert: any) => {
            const dist = Math.sqrt(
              Math.pow(alert.latitude - item.latitude, 2) +
              Math.pow(alert.longitude - item.longitude, 2)
            );
            return dist < 0.01; // ~1km radius
          });

          const hasCriticalAlert = nearbyAlerts.some((alert: any) =>
            ['high', 'critical'].includes(alert.severity)
          );

          const atRisk = nearbyAlerts.length > 0;
          const status: 'safe' | 'warning' | 'critical' = hasCriticalAlert ? 'critical' : atRisk ? 'warning' : 'safe';

          return { ...item, status, atRisk, notes: atRisk ? `${nearbyAlerts.length} active alert(s)` : undefined };
        });

        setInfrastructure(updatedInfrastructure);
      } catch (error) {
        console.error('Failed to fetch alerts:', error);
      }
    };

    fetchAlerts();
  }, []);

  const handleMarkerClick = async (item: InfrastructureItem) => {
    setSelectedInfrastructure(item);
    setLoading(true);
    try {
      const name = await reverseGeocode(item.latitude, item.longitude);
      setLocationName(name);
    } catch (error) {
      setLocationName('Location');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return '#10b981'; // green
      case 'warning': return '#f59e0b'; // amber
      case 'critical': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'hospital': return 'H';
      case 'school': return 'S';
      case 'bridge': return 'B';
      case 'power': return 'P';
      case 'water': return 'W';
      case 'road': return 'R';
      default: return 'I';
    }
  };

  const createInfrastructureIcon = (item: InfrastructureItem) => {
    const color = getStatusColor(item.status);
    const emoji = getStatusIcon(item.type);

    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="
        background-color: ${color};
        width: 35px;
        height: 35px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      ">${emoji}</div>`
    });
  };

  const filteredInfrastructure = infrastructure.filter(item => {
    if (filter !== 'all' && item.type !== filter) return false;
    if (showAtRiskOnly && !item.atRisk) return false;
    return true;
  });

  const stats = {
    total: infrastructure.length,
    atRisk: infrastructure.filter(i => i.atRisk).length,
    critical: infrastructure.filter(i => i.status === 'critical').length,
    safe: infrastructure.filter(i => i.status === 'safe').length
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex flex-col pb-16">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <div>
              Critical Infrastructure Monitor
              <p className="text-sm font-normal text-gray-600 mt-1">
                Real-time monitoring of critical infrastructure flood vulnerability
              </p>
            </div>
          </h1>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Panel */}
        <aside className="w-80 bg-white shadow-lg border-r border-gray-200 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Statistics */}
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg p-4 text-white">
              <h2 className="text-lg font-semibold mb-3">Infrastructure Status</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-100">Total Facilities:</span>
                  <span className="font-bold">{stats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">At Risk:</span>
                  <span className="font-bold text-amber-200">{stats.atRisk}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Critical:</span>
                  <span className="font-bold text-red-200">{stats.critical}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Safe:</span>
                  <span className="font-bold text-green-200">{stats.safe}</span>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Filters</h3>

              <div className="mb-3">
                <label className="text-xs text-gray-700 font-medium mb-1 block">Infrastructure Type</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="hospital">Hospitals</option>
                  <option value="school">Schools</option>
                  <option value="bridge">Bridges</option>
                  <option value="power">Power Stations</option>
                  <option value="water">Water Facilities</option>
                  <option value="road">Roads</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAtRiskOnly}
                  onChange={(e) => setShowAtRiskOnly(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-red-600 rounded"
                />
                <span className="text-sm text-gray-700">Show at-risk only</span>
              </label>
            </div>

            {/* Selected Infrastructure Details */}
            {selectedInfrastructure && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4"
              >
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <span>{getStatusIcon(selectedInfrastructure.type)}</span>
                  Infrastructure Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <label className="text-xs text-purple-700 font-medium">Name</label>
                    <p className="text-sm font-semibold text-purple-900">{selectedInfrastructure.name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-purple-700 font-medium">Type</label>
                    <p className="text-sm text-purple-900 capitalize">{selectedInfrastructure.type}</p>
                  </div>
                  <div>
                    <label className="text-xs text-purple-700 font-medium">Location</label>
                    <p className="text-xs font-mono text-purple-700">
                      {locationName || `${selectedInfrastructure.latitude.toFixed(4)}, ${selectedInfrastructure.longitude.toFixed(4)}`}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-purple-700 font-medium">Status</label>
                    <div className="mt-1">
                      {selectedInfrastructure.status === 'safe' && <RiskBadge severity="low" />}
                      {selectedInfrastructure.status === 'warning' && <RiskBadge severity="high" />}
                      {selectedInfrastructure.status === 'critical' && <RiskBadge severity="critical" />}
                    </div>
                  </div>
                  {selectedInfrastructure.population > 0 && (
                    <div>
                      <label className="text-xs text-purple-700 font-medium">Population Affected</label>
                      <p className="text-sm font-semibold text-purple-900">{selectedInfrastructure.population}</p>
                    </div>
                  )}
                  {selectedInfrastructure.notes && (
                    <div>
                      <label className="text-xs text-purple-700 font-medium">Notes</label>
                      <p className="text-xs text-purple-900">{selectedInfrastructure.notes}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Infrastructure List */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">
                All Facilities ({filteredInfrastructure.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredInfrastructure.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleMarkerClick(item)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedInfrastructure?.id === item.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 bg-white'
                      }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-2xl">{getStatusIcon(item.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-600 capitalize">{item.type}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {item.status === 'safe' && <RiskBadge severity="low" />}
                          {item.status === 'warning' && <RiskBadge severity="high" />}
                          {item.status === 'critical' && <RiskBadge severity="critical" />}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

            {/* Alert Zones */}
            {alerts.map((alert) => (
              <Circle
                key={alert.id}
                center={[alert.latitude, alert.longitude]}
                radius={3000}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.1,
                  weight: 2,
                  dashArray: '10, 5'
                }}
              >
                <Popup>
                  <div className="p-2">
                    <p className="text-sm font-semibold text-gray-800">Flood Alert Zone</p>
                    <p className="text-xs text-gray-600">{alert.message}</p>
                  </div>
                </Popup>
              </Circle>
            ))}

            {/* Infrastructure Markers */}
            {filteredInfrastructure.map((item) => (
              <Marker
                key={item.id}
                position={[item.latitude, item.longitude]}
                icon={createInfrastructureIcon(item)}
                eventHandlers={{
                  click: () => handleMarkerClick(item)
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getStatusIcon(item.type)}</span>
                      <div>
                        <p className="font-semibold text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-600 capitalize">{item.type}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      {item.status === 'safe' && <RiskBadge severity="low" />}
                      {item.status === 'warning' && <RiskBadge severity="high" />}
                      {item.status === 'critical' && <RiskBadge severity="critical" />}
                      {item.atRisk && (
                        <p className="text-red-600 font-medium flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          At Risk
                        </p>
                      )}
                      {item.population > 0 && (
                        <p className="text-gray-600 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {item.population} people
                        </p>
                      )}
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

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200 max-w-xs">
            <h3 className="font-semibold text-gray-800 mb-2">Legend</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
                <span className="text-gray-700">Safe</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white"></div>
                <span className="text-gray-700">Warning</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white"></div>
                <span className="text-gray-700">Critical</span>
              </div>
              <div className="pt-2 border-t border-gray-200 space-y-1">
                <p className="text-gray-600 flex items-center gap-1">
                  <span className="font-semibold">H</span> Hospital
                  <span className="font-semibold ml-2">S</span> School
                  <span className="font-semibold ml-2">B</span> Bridge
                </p>
                <p className="text-gray-600 flex items-center gap-1">
                  <span className="font-semibold">P</span> Power
                  <span className="font-semibold ml-2">W</span> Water
                  <span className="font-semibold ml-2">R</span> Road
                </p>
              </div>
            </div>
          </div>

          {loading && (
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-700">Loading...</span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Infrastructure;

