import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../i18n/LanguageContext';
import { apiService } from '../services/api';

const Analytics: React.FC = () => {
  const { t } = useLanguage();
  const [timeFilter, setTimeFilter] = useState('monthly');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const weeklyData = [
    { period: 'Week 1', rainfall: 25 }, { period: 'Week 2', rainfall: 32 },
    { period: 'Week 3', rainfall: 28 }, { period: 'Week 4', rainfall: 35 }
  ];

  const monthlyData = [
    { period: 'Jan', rainfall: 45 }, { period: 'Feb', rainfall: 52 }, { period: 'Mar', rainfall: 78 },
    { period: 'Apr', rainfall: 120 }, { period: 'May', rainfall: 165 }, { period: 'Jun', rainfall: 185 },
    { period: 'Jul', rainfall: 195 }, { period: 'Aug', rainfall: 178 }, { period: 'Sep', rainfall: 142 },
    { period: 'Oct', rainfall: 98 }, { period: 'Nov', rainfall: 65 }, { period: 'Dec', rainfall: 48 }
  ];

  const yearlyData = [
    { period: '2019', rainfall: 1250 }, { period: '2020', rainfall: 1380 }, { period: '2021', rainfall: 1420 },
    { period: '2022', rainfall: 1550 }, { period: '2023', rainfall: 1480 }, { period: '2024', rainfall: 1620 }
  ];

  const rainfallData = timeFilter === 'weekly' ? weeklyData : timeFilter === 'monthly' ? monthlyData : yearlyData;

  // Population exposure by all 10 states - dynamic from backend
  const exposureData = allStates.map((state) => {
    const stateAlerts = stats?.alerts_by_state?.[state] || [];
    const highRiskCount = stateAlerts.filter((a: any) => a.severity === 'high' || a.severity === 'critical').length;
    const mediumRiskCount = stateAlerts.filter((a: any) => a.severity === 'medium').length;
    
    return {
      state,
      population: stats?.population_by_state?.[state] || 0,
      risk: highRiskCount > 0 ? 'High' : mediumRiskCount > 0 ? 'Medium' : 'Low'
    };
  });

  const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b'];

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold gradient-text">
                {t('floodAnalytics')}
              </h1>
              <p className="text-gray-600 mt-2">{t('dataDrivenInsights')} - All 10 States of South Sudan</p>
            </div>
          </div>
        </motion.div>
      
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { value: stats?.total_predictions?.toLocaleString() || 'Loading...', label: 'Total Predictions', color: 'from-blue-500 to-cyan-500', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { value: stats?.accuracy_metrics?.overall_accuracy ? `${Math.round(stats.accuracy_metrics.overall_accuracy * 100)}%` : 'Loading...', label: 'Model Accuracy', color: 'from-green-500 to-emerald-500', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { value: stats?.avg_lead_time_hours ? `${stats.avg_lead_time_hours}h` : 'Loading...', label: 'Avg Lead Time', color: 'from-purple-500 to-pink-500', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { value: stats?.accuracy_metrics?.false_alarm_rate ? `${Math.round(stats.accuracy_metrics.false_alarm_rate * 100)}%` : 'Loading...', label: 'False Alarm Rate', color: 'from-orange-500 to-amber-500', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' }
          ].map((metric, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + idx * 0.05 }}
              whileHover={{ scale: 1.02 }}
              className={`stat-card bg-gradient-to-br ${metric.color} text-white`}
            >
              <div className="absolute top-3 right-3 opacity-20">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d={metric.icon} />
                </svg>
              </div>
              <div className="relative">
                <div className="text-3xl font-bold mb-2">{metric.value}</div>
                <p className="text-xs font-semibold opacity-90">{metric.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">States with Flood Predictions</h2>
          </div>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : exposureData.filter(s => s.population > 0).length === 0 ? (
            <div className="text-center py-8 text-gray-500">No active flood predictions</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {exposureData.filter(s => s.population > 0).map((stateData, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + idx * 0.03 }}
                  whileHover={{ scale: 1.03 }}
                  className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all ${
                    stateData.risk === 'High' || stateData.risk === 'Critical' 
                      ? 'bg-red-50 border-red-200' 
                      : stateData.risk === 'Medium'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                  <p className="text-sm font-bold text-gray-900 mb-1">{stateData.state}</p>
                  <p className="text-xs text-gray-600 mb-2">
                    {stateData.population.toLocaleString()} people
                  </p>
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-md ${
                    stateData.risk === 'High' || stateData.risk === 'Critical'
                      ? 'bg-red-600 text-white' 
                      : stateData.risk === 'Medium'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}>
                    {stateData.risk}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-3 mb-6"
        >
          {['weekly', 'monthly', 'yearly'].map((f) => (
            <motion.button
              key={f}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-6 py-3 rounded-lg font-semibold transition-all text-sm ${
                timeFilter === f
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                  : 'bg-white text-gray-700 shadow-sm hover:shadow-md'
              }`}
              onClick={() => setTimeFilter(f)}
            >
              <span className="capitalize">{f}</span>
            </motion.button>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Population at Risk by State
              </h2>
            </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={exposureData.slice(0, 5)}>
              <defs>
                <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="state" stroke="#6b7280" style={{ fontSize: '11px' }} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Bar dataKey="population" fill="url(#barGradient2)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t('rainfallTrends')} ({timeFilter})
              </h2>
            </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={rainfallData}>
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="rainfall" stroke="url(#lineGradient)" strokeWidth={4} name="Rainfall (mm)" dot={{ fill: '#3b82f6', r: 6 }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="glass-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Flood-Prone Areas Map
              </h2>
            </div>
            <div className="relative rounded-xl overflow-hidden shadow-lg">
              <img src="/images/map.jpg" alt="South Sudan Flood-Prone Areas" className="w-full h-auto" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <p className="text-white text-sm font-semibold">South Sudan Flood Risk Zones</p>
              </div>
            </div>
          </motion.div>


        </div>
      </div>
    </div>
  );
};

export default Analytics;
