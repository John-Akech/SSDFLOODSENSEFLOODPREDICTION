import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
  ComposedChart
} from 'recharts';
import { useLanguage } from '../i18n/LanguageContext';
import { apiService } from '../services/api';
import { useSystemAccuracy } from '../hooks/useSystemAccuracy';
import '../styles/flood-colors.css';

const Analytics: React.FC = () => {
  const { t, language } = useLanguage();
  const [timeFilter, setTimeFilter] = useState('monthly');
  const [stats, setStats] = useState<any>(null);
  const [stateStats, setStateStats] = useState<any>({});
  const [modelWindow, setModelWindow] = useState<number>(300);
  const [liveModels, setLiveModels] = useState<any>({});
  const [liveModelsTimestamp, setLiveModelsTimestamp] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allStates, setAllStates] = useState<string[]>([]);
  const { accuracyLabel, isLoading: accuracyLoading } = useSystemAccuracy({ refreshIntervalMs: 60000 });

  // Fetch all data with auto-refresh
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [systemStats, alertData, predData, stateData] = await Promise.all([
          apiService.getSystemStats(),
          apiService.getActiveAlerts(),
          apiService.getPredictions(),
          apiService.getStateStats()
        ]);

        setStats(systemStats);
        setAlerts(alertData.alerts || []);
        setPredictions(predData.predictions || []);
        setStateStats(stateData || {});

        // Extract unique states/regions from data
        const statesFromData = new Set<string>();

        // Get states from predictions
        (predData.predictions || []).forEach((p: any) => {
          if (p.region) statesFromData.add(p.region);
          if (p.state) statesFromData.add(p.state);
        });

        // Get states from alerts
        (alertData.alerts || []).forEach((a: any) => {
          if (a.region) statesFromData.add(a.region);
          if (a.state) statesFromData.add(a.state);
        });

        // Get states from state stats
        if (stateData) {
          Object.keys(stateData).forEach(state => statesFromData.add(state));
        }

        // Get states from system stats population data
        if (systemStats?.population_by_state) {
          Object.keys(systemStats.population_by_state).forEach(state => statesFromData.add(state));
        }

        // Only use real states from backend data - no fallbacks
        const stateList = Array.from(statesFromData).sort();
        setAllStates(stateList);

        // Seed live models from system if available
        if (systemStats?.live_models) {
          setLiveModels(systemStats.live_models);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Auto-refresh every 2 minutes for better performance
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, []);

  // Fetch live model stats whenever window changes
  useEffect(() => {
    const fetchModelStats = async () => {
      try {
        const ms = await apiService.getModelStats(modelWindow);
        setLiveModels(ms?.models || {});
        setLiveModelsTimestamp(ms?.timestamp || null);
      } catch (e) {
        console.error('Failed to fetch model stats:', e);
      }
    };
    fetchModelStats();
  }, [modelWindow]);

  // Generate dynamic data based on actual predictions and alerts
  const generateTimeSeriesData = () => {
    const data = [];
    const now = new Date();

    if (timeFilter === 'weekly') {
      for (let i = 0; i < 4; i++) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (7 * (4 - i)));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        // Filter predictions in this week
        const weekPredictions = predictions.filter(p => {
          const predDate = new Date(p.created_at);
          return predDate >= weekStart && predDate <= weekEnd;
        });

        const weekAlerts = alerts.filter(a => {
          const alertDate = new Date(a.created_at);
          return alertDate >= weekStart && alertDate <= weekEnd;
        });

        const avgRisk = weekPredictions.length > 0
          ? weekPredictions.reduce((sum, p) => sum + (p.flood_probability || 0), 0) / weekPredictions.length
          : 0;

        data.push({
          period: `${t('week')} ${i + 1}`,
          rainfall: 0, // Will be fetched from API if available
          floodRisk: Math.round(avgRisk * 100),
          alerts: weekAlerts.length,
          population: weekAlerts.length * 5000
        });
      }
    } else if (timeFilter === 'monthly') {
      const currentMonth = now.getMonth();

      for (let i = 0; i < 12; i++) {
        const monthIndex = (currentMonth - 11 + i + 12) % 12;
        const date = new Date(2024, monthIndex, 1);
        const monthName = date.toLocaleString(language === 'ar' ? 'ar-EG' : language === 'sw' ? 'sw-KE' : 'en-US', { month: 'short' });

        // Filter predictions in this month
        const monthPredictions = predictions.filter(p => {
          const predDate = new Date(p.created_at);
          return predDate.getMonth() === monthIndex;
        });

        const monthAlerts = alerts.filter(a => {
          const alertDate = new Date(a.created_at);
          return alertDate.getMonth() === monthIndex;
        });

        const avgRisk = monthPredictions.length > 0
          ? monthPredictions.reduce((sum, p) => sum + (p.flood_probability || 0), 0) / monthPredictions.length
          : 0;

        data.push({
          period: monthName,
          rainfall: 0, // Will be fetched from CHIRPS API if available
          floodRisk: Math.round(avgRisk * 100),
          alerts: monthAlerts.length,
          population: monthAlerts.length * 12000,
          temperature: 0 // Will be fetched from weather API if available
        });
      }
    } else { // yearly
      const currentYear = new Date().getFullYear();
      for (let year = 2020; year <= currentYear; year++) {
        const yearPredictions = predictions.filter(p => {
          const predDate = new Date(p.created_at);
          return predDate.getFullYear() === year;
        });

        const yearAlerts = alerts.filter(a => {
          const alertDate = new Date(a.created_at);
          return alertDate.getFullYear() === year;
        });

        const avgRisk = yearPredictions.length > 0
          ? yearPredictions.reduce((sum, p) => sum + (p.flood_probability || 0), 0) / yearPredictions.length
          : 0;

        data.push({
          period: year.toString(),
          rainfall: 0, // Will be fetched from CHIRPS API if available
          floodRisk: Math.round(avgRisk * 100),
          alerts: yearAlerts.length,
          population: yearAlerts.length * 50000,
          events: Math.max(yearAlerts.length, 0) // Use actual alert count
        });
      }
    }

    return data;
  };

  const timeSeriesData = generateTimeSeriesData();

  // State data based on actual alerts and predictions
  const stateData = allStates.map(state => {
    // Count alerts for this state
    const stateAlerts = alerts.filter(a =>
      a.state === state ||
      a.region === state ||
      a.district?.includes(state.split(' ')[0])
    );

    // Get highest risk level from alerts
    let riskLevel = 'Low';
    if (stateAlerts.some(a => a.severity === 'critical')) riskLevel = 'Critical';
    else if (stateAlerts.some(a => a.severity === 'high')) riskLevel = 'High';
    else if (stateAlerts.some(a => a.severity === 'medium')) riskLevel = 'Medium';
    else if (stateAlerts.length > 0) riskLevel = 'Low';

    // Get last event date
    const lastEventDate = stateAlerts.length > 0
      ? new Date(Math.max(...stateAlerts.map(a => new Date(a.created_at).getTime())))
      : null;

    const s = stateStats?.[state];
    return {
      state: state.split(' ')[0],
      fullName: state,
      population: s?.population_at_risk ?? stats?.population_by_state?.[state] ?? 0,
      floodEvents: stateAlerts.length || s?.flood_events || 0,
      riskLevel: riskLevel,
      lastEvent: lastEventDate ? lastEventDate.toISOString().split('T')[0] : (s?.last_event ?? 'None')
    };
  });

  // Severity distribution based on actual alerts
  const severityCounts = alerts.reduce((acc: any, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {});

  const severityDistribution = [
    { name: t('critical'), value: severityCounts.critical || 0, color: 'var(--risk-critical)' },
    { name: t('high'), value: severityCounts.high || 0, color: 'var(--risk-high)' },
    { name: t('medium'), value: severityCounts.medium || 0, color: 'var(--risk-medium)' },
    { name: t('low'), value: severityCounts.low || 0, color: 'var(--risk-low)' },
    { name: t('minimal'), value: 0, color: 'var(--risk-minimal)' }
  ].filter(item => item.value > 0);

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
          <p className="text-slate-600">{t('loadingAnalytics')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <div>
              <div className="flex items-center gap-3">
                {t('floodAnalyticsTitle')}
                <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full animate-pulse">
                  {t('liveData')}
                </span>
              </div>
              <p className="text-lg font-normal text-gray-600 mt-1">
                {t('floodAnalyticsSubtitle')}
              </p>
            </div>
          </h1>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-4 mb-8"
        >
          <div className="flex items-center gap-2 bg-white p-3 rounded-lg shadow">
            <span className="text-gray-700 font-medium">{t('timePeriod')}:</span>
            <button
              onClick={() => setTimeFilter('weekly')}
              className={`px-4 py-2 rounded-lg font-medium transition ${timeFilter === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {t('weekly')}
            </button>
            <button
              onClick={() => setTimeFilter('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition ${timeFilter === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {t('monthly')}
            </button>
            <button
              onClick={() => setTimeFilter('yearly')}
              className={`px-4 py-2 rounded-lg font-medium transition ${timeFilter === 'yearly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {t('yearly')}
            </button>
          </div>

          {stats && (
            <div className="flex items-center gap-4 bg-white p-3 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-medium">{t('totalAlerts')}:</span>
                <span className="text-xl font-bold text-red-600">{alerts.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-medium">{t('predictionsCount')}:</span>
                <span className="text-xl font-bold text-blue-600">{predictions.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-medium">{t('systemAccuracy')}:</span>
                <span className="text-xl font-bold text-green-600">
                  {accuracyLoading ? t('updating') : (accuracyLabel || '-')}
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 mb-8 sm:mb-10 lg:mb-12">
          {/* Rainfall vs Flood Risk */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flood-card p-6 sm:p-8 h-full flex flex-col"
          >
            <h3 className="text-flood-title text-xl font-bold mb-7 sm:mb-8">{t('floodRiskTrend')}</h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={timeSeriesData}>
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
                    dataKey="alerts"
                    fill="var(--flood-medium)"
                    name={t('activeAlerts')}
                    radius={[2, 2, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="floodRisk"
                    stroke="var(--flood-critical)"
                    strokeWidth={3}
                    name={t('floodRiskPercentage')}
                    dot={{ fill: 'var(--flood-critical)', r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Severity Distribution */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flood-card p-6 sm:p-8 h-full flex flex-col"
          >
            <h3 className="text-flood-title text-xl font-bold mb-7 sm:mb-8">{t('alertDistribution')}</h3>
            <div className="h-[400px] w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {severityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 space-y-3">
              {severityDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{item.value} {t('alerts').toLowerCase()}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* State Analysis Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flood-card p-6 sm:p-8 overflow-x-auto"
        >
          <h3 className="text-flood-title text-lg sm:text-xl font-bold mb-6 sm:mb-8">{t('stateAnalysis')}</h3>
          <div className="overflow-x-auto -mx-6 sm:-mx-8 sm:mx-0">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-5 font-semibold text-gray-700">{t('location')}</th>
                  <th className="text-right py-4 px-5 font-semibold text-gray-700">{t('populationAtRisk')}</th>
                  <th className="text-right py-4 px-5 font-semibold text-gray-700">{t('floodEvents')}</th>
                  <th className="text-center py-4 px-5 font-semibold text-gray-700">{t('riskLevel')}</th>
                  <th className="text-left py-4 px-5 font-semibold text-gray-700">{t('lastEvent')}</th>
                </tr>
              </thead>
              <tbody>
                {stateData.map((state, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-4 px-5 font-medium text-gray-800">{state.fullName}</td>
                    <td className="py-4 px-5 text-right font-semibold text-gray-700">
                      {state.population.toLocaleString()}
                    </td>
                    <td className="py-4 px-5 text-right font-semibold text-gray-700">{state.floodEvents}</td>
                    <td className="py-4 px-5 text-center">
                      <span
                        className="px-4 py-2 rounded-full text-xs font-semibold inline-block"
                        style={{
                          backgroundColor: getRiskColor(state.riskLevel) + '20',
                          color: getRiskColor(state.riskLevel)
                        }}
                      >
                        {t(state.riskLevel.toLowerCase() as any)}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-gray-600 text-sm">{state.lastEvent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Model Performance (live) */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flood-card p-6 mt-8"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
              <div>
                <h3 className="text-flood-title text-xl font-bold">{t('aiModelPerformance')}</h3>
                <p className="text-sm text-gray-500">{t('liveModelMetrics')} {modelWindow} {t('predictionsCount').toLowerCase()}.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{t('window')}:</span>
                <div className="flex items-center gap-2">
                  {[100, 300, 1000].map((n) => (
                    <button
                      key={n}
                      onClick={() => setModelWindow(n)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${modelWindow === n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {t('last')} {n}
                    </button>
                  ))}
                </div>
                {liveModelsTimestamp && (
                  <span className="text-xs text-gray-500 ml-2">{t('updated')}: {new Date(liveModelsTimestamp).toLocaleString()}</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries((liveModels || {})).map(([model, metrics]: [string, any]) => (
                <div key={model} className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-100 h-full flex flex-col justify-between">
                  <h4 className="font-semibold text-blue-900 mb-2 capitalize">{model.replace('_', ' ')}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">{t('liveAccuracy')} ({t('last').toLowerCase()} {modelWindow}):</span>
                      <span className="font-bold text-blue-900">
                        {Math.round(((metrics.avg_probability || 0)) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">{t('f1ScoreProxy')}:</span>
                      <span className="font-bold text-blue-900">
                        {Math.round(((metrics.avg_confidence || 0)) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
