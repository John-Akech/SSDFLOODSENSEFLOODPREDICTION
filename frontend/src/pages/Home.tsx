import React, { useEffect, useState } from 'react';
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
  const [stats, setStats] = useState({ total: 0, high: 0, zones: 0 });
  const [loading, setLoading] = useState(true);
  const [locationNames, setLocationNames] = useState<Record<number, string>>({});
  const [populationByState, setPopulationByState] = useState<Record<string, number>>({});
  const { t } = useLanguage();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [alertData, systemStats] = await Promise.all([
          apiService.getActiveAlerts(),
          apiService.getSystemStats()
        ]);
        
        const alertList = alertData.alerts || [];
        setAlerts(alertList);
        setPopulationByState(systemStats.population_by_state || {});
        
        const uniqueZones = new Set(alertList.map((a: Alert) => 
          `${Math.floor(a.latitude)},${Math.floor(a.longitude)}`
        ));
        
        setStats({
          total: alertList.length,
          high: alertList.filter((a: Alert) => a.severity === 'high' || a.severity === 'critical').length,
          zones: uniqueZones.size
        });
        
        alertList.forEach(async (alert: Alert) => {
          const name = await reverseGeocode(alert.latitude, alert.longitude);
          setLocationNames(prev => ({ ...prev, [alert.id]: name }));
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

  const getFloodLevelColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'var(--flood-critical)';
      case 'high': return 'var(--flood-high)';
      case 'medium': return 'var(--flood-medium)';
      case 'low': return 'var(--flood-low)';
      default: return 'var(--flood-minimal)';
    }
  };

  const getRiskLevelColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'var(--risk-critical)';
      case 'high': return 'var(--risk-high)';
      case 'medium': return 'var(--risk-medium)';
      case 'low': return 'var(--risk-low)';
      default: return 'var(--risk-minimal)';
    }
  };

  const getSeverityGradient = (severity: string) => {
    switch (severity) {
      case 'critical': return 'flood-gradient-critical';
      case 'high': return 'flood-gradient-high';
      case 'medium': return 'flood-gradient-medium';
      case 'low': return 'flood-gradient-low';
      default: return 'flood-gradient-minimal';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-flood-title text-4xl font-bold mb-2">
            Flood Monitoring Dashboard
          </h1>
          <p className="text-water-subtitle text-lg">
            Real-time flood detection and risk assessment across South Sudan
          </p>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { 
              label: 'Priority Zones', 
              value: stats.zones, 
              gradient: 'from-blue-500 to-blue-600',
              icon: 'Location',
              desc: 'Monitored areas',
              delay: 0 
            },
            { 
              label: t('activeAlerts'), 
              value: stats.total, 
              gradient: 'from-red-500 to-red-600',
              icon: 'Alert',
              desc: 'Current alerts',
              delay: 0.1 
            },
            { 
              label: t('highRiskAreas'), 
              value: stats.high, 
              gradient: 'from-yellow-500 to-yellow-600',
              icon: 'Warning',
              desc: 'High risk zones',
              delay: 0.2 
            }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: stat.delay }}
              className="flood-card p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-flood-title">{stat.value}</p>
                  <p className="text-slate-500 text-xs mt-1">{stat.desc}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${stat.gradient} flex items-center justify-center`}>
                  <span className="text-white text-xl font-bold">{stat.icon.charAt(0)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Alerts List */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flood-card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-flood-title text-xl font-bold">Active Flood Alerts</h2>
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
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {alerts.map((alert, idx) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`p-4 rounded-lg border-l-4 ${
                        alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                        alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                        alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                        'border-blue-500 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <RiskBadge severity={alert.severity} />
                            <span className="text-sm text-slate-600">
                              {locationNames[alert.id] || `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`}
                            </span>
                          </div>
                          <p className="text-slate-700 font-medium mb-1">
                            {alert.severity === 'critical' ? 'Critical Flood Risk' :
                             alert.severity === 'high' ? 'High Flood Risk' :
                             alert.severity === 'medium' ? 'Medium Flood Risk' :
                             'Low Flood Risk'}
                          </p>
                          <p className="text-sm text-slate-600">
                            Predicted: {new Date(alert.predicted_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`w-4 h-4 rounded-full ${
                            alert.severity === 'critical' ? 'bg-red-500' :
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
          <div className="space-y-6">
            {/* Severity Distribution */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flood-card p-6"
            >
              <h3 className="text-flood-title text-lg font-bold mb-4">Risk Distribution</h3>
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
                      {pieData.map((entry, index) => (
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
              className="flood-card p-6"
            >
              <h3 className="text-flood-title text-lg font-bold mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Total Population at Risk</span>
                  <span className="font-semibold text-flood-title">
                    {Object.values(populationByState).reduce((sum, pop) => sum + (pop || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">States Monitored</span>
                  <span className="font-semibold text-flood-title">
                    {Object.keys(populationByState).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Last Update</span>
                  <span className="font-semibold text-flood-title">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Risk Levels Legend */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="flood-card p-6"
            >
              <h3 className="text-flood-title text-lg font-bold mb-4">Risk Levels</h3>
              <div className="space-y-3">
                {[
                  { level: 'Critical', color: 'var(--risk-critical)', desc: 'Immediate evacuation required' },
                  { level: 'High', color: 'var(--risk-high)', desc: 'Prepare for evacuation' },
                  { level: 'Medium', color: 'var(--risk-medium)', desc: 'Monitor closely' },
                  { level: 'Low', color: 'var(--risk-low)', desc: 'Stay alert' },
                  { level: 'Minimal', color: 'var(--risk-minimal)', desc: 'Normal conditions' }
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
            </motion.div>
          </div>
        </div>

        {/* Charts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Severity Chart */}
          <div className="flood-card p-6">
            <h3 className="text-flood-title text-lg font-bold mb-4">Alert Severity Distribution</h3>
            <div className="h-80">
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
          <div className="flood-card p-6">
            <h3 className="text-flood-title text-lg font-bold mb-4">Population at Risk by State</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={Object.entries(populationByState).map(([state, pop]) => ({
                  state: state.split(' ')[0], // Shorten state names
                  population: pop || 0
                }))}>
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
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
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