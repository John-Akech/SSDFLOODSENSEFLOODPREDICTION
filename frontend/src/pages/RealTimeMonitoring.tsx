import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, AreaChart, Area, GaugeChart, Gauge, ComposedChart
} from 'recharts';
import { apiService } from '../services/api';
import '../styles/flood-colors.css';

const RealTimeMonitoring: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [sensors, setSensors] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch real-time data
  const fetchRealTimeData = useCallback(async () => {
    try {
      setLoading(true);
      const [alertData, sensorData, statusData] = await Promise.all([
        apiService.getActiveAlerts(),
        apiService.getFloodStatus(),
        apiService.getSystemStatus()
      ]);
      
      setAlerts(alertData.alerts || []);
      setSensors([
        { id: 1, name: 'Juba River Station', level: 2.3, status: 'normal', lastUpdate: '2 min ago' },
        { id: 2, name: 'Nile River Station', level: 4.1, status: 'warning', lastUpdate: '1 min ago' },
        { id: 3, name: 'Bahr el Ghazal Station', level: 1.8, status: 'normal', lastUpdate: '3 min ago' },
        { id: 4, name: 'Sobat River Station', level: 5.2, status: 'critical', lastUpdate: '1 min ago' },
        { id: 5, name: 'Pibor River Station', level: 3.7, status: 'alert', lastUpdate: '2 min ago' }
      ]);
      setSystemStatus(statusData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRealTimeData();
    const interval = setInterval(fetchRealTimeData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchRealTimeData]);

  // Mock real-time data for visualization
  const waterLevelData = [
    { time: '00:00', level: 2.1, threshold: 4.0, critical: 5.0 },
    { time: '02:00', level: 2.3, threshold: 4.0, critical: 5.0 },
    { time: '04:00', level: 2.8, threshold: 4.0, critical: 5.0 },
    { time: '06:00', level: 3.2, threshold: 4.0, critical: 5.0 },
    { time: '08:00', level: 3.8, threshold: 4.0, critical: 5.0 },
    { time: '10:00', level: 4.2, threshold: 4.0, critical: 5.0 },
    { time: '12:00', level: 4.8, threshold: 4.0, critical: 5.0 },
    { time: '14:00', level: 5.1, threshold: 4.0, critical: 5.0 },
    { time: '16:00', level: 4.9, threshold: 4.0, critical: 5.0 },
    { time: '18:00', level: 4.5, threshold: 4.0, critical: 5.0 },
    { time: '20:00', level: 4.1, threshold: 4.0, critical: 5.0 },
    { time: '22:00', level: 3.7, threshold: 4.0, critical: 5.0 }
  ];

  const alertTrends = [
    { hour: '00:00', alerts: 2, warnings: 1, critical: 0 },
    { hour: '02:00', alerts: 3, warnings: 2, critical: 0 },
    { hour: '04:00', alerts: 4, warnings: 3, critical: 1 },
    { hour: '06:00', alerts: 6, warnings: 4, critical: 1 },
    { hour: '08:00', alerts: 8, warnings: 5, critical: 2 },
    { hour: '10:00', alerts: 12, warnings: 7, critical: 3 },
    { hour: '12:00', alerts: 15, warnings: 9, critical: 4 },
    { hour: '14:00', alerts: 18, warnings: 11, critical: 5 },
    { hour: '16:00', alerts: 16, warnings: 10, critical: 4 },
    { hour: '18:00', alerts: 14, warnings: 8, critical: 3 },
    { hour: '20:00', alerts: 11, warnings: 6, critical: 2 },
    { hour: '22:00', alerts: 8, warnings: 4, critical: 1 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'var(--risk-critical)';
      case 'warning': return 'var(--risk-high)';
      case 'alert': return 'var(--risk-medium)';
      case 'normal': return 'var(--risk-minimal)';
      default: return 'var(--risk-low)';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'critical': return 'Critical';
      case 'warning': return 'Warning';
      case 'alert': return 'Alert';
      case 'normal': return 'Normal';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading real-time monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-flood-title text-4xl font-bold mb-2">
                Real-time Monitoring
              </h1>
              <p className="text-water-subtitle text-lg">
                Live flood monitoring and early warning system
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live Data</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Status Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { 
              title: 'Active Alerts', 
              value: alerts.length, 
              change: '+12%',
              color: 'var(--risk-critical)',
              icon: 'Alert'
            },
            { 
              title: 'Monitoring Stations', 
              value: sensors.length, 
              change: '100%',
              color: 'var(--flood-medium)',
              icon: 'Station'
            },
            { 
              title: 'System Uptime', 
              value: '99.8%', 
              change: '+0.1%',
              color: 'var(--risk-minimal)',
              icon: 'Uptime'
            },
            { 
              title: 'Data Points', 
              value: '2.4K', 
              change: '+156',
              color: 'var(--flood-high)',
              icon: 'Data'
            }
          ].map((metric, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="flood-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: metric.color + '20' }}>
                  <span className="text-2xl font-bold" style={{ color: metric.color }}>{metric.icon.charAt(0)}</span>
                </div>
                <span className={`text-sm font-semibold ${metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-flood-title mb-1">{metric.value}</h3>
              <p className="text-slate-600 text-sm">{metric.title}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Water Level Chart */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flood-card p-6"
            >
              <h3 className="text-flood-title text-xl font-bold mb-6">Water Level Monitoring</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={waterLevelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#64748b"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#64748b"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="level" 
                      stroke="var(--flood-medium)" 
                      fill="var(--flood-medium)"
                      fillOpacity={0.6}
                      name="Water Level (m)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="threshold" 
                      stroke="var(--risk-medium)" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Warning Threshold"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="critical" 
                      stroke="var(--risk-critical)" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Critical Level"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Sensor Status */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flood-card p-6"
            >
              <h3 className="text-flood-title text-xl font-bold mb-6">Sensor Status</h3>
              <div className="space-y-4">
                {sensors.map((sensor, idx) => (
                  <motion.div
                    key={sensor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    className="p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-slate-900 text-sm">{sensor.name}</h4>
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: getStatusColor(sensor.status) }}
                      >
                        {getStatusText(sensor.status)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Level: {sensor.level}m</span>
                      <span className="text-slate-500">{sensor.lastUpdate}</span>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min((sensor.level / 6) * 100, 100)}%`,
                            backgroundColor: getStatusColor(sensor.status)
                          }}
                        ></div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Alert Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flood-card p-6 mb-8"
        >
          <h3 className="text-flood-title text-xl font-bold mb-6">Alert Trends (24 Hours)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={alertTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="hour" 
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#64748b"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="alerts" 
                  fill="var(--risk-medium)" 
                  name="Alerts"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="warnings" 
                  fill="var(--risk-high)" 
                  name="Warnings"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="critical" 
                  fill="var(--risk-critical)" 
                  name="Critical"
                  radius={[2, 2, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Live Alerts Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flood-card p-6"
        >
          <h3 className="text-flood-title text-xl font-bold mb-6">Live Alerts</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Location</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Severity</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Water Level</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Predicted Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No active alerts at this time
                    </td>
                  </tr>
                ) : (
                  alerts.map((alert, idx) => (
                    <motion.tr
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + idx * 0.05 }}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {alert.latitude?.toFixed(4)}, {alert.longitude?.toFixed(4)}
                      </td>
                      <td className="py-3 px-4">
                        <span 
                          className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: getStatusColor(alert.severity) }}
                        >
                          {alert.severity?.charAt(0).toUpperCase() + alert.severity?.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {Math.random() * 5 + 1} m
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {alert.created_at ? new Date(alert.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Unknown'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-slate-600">Active</span>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RealTimeMonitoring;
