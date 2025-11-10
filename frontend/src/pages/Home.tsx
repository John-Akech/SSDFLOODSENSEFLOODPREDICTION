import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { Alert } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { useLanguage } from '../i18n/LanguageContext';
import { reverseGeocode } from '../services/geocoding';
import '../styles/flood-colors.css';

const Home: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    high: 0,
    zones: 0,
    predictions: 0,
    population: 0,
    accuracy: 0
  });
  const [loading, setLoading] = useState(true);
  const [locationNames, setLocationNames] = useState<Record<string, string>>({});
  const [populationByState, setPopulationByState] = useState<Record<string, number>>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { t: _ } = useLanguage();
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [alertData, predData, systemStats] = await Promise.all([
        apiService.getActiveAlerts(),
        apiService.getPredictions(),
        apiService.getSystemStats()
      ]);

      const alertList = alertData.alerts || [];
      const predList = predData.predictions || [];

      setAlerts(alertList);
      setPopulationByState(systemStats.population_by_state || {});

      // Calculate high risk areas
      const highRiskCount = alertList.filter((a: Alert) =>
        a.severity === 'high' || a.severity === 'critical'
      ).length;

      // Calculate total population at risk
      const totalPopulation = Object.values(systemStats.population_by_state || {}).reduce<number>(
        (sum, pop) => sum + ((pop as number) || 0), 0
      );

      // Get accuracy from system stats or calculate from predictions
      const accuracyFromStats = systemStats?.accuracy_metrics?.overall_accuracy || 0;
      const accuracy = accuracyFromStats > 0 ? Math.round(accuracyFromStats * 100) : 0;

      // Calculate zones from unique coordinate pairs (rounded to 1 decimal place)
      const uniqueZones = new Set(alertList.map((a: Alert) =>
        `${Math.floor(a.latitude * 10) / 10},${Math.floor(a.longitude * 10) / 10}`
      ));

      setStats({
        total: alertList.length,
        high: highRiskCount,
        zones: uniqueZones.size,
        predictions: predList.length,
        population: totalPopulation,
        accuracy: accuracy
      });

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
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch data:', error);
      // Set fallback data
      setStats(prev => ({ ...prev, lastUpdate: new Date() }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  const getFloodLevelColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'var(--flood-critical)';
      case 'high': return 'var(--flood-high)';
      case 'medium': return 'var(--flood-medium)';
      case 'low': return 'var(--flood-low)';
      default: return 'var(--flood-minimal)';
    }
  };

  // Prepare chart data
  const severityData = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(severityData).map(([severity, count]) => ({
    severity: severity.charAt(0).toUpperCase() + severity.slice(1),
    count,
    color: getFloodLevelColor(severity)
  }));

  const pieData = Object.entries(severityData).map(([severity, count]) => ({
    name: severity.charAt(0).toUpperCase() + severity.slice(1),
    value: count,
    color: getFloodLevelColor(severity)
  }));

  const COLORS = pieData.map(item => item.color);

  // State population data for charts
  const stateChartData = Object.entries(populationByState).map(([state, pop]) => ({
    state: state.split(' ')[0], // Shorten for display
    fullName: state,
    population: pop || 0,
    alerts: alerts.filter(a =>
      locationNames[`${a.latitude},${a.longitude}`]?.includes(state.split(' ')[0])
    ).length
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading flood monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 sm:mb-12 lg:mb-16"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 text-slate-900">
                <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 bg-clip-text text-transparent">
                  Flood Monitoring Dashboard
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Real-time flood detection and risk assessment across South Sudan
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center sm:justify-end space-x-2 text-sm text-slate-600 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Live Updates</span>
              </div>
              <p className="text-xs text-slate-500 text-center sm:text-right">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics - Responsive grid with proper spacing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12 mb-10 sm:mb-12 lg:mb-16">
          {[
            {
              label: 'Priority Zones',
              value: stats.zones,
              gradient: 'from-blue-600 to-cyan-600',
              icon: 'Location',
              desc: 'Monitored areas',
              delay: 0
            },
            {
              label: 'Active Alerts',
              value: stats.total,
              gradient: 'from-blue-700 to-blue-800',
              icon: 'Alert',
              desc: 'Current alerts',
              delay: 0.1
            },
            {
              label: 'High Risk Areas',
              value: stats.high,
              gradient: 'from-amber-500 to-orange-600',
              icon: 'Warning',
              desc: 'High risk zones',
              delay: 0.2
            },
            {
              label: 'Model Accuracy',
              value: `${stats.accuracy.toFixed(1)}%`,
              gradient: 'from-teal-500 to-cyan-600',
              icon: 'Target',
              desc: 'Prediction accuracy',
              delay: 0.3
            }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: stat.delay }}
              className="flood-card p-7 sm:p-9 lg:p-10"
            >
              <div className="flex flex-col gap-6 sm:gap-7">
                <div className="flex items-start justify-between gap-5 sm:gap-6">
                  <div className="flex-1 min-w-0 pr-3 sm:pr-4">
                    <p className="text-slate-600 text-xs sm:text-sm font-medium mb-4 sm:mb-5">{stat.label}</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 leading-tight">{stat.value}</p>
                  </div>
                </div>
                <p className="text-slate-500 text-xs sm:text-sm mt-2 sm:mt-3">{stat.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid - Responsive with proper overflow handling */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12 mb-10 sm:mb-12 lg:mb-16">
          {/* Alerts List */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flood-card p-7 sm:p-9 lg:p-10"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 sm:gap-8 mb-8 sm:mb-10">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Active Flood Alerts</h2>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-600">Live Updates</span>
                </div>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Active Alerts</h3>
                  <p className="text-slate-500">All monitored areas are currently safe from flooding.</p>
                </div>
              ) : (
                <div className="space-y-5 sm:space-y-6 max-h-[32rem] sm:max-h-96 overflow-y-auto overflow-x-hidden pr-4">
                  {alerts.map((alert, idx) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`p-6 sm:p-7 rounded-xl border-l-4 transition-all duration-200 hover:shadow-md mb-3 ${alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                        alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                          alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                            'border-blue-500 bg-blue-50'
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <RiskBadge severity={alert.severity as 'low' | 'medium' | 'high' | 'critical'} />
                            <span className="text-sm text-slate-600">
                              {locationNames[`${alert.latitude},${alert.longitude}`] ||
                                `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`}
                            </span>
                          </div>
                          <p className="text-slate-700 font-medium mb-1">
                            {alert.severity === 'critical' ? 'Critical Flood Risk' :
                              alert.severity === 'high' ? 'High Flood Risk' :
                                alert.severity === 'medium' ? 'Medium Flood Risk' :
                                  'Low Flood Risk'}
                          </p>
                          <p className="text-sm text-slate-600">
                            Created: {alert.created_at ? new Date(alert.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`w-4 h-4 rounded-full ${alert.severity === 'critical' ? 'bg-red-500' :
                            alert.severity === 'high' ? 'bg-orange-500' :
                              alert.severity === 'medium' ? 'bg-yellow-500' :
                                'bg-blue-500'
                            }`}></div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Analytics Sidebar */}
          <div className="space-y-8 sm:space-y-10">
            {/* Severity Distribution */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flood-card p-7 sm:p-9"
            >
              <h3 className="text-lg sm:text-xl font-bold mb-8 sm:mb-9 text-slate-900">Risk Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [value, name]}
                      labelStyle={{ color: '#1e40af' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="flood-card p-8 sm:p-10"
            >
              <h3 className="text-xl sm:text-2xl font-bold mb-8 text-slate-900">Quick Stats</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Total Population at Risk</span>
                  <span className="font-semibold text-slate-900">
                    {stats.population.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">States Monitored</span>
                  <span className="font-semibold text-slate-900">
                    {Object.keys(populationByState).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Total Predictions</span>
                  <span className="font-semibold text-slate-900">
                    {stats.predictions}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Last Update</span>
                  <span className="font-semibold text-slate-900">
                    {lastUpdate.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Risk Levels Legend */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="flood-card p-8 sm:p-10"
            >
              <h3 className="text-xl sm:text-2xl font-bold mb-8 text-slate-900">Risk Levels</h3>
              <div className="space-y-5">
                {[
                  { level: 'Critical', color: 'var(--risk-critical)', desc: 'Immediate evacuation required' },
                  { level: 'High', color: 'var(--risk-high)', desc: 'Prepare for evacuation' },
                  { level: 'Medium', color: 'var(--risk-medium)', desc: 'Monitor closely' },
                  { level: 'Low', color: 'var(--risk-low)', desc: 'Stay alert' },
                  { level: 'Minimal', color: 'var(--risk-minimal)', desc: 'Normal conditions' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-5">
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-slate-700 block mb-2">{item.level}</span>
                      <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Charts Section - Responsive grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-10 sm:mt-12 lg:mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 w-full overflow-x-hidden"
        >
          {/* Severity Chart */}
          <div className="flood-card p-7 sm:p-9 lg:p-10 overflow-x-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-8 sm:mb-9 text-slate-900">Alert Severity Distribution</h3>
            <div className="h-64 sm:h-80 min-w-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="severity"
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
                    labelStyle={{ color: '#1e40af', fontWeight: '600' }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[4, 4, 0, 0]}
                    fill="#3b82f6"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* State Population Chart */}
          <div className="flood-card p-7 sm:p-9 lg:p-10 overflow-x-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-8 sm:mb-9 text-slate-900">Population at Risk by State</h3>
            <div className="h-64 sm:h-80 min-w-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stateChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="state"
                    stroke="#64748b"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value) => [value.toLocaleString(), 'Population']}
                    contentStyle={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    labelStyle={{ color: '#1e40af', fontWeight: '600' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="population"
                    stroke="#3b82f6"
                    fill="url(#colorGradient)"
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;