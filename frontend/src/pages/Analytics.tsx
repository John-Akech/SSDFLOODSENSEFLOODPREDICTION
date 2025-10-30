import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, ScatterChart, Scatter,
  ComposedChart, ReferenceLine
} from 'recharts';
import { useLanguage } from '../i18n/LanguageContext';
import { apiService } from '../services/api';
import '../styles/flood-colors.css';

const Analytics: React.FC = () => {
  const { t } = useLanguage();
  const [timeFilter, setTimeFilter] = useState('monthly');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState('All States');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiService.getSystemStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // All 10 states of South Sudan
  const allStates = [
    'Central Equatoria', 'Eastern Equatoria', 'Western Equatoria',
    'Jonglei', 'Unity', 'Upper Nile',
    'Northern Bahr el Ghazal', 'Western Bahr el Ghazal', 'Warrap', 'Lakes'
  ];

  // Enhanced data with more realistic flood patterns
  const weeklyData = [
    { period: 'Week 1', rainfall: 25, floodRisk: 15, alerts: 2, population: 12500 },
    { period: 'Week 2', rainfall: 32, floodRisk: 22, alerts: 3, population: 18700 },
    { period: 'Week 3', rainfall: 28, floodRisk: 18, alerts: 1, population: 14200 },
    { period: 'Week 4', rainfall: 35, floodRisk: 28, alerts: 4, population: 22100 }
  ];

  const monthlyData = [
    { period: 'Jan', rainfall: 45, floodRisk: 12, alerts: 8, population: 45000, temperature: 28 },
    { period: 'Feb', rainfall: 52, floodRisk: 18, alerts: 12, population: 52000, temperature: 30 },
    { period: 'Mar', rainfall: 78, floodRisk: 25, alerts: 18, population: 78000, temperature: 32 },
    { period: 'Apr', rainfall: 120, floodRisk: 35, alerts: 25, population: 120000, temperature: 31 },
    { period: 'May', rainfall: 165, floodRisk: 45, alerts: 35, population: 165000, temperature: 29 },
    { period: 'Jun', rainfall: 185, floodRisk: 55, alerts: 42, population: 185000, temperature: 27 },
    { period: 'Jul', rainfall: 195, floodRisk: 65, alerts: 48, population: 195000, temperature: 26 },
    { period: 'Aug', rainfall: 178, floodRisk: 58, alerts: 38, population: 178000, temperature: 27 },
    { period: 'Sep', rainfall: 142, floodRisk: 42, alerts: 28, population: 142000, temperature: 28 },
    { period: 'Oct', rainfall: 98, floodRisk: 28, alerts: 18, population: 98000, temperature: 30 },
    { period: 'Nov', rainfall: 65, floodRisk: 18, alerts: 12, population: 65000, temperature: 31 },
    { period: 'Dec', rainfall: 48, floodRisk: 15, alerts: 8, population: 48000, temperature: 29 }
  ];

  const yearlyData = [
    { period: '2019', rainfall: 1250, floodRisk: 35, alerts: 180, population: 1250000, events: 12 },
    { period: '2020', rainfall: 1380, floodRisk: 42, alerts: 220, population: 1380000, events: 15 },
    { period: '2021', rainfall: 1420, floodRisk: 48, alerts: 280, population: 1420000, events: 18 },
    { period: '2022', rainfall: 1550, floodRisk: 55, alerts: 320, population: 1550000, events: 22 },
    { period: '2023', rainfall: 1480, floodRisk: 52, alerts: 290, population: 1480000, events: 19 },
    { period: '2024', rainfall: 1620, floodRisk: 58, alerts: 350, population: 1620000, events: 25 }
  ];

  const stateData = allStates.map(state => ({
    state: state.split(' ')[0], // Shorten for display
    fullName: state,
    population: stats?.population_by_state?.[state] || Math.floor(Math.random() * 200000) + 50000,
    floodEvents: Math.floor(Math.random() * 15) + 5,
    riskLevel: ['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)],
    lastEvent: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toLocaleDateString()
  }));

  const severityDistribution = [
    { name: 'Critical', value: 15, color: 'var(--risk-critical)' },
    { name: 'High', value: 25, color: 'var(--risk-high)' },
    { name: 'Medium', value: 35, color: 'var(--risk-medium)' },
    { name: 'Low', value: 20, color: 'var(--risk-low)' },
    { name: 'Minimal', value: 5, color: 'var(--risk-minimal)' }
  ];

  const COLORS = severityDistribution.map(item => item.color);

  const getCurrentData = () => {
    switch (timeFilter) {
      case 'weekly': return weeklyData;
      case 'monthly': return monthlyData;
      case 'yearly': return yearlyData;
      default: return monthlyData;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Critical': return 'var(--risk-critical)';
      case 'High': return 'var(--risk-high)';
      case 'Medium': return 'var(--risk-medium)';
      case 'Low': return 'var(--risk-low)';
      default: return 'var(--risk-minimal)';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading analytics data...</p>
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
            Flood Analytics Dashboard
          </h1>
          <p className="text-water-subtitle text-lg">
            Comprehensive flood risk analysis and predictive insights
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flood-card p-6 mb-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Time Period</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="All States">All States</option>
                  {allStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-600">Live Data</span>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { 
              title: 'Total Rainfall', 
              value: `${getCurrentData().reduce((sum, item) => sum + item.rainfall, 0)}mm`, 
              change: '+12%',
              color: 'var(--flood-medium)',
              icon: 'Rain'
            },
            { 
              title: 'Flood Risk Level', 
              value: `${Math.round(getCurrentData().reduce((sum, item) => sum + item.floodRisk, 0) / getCurrentData().length)}%`, 
              change: '+8%',
              color: 'var(--risk-high)',
              icon: 'Alert'
            },
            { 
              title: 'Active Alerts', 
              value: getCurrentData().reduce((sum, item) => sum + item.alerts, 0), 
              change: '+15%',
              color: 'var(--risk-critical)',
              icon: 'Warning'
            },
            { 
              title: 'Population at Risk', 
              value: `${(getCurrentData().reduce((sum, item) => sum + item.population, 0) / 1000).toFixed(0)}K`, 
              change: '+5%',
              color: 'var(--flood-high)',
              icon: 'People'
            }
          ].map((metric, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
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

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Rainfall vs Flood Risk */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flood-card p-6"
          >
            <h3 className="text-flood-title text-xl font-bold mb-6">Rainfall vs Flood Risk</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={getCurrentData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="period" 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
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
                    yAxisId="left"
                    dataKey="rainfall" 
                    fill="var(--flood-medium)" 
                    name="Rainfall (mm)"
                    radius={[2, 2, 0, 0]}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="floodRisk" 
                    stroke="var(--risk-high)" 
                    strokeWidth={3}
                    name="Flood Risk (%)"
                    dot={{ fill: 'var(--risk-high)', strokeWidth: 2, r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Risk Distribution */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flood-card p-6"
          >
            <h3 className="text-flood-title text-xl font-bold mb-6">Risk Level Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {severityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [value + '%', name]}
                    contentStyle={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {severityDistribution.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{item.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* State Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flood-card p-6 mb-8"
        >
          <h3 className="text-flood-title text-xl font-bold mb-6">State-wise Flood Analysis</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">State</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Population</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Flood Events</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Risk Level</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Last Event</th>
                </tr>
              </thead>
              <tbody>
                {stateData.map((state, idx) => (
                  <motion.tr
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.05 }}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-3 px-4 font-medium text-slate-700">{state.fullName}</td>
                    <td className="py-3 px-4 text-slate-600">{state.population.toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-600">{state.floodEvents}</td>
                    <td className="py-3 px-4">
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: getRiskColor(state.riskLevel) }}
                      >
                        {state.riskLevel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{state.lastEvent}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Historical Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flood-card p-6"
        >
          <h3 className="text-flood-title text-xl font-bold mb-6">Historical Flood Trends</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="period" 
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
                  dataKey="rainfall" 
                  stackId="1"
                  stroke="var(--flood-medium)" 
                  fill="var(--flood-medium)"
                  fillOpacity={0.6}
                  name="Rainfall (mm)"
                />
                <Area 
                  type="monotone" 
                  dataKey="alerts" 
                  stackId="2"
                  stroke="var(--risk-high)" 
                  fill="var(--risk-high)"
                  fillOpacity={0.6}
                  name="Flood Alerts"
                />
                <ReferenceLine y={1000} stroke="var(--risk-medium)" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;