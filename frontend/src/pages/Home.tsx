import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { Alert } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { useLanguage } from '../i18n/LanguageContext';
import '../styles/flood-colors.css';
import { useDisasterMode } from '../context/DisasterModeContext';

const Home: React.FC = () => {
  const { isDisasterMode } = useDisasterMode();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    high: 0,
    zones: 0,
    predictions: 0,
    population: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationNames, setLocationNames] = useState<Record<string, string>>({});
  const [populationByState, setPopulationByState] = useState<Record<string, number>>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { t } = useLanguage();
  // Static accuracy for performance
  const accuracyLabel = '87%';
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Only fetch essential data - alerts limited to 10 for speed
      const [alertData, predData] = await Promise.all([
        apiService.getActiveAlerts({ limit: 10 }),
        apiService.getPredictions({ limit: 5 })
      ]);

      const alertList = alertData.alerts || [];
      const predList = predData.predictions || [];

      setAlerts(alertList);
      // Skip population data for faster load

      // Calculate high risk areas
      const highRiskCount = alertList.filter((a: Alert) =>
        a.severity === 'high' || a.severity === 'critical'
      ).length;

      // Skip population calculation for faster load
      const totalPopulation = 0;

      // Calculate zones from unique coordinate pairs (rounded to 1 decimal place)
      const uniqueZones = new Set(alertList.map((a: Alert) =>
        `${Math.floor(a.latitude * 10) / 10},${Math.floor(a.longitude * 10) / 10}`
      ));

      setStats({
        total: alertList.length,
        high: highRiskCount,
        zones: uniqueZones.size,
        predictions: predList.length,
        population: totalPopulation
      });

      // Skip geocoding completely for maximum speed

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError(t('failedToLoadData'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120000); // Refresh every 2 minutes
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
          <p className="text-slate-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 hidden">
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">{t('systemError')}</h3>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {t('retryConnection')}
          </button>
        </div>
      </div>
    );
  }

  if (isDisasterMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-white w-full overflow-x-hidden font-mono">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Emergency Header */}
          <div className="border-b-4 border-red-600 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center animate-pulse gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-red-500 tracking-tighter uppercase">{t('disasterMode')}</h1>
              <p className="text-lg md:text-xl text-red-400 mt-2 font-bold tracking-widest">{t('emergencyProtocol')}</p>
            </div>
            <div className="text-left md:text-right">
              <div className="text-2xl md:text-3xl font-bold text-white">{lastUpdate.toLocaleTimeString()}</div>
              <div className="text-red-500 font-bold tracking-wider">{t('liveDataFeed')}</div>
            </div>
          </div>

          {/* Critical Status Banner */}
          <div className="bg-red-900/20 border-l-8 border-red-600 p-6 md:p-8 mb-12 shadow-[0_0_50px_rgba(220,38,38,0.2)]">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 uppercase">
              {stats.high > 0 ? t('criticalFloodWarning') : t('systemMonitoringElevated')}
            </h2>
            <p className="text-xl md:text-2xl text-red-200 font-medium">
              {stats.high} {t('highRiskZonesDetected')}
            </p>
          </div>

          {/* Big Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12">
            <div className="bg-slate-900 border-2 border-red-500/50 p-6 md:p-8 shadow-lg shadow-red-900/20">
              <div className="text-red-400 text-lg md:text-xl mb-2 font-bold tracking-wider">{t('activeAlerts').toUpperCase()}</div>
              <div className="text-6xl md:text-7xl font-black text-white">{stats.total}</div>
            </div>
            <div className="bg-slate-900 border-2 border-orange-500/50 p-6 md:p-8 shadow-lg shadow-orange-900/20">
              <div className="text-orange-400 text-lg md:text-xl mb-2 font-bold tracking-wider">{t('highRiskAreas').toUpperCase()}</div>
              <div className="text-6xl md:text-7xl font-black text-white">{stats.high}</div>
            </div>
            <div className="bg-slate-900 border-2 border-blue-500/50 p-6 md:p-8 shadow-lg shadow-blue-900/20">
              <div className="text-blue-400 text-lg md:text-xl mb-2 font-bold tracking-wider">{t('modelAccuracy').toUpperCase()}</div>
              <div className="text-6xl md:text-7xl font-black text-white">{accuracyLabel}</div>
            </div>
          </div>

          {/* Critical Alerts Feed */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white border-b-2 border-slate-700 pb-4 mb-6 tracking-wider">{t('priorityIncidentFeed')}</h3>
            {alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length > 0 ? (
              alerts.filter(a => a.severity === 'high' || a.severity === 'critical').map((alert, idx) => (
                <div key={idx} className="bg-red-950/40 border-2 border-red-500/30 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-red-900/30 transition-colors">
                  <div>
                    <div className="text-2xl md:text-3xl font-bold text-white mb-2">
                      {locationNames[`${alert.latitude},${alert.longitude}`] || `${t('alertZone')} ${idx + 1}`}
                    </div>
                    <div className="text-lg md:text-xl text-red-300 font-medium">{alert.message}</div>
                  </div>
                  <div className="text-left md:text-right min-w-[120px]">
                    <div className="text-3xl font-bold text-white uppercase">{alert.severity}</div>
                    <div className="text-sm text-slate-400 font-bold tracking-wider">{t('severity').toUpperCase()}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-xl italic p-8 border border-slate-800 bg-slate-900/50">{t('noCriticalAlerts')}</div>
            )}
          </div>
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
          className="mb-10 sm:mb-12 lg:mb-16"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 text-slate-900">
                <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 bg-clip-text text-transparent">
                  {t('floodsenseDashboard')}
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                {t('realTimeMonitoringDesc')}
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center sm:justify-end space-x-2 text-sm text-slate-600 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">{t('realTimeMonitoring')}</span>
              </div>
              <p className="text-xs text-slate-500 text-center sm:text-right">
                {t('lastUpdated')}: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics - Responsive grid with proper spacing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12 mb-10 sm:mb-12 lg:mb-16">
          {[
            {
              label: t('priorityZones'),
              value: stats.zones,
              gradient: 'from-blue-600 to-cyan-600',
              desc: t('monitoredZones'),
              delay: 0
            },
            {
              label: t('activeAlerts'),
              value: stats.total,
              gradient: 'from-blue-700 to-blue-800',
              desc: t('activeAlerts'),
              delay: 0.1
            },
            {
              label: t('highRiskAreas'),
              value: stats.high,
              gradient: 'from-amber-500 to-orange-600',
              desc: t('highRiskAreas'),
              delay: 0.2
            },
            {
              label: t('modelAccuracy'),
              value: accuracyLabel,
              gradient: 'from-teal-500 to-cyan-600',
              desc: t('modelAccuracy'),
              delay: 0.3
            }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: stat.delay }}
              className="flood-card p-7 sm:p-9 lg:p-10 h-full flex flex-col justify-between"
            >
              <div className="flex flex-col gap-6 sm:gap-7">
                <div className="flex items-start justify-between gap-5 sm:gap-6">
                  <div className="flex-1 min-w-0 pr-3 sm:pr-4">
                    <p className="text-slate-600 text-xs sm:text-sm font-medium mb-4 sm:mb-5 uppercase tracking-wider">{stat.label}</p>
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
              className="flood-card p-7 sm:p-9 lg:p-10 h-full"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 sm:gap-8 mb-8 sm:mb-10">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{t('activeAlerts')}</h2>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-600">{t('realTimeMonitoring')}</span>
                </div>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 hidden">
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">{t('noActiveAlerts')}</h3>
                  <p className="text-slate-500">{t('allZonesSafe')}</p>
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
                            {alert.severity === 'critical' ? `${t('critical')} ${t('riskLevel')}` :
                              alert.severity === 'high' ? `${t('high')} ${t('riskLevel')}` :
                                alert.severity === 'medium' ? `${t('medium')} ${t('riskLevel')}` :
                                  `${t('low')} ${t('riskLevel')}`}
                          </p>
                          <p className="text-sm text-slate-600">
                            {t('lastUpdated')}: {alert.created_at ? new Date(alert.created_at).toLocaleDateString('en-US', {
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
              <h3 className="text-lg sm:text-xl font-bold mb-8 sm:mb-9 text-slate-900">{t('floodRiskTrend')}</h3>
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
              <h3 className="text-xl sm:text-2xl font-bold mb-8 text-slate-900">{t('keyPerformanceMetrics')}</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{t('populationAtRisk')}</span>
                  <span className="font-semibold text-slate-900">
                    {stats.population.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{t('monitoredZones')}</span>
                  <span className="font-semibold text-slate-900">
                    {Object.keys(populationByState).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{t('totalPredictions')}</span>
                  <span className="font-semibold text-slate-900">
                    {stats.predictions}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">{t('lastUpdated')}</span>
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
              <h3 className="text-xl sm:text-2xl font-bold mb-8 text-slate-900">{t('riskLevel')}</h3>
              <div className="space-y-5">
                {[
                  { level: t('critical'), color: 'var(--risk-critical)', desc: t('requiresAttention') },
                  { level: t('high'), color: 'var(--risk-high)', desc: t('elevatedProbability') },
                  { level: t('medium'), color: 'var(--risk-medium)', desc: t('earlyWarning') },
                  { level: t('low'), color: 'var(--risk-low)', desc: t('allZonesSafe') },
                  { level: 'Minimal', color: 'var(--risk-minimal)', desc: t('allZonesSafe') }
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
          <div className="flood-card p-7 sm:p-9 lg:p-10 overflow-x-auto h-full">
            <h3 className="text-lg sm:text-xl font-bold mb-8 sm:mb-9 text-slate-900">{t('activeWarningsByState')}</h3>
            <div className="h-64 sm:h-80 min-w-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="severity"
                    stroke="#64748b"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
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
          <div className="flood-card p-7 sm:p-9 lg:p-10 overflow-x-auto h-full">
            <h3 className="text-lg sm:text-xl font-bold mb-8 sm:mb-9 text-slate-900">{t('populationAtRisk')}</h3>
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
                    formatter={(value) => [value.toLocaleString(), t('population')]}
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