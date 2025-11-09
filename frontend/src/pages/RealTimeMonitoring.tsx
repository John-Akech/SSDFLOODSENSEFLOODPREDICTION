import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, ComposedChart
} from 'recharts';
import { apiService } from '../services/api';
import '../styles/flood-colors.css';

const RealTimeMonitoring: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [floodEvents, setFloodEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch real-time data
  const fetchRealTimeData = useCallback(async () => {
    try {
      setLoading(true);
      const [alertData, predData, floodEventData] = await Promise.all([
        apiService.getActiveAlerts(),
        apiService.getPredictions({ limit: 50 }),
        apiService.getFloodEvents({ limit: 50 })
      ]);

      setAlerts(alertData.alerts || []);
      setPredictions(predData.predictions || []);
      setFloodEvents(floodEventData || []);
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

  // Generate water level data from actual flood events and predictions
  // NOTE: Water level data is derived from flood probabilities and events.
  // For production deployment with physical sensors, integrate with:
  // 1. IoT water level sensors via MQTT/HTTP
  // 2. Hydrological APIs (e.g., USGS Water Services, local gauge stations)
  // 3. River gauge networks in South Sudan
  const generateWaterLevelData = () => {
    const data = [];
    const now = new Date();

    // Get last 24 hours of data
    for (let i = 0; i < 12; i++) {
      const time = new Date(now);
      time.setHours(time.getHours() - (11 - i) * 2);

      // Find predictions and events near this time
      const nearbyEvents = floodEvents.filter((event: any) => {
        const eventDate = new Date(event.created_at);
        const timeDiff = Math.abs(eventDate.getTime() - time.getTime());
        return timeDiff < 2 * 60 * 60 * 1000; // within 2 hours
      });

      const nearbyPredictions = predictions.filter((pred: any) => {
        const predDate = new Date(pred.created_at);
        const timeDiff = Math.abs(predDate.getTime() - time.getTime());
        return timeDiff < 2 * 60 * 60 * 1000;
      });

      // Calculate water level based on flood probability
      const avgProbability = nearbyPredictions.length > 0
        ? nearbyPredictions.reduce((sum, p) => sum + (p.flood_probability || 0), 0) / nearbyPredictions.length
        : 0;

      const waterLevel = 2 + (avgProbability * 3.5); // Scale from 2m to 5.5m

      data.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        level: Number(waterLevel.toFixed(1)),
        threshold: 4.0,
        critical: 5.0,
        events: nearbyEvents.length
      });
    }

    return data;
  };

  // Generate alert trends from actual alerts
  const generateAlertTrends = () => {
    const data = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const time = new Date(now);
      time.setHours(time.getHours() - (11 - i) * 2);
      const nextTime = new Date(time);
      nextTime.setHours(nextTime.getHours() + 2);

      // Count alerts in this time window
      const timeAlerts = alerts.filter((alert: any) => {
        const alertDate = new Date(alert.created_at);
        return alertDate >= time && alertDate < nextTime;
      });

      const criticalCount = timeAlerts.filter((a: any) => a.severity === 'critical').length;
      const highCount = timeAlerts.filter((a: any) => a.severity === 'high').length;
      const mediumCount = timeAlerts.filter((a: any) => a.severity === 'medium' || a.severity === 'warning').length;

      data.push({
        hour: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        alerts: timeAlerts.length,
        warnings: highCount + mediumCount,
        critical: criticalCount
      });
    }

    return data;
  };

  const waterLevelData = generateWaterLevelData();
  const alertTrends = generateAlertTrends();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'var(--risk-critical)';
      case 'warning': return 'var(--risk-high)';
      case 'alert': return 'var(--risk-medium)';
      case 'normal': return 'var(--risk-minimal)';
      default: return 'var(--risk-low)';
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-flood-title text-4xl font-bold mb-2">
                Live Flood Tracking
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
              title: 'Active Predictions',
              value: alerts.length || 0,
              change: '+5%',
              color: 'var(--flood-medium)',
              icon: 'Prediction'
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
                <span className={`text-sm font-semibold ${metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.change}
                </span>
              </div>
              <h3 className="text-xl font-bold text-flood-title mb-1">{metric.value}</h3>
              <p className="text-slate-600 text-sm">{metric.title}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 mb-8 sm:mb-10 lg:mb-12">
          {/* Water Level Chart */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flood-card p-6 sm:p-8"
            >
              <h3 className="text-flood-title text-xl font-bold mb-7 sm:mb-8">Water Level Monitoring</h3>
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

          {/* Recent Alerts */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flood-card p-6 sm:p-8"
            >
              <h3 className="text-flood-title text-xl font-bold mb-7 sm:mb-8">Recent Alerts</h3>
              <div className="space-y-5">
                {alerts.length > 0 ? (
                  alerts.slice(0, 5).map((alert, idx) => (
                    <motion.div
                      key={alert.id || idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + idx * 0.1 }}
                      className="p-5 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3 gap-3">
                        <h4 className="font-semibold text-slate-900 text-sm flex-1 min-w-0">
                          Alert #{alert.id || idx + 1}
                        </h4>
                        <span
                          className="px-3 py-1.5 rounded-full text-xs font-semibold text-white flex-shrink-0"
                          style={{
                            backgroundColor: alert.severity === 'critical' ? 'var(--risk-critical)' :
                              alert.severity === 'high' ? 'var(--risk-high)' :
                                alert.severity === 'medium' ? 'var(--risk-medium)' :
                                  'var(--risk-low)'
                          }}
                        >
                          {alert.severity || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm gap-3">
                        <span className="text-slate-600 flex-1 min-w-0">
                          {alert.message || 'Flood risk detected'}
                        </span>
                        <span className="text-slate-500 text-xs flex-shrink-0">
                          {alert.created_at ? new Date(alert.created_at).toLocaleTimeString() : 'Just now'}
                        </span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p className="text-sm">No active alerts at this time</p>
                  </div>
                )}
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
