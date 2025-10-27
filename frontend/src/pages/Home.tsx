import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { Alert } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useLanguage } from '../i18n/LanguageContext';
import { reverseGeocode } from '../services/geocoding';

const Home: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState({ total: 0, high: 0, zones: 0 });
  const [loading, setLoading] = useState(true);
  const [locationNames, setLocationNames] = useState<Record<number, string>>({});
  const { t } = useLanguage();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiService.getActiveAlerts();
        const alertList = data.alerts || [];
        setAlerts(alertList);
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
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const states = ['Jonglei', 'Unity', 'Upper Nile', 'Lakes', 'Warrap'];
  const chartData = states.map(state => ({
    state,
    warnings: alerts.filter(a => a.message?.includes(state)).length
  })).filter(d => d.warnings > 0).slice(0, 5);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const trendData = months.map((month, idx) => ({
    month,
    risk: Math.min(15 + (idx * 12) + (alerts.length * 2), 100)
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-blue-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-cyan-700 to-blue-700 bg-clip-text text-transparent">
                {t('floodsenseDashboard')}
              </h1>
              <p className="text-gray-600 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                {t('realTimeAIPowered')} • {t('lastUpdated')}: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { label: 'Priority Zones', value: stats.zones, gradient: 'from-cyan-600 to-blue-600', delay: 0 },
              { label: t('activeAlerts'), value: stats.total, gradient: 'from-red-600 to-orange-600', delay: 0.1 },
              { label: t('highRiskAreas'), value: stats.high, gradient: 'from-orange-600 to-yellow-600', delay: 0.2 }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: stat.delay }}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-8 shadow-2xl`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <p className="text-white/80 text-sm font-semibold mb-2">{stat.label}</p>
                  <p className="text-5xl font-bold text-white">{stat.value}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
                      Live
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('activeWarningsByState')}</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="state" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Bar dataKey="warnings" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('floodRiskTrend')}</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="risk" stroke="#10b981" strokeWidth={2} fill="url(#areaGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Alerts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('recentAlerts')}</h2>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0"></div>
                </div>
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-1">{t('noActiveAlerts')}</p>
                <p className="text-gray-600">{t('allZonesSafe')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alerts.slice(0, 6).map((a, idx) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-5 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-l-4 border-red-500 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <RiskBadge level={a.severity as any} />
                      <span className="text-xs text-gray-500">{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-2">{a.message}</p>
                    <p className="text-xs text-gray-600">{t('location')}: {locationNames[a.id] || `${a.latitude.toFixed(3)}, ${a.longitude.toFixed(3)}`}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
