import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import '../styles/flood-colors.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Prediction } from '../types';
import { useSystemAccuracy } from '../hooks/useSystemAccuracy';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

interface User {
  id: number;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Alert {
  id: number;
  latitude: number;
  longitude: number;
  severity: string;
  message: string;
  is_active: boolean;
  created_at: string;
}

const UNAVAILABLE_LABEL = '\u2014';
const MODEL_STATS_WINDOW = 500;

const Admin: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [section, setSection] = useState('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [modelStats, setModelStats] = useState<any>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dataCache, setDataCache] = useState<{ users?: User[], alerts?: Alert[], predictions?: Prediction[], modelStats?: any, timestamp?: number }>({});
  const { accuracyLabel, isLoading: accuracyLoading } = useSystemAccuracy({ refreshIntervalMs: 60000 });

  // Settings state
  const [simulationMode, setSimulationMode] = useState(false);

  // Form states
  const [showUserForm, setShowUserForm] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [showPredictionForm, setShowPredictionForm] = useState(false);

  // Search and filter states
  const [userSearch, setUserSearch] = useState('');
  const [alertFilter, setAlertFilter] = useState('all');
  const [predictionFilter, setPredictionFilter] = useState('all'); const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'community_member', password: '' });
  const [newAlert, setNewAlert] = useState({ latitude: 6.877, longitude: 31.307, severity: 'high', message: '' });
  const [newPrediction, setNewPrediction] = useState({ latitude: 6.877, longitude: 31.307, model_type: 'ensemble', lead_time_hours: 48 });
  const [predictionLoading, setPredictionLoading] = useState(false);

  // Fetch data with caching and timeout optimization
  const fetchUsers = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout

      // Limit to 50 users for faster loading
      const data = await apiService.getUsers({ limit: 50 });
      clearTimeout(timeoutId);
      setUsers(data);
      return data;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('[PERFORMANCE] Users fetch timed out');
        setError(t('usersLoadTimeout'));
      } else {
        setError(t('usersLoadFailed'));
      }
      return [];
    }
  };

  const fetchAlerts = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout

      // Limit to most recent 100 alerts for faster loading
      const data = await apiService.getActiveAlerts({ limit: 100 });
      clearTimeout(timeoutId);
      const alertsArray = data.alerts || [];
      setAlerts(alertsArray);
      return alertsArray;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('[PERFORMANCE] Alerts fetch timed out');
        setError(t('alertsLoadTimeout'));
      } else {
        setError(t('alertsLoadFailed'));
      }
      return [];
    }
  };

  const fetchPredictions = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout

      // Limit to most recent 100 predictions for faster loading
      const data = await apiService.getPredictions({ limit: 100 });
      clearTimeout(timeoutId);
      const predictionsArray = data.predictions || data;
      setPredictions(predictionsArray);
      return predictionsArray;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('[PERFORMANCE] Predictions fetch timed out');
        setError(t('predictionsLoadTimeout'));
      } else {
        setError(t('predictionsLoadFailed'));
      }
      return [];
    }
  };

  const fetchModelStats = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout

      const data = await apiService.getModelStats(MODEL_STATS_WINDOW);
      clearTimeout(timeoutId);
      console.log('[DEBUG] Model Stats Data:', JSON.stringify(data, null, 2));
      setModelStats(data);
      return data;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('[PERFORMANCE] Model stats fetch timed out');
      } else {
        console.error('Failed to load model stats:', err);
      }
      return null;
    }
  };

  const fetchTimeSeriesData = async () => {
    try {
      const data = await apiService.getTimeSeriesStats(7); // Last 7 days
      setTimeSeriesData(data);
      return data;
    } catch (err: any) {
      console.error('Failed to load time-series data:', err);
      return null;
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await apiService.getSystemSettings();
      if (data) {
        setSimulationMode(data.simulation_mode);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await apiService.updateSystemSettings({ simulation_mode: simulationMode });
      setSuccessMessage(t('settingsSaved'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(t('saveSettingsFailed'));
      setTimeout(() => setError(null), 3000);
    }
  };

  // Security: Verify admin access on component mount
  useEffect(() => {
    const verifyAccess = async () => {
      const token = localStorage.getItem('token');
      const userRole = localStorage.getItem('userRole');

      // Check if user is authenticated
      if (!token) {
        console.warn('[SECURITY] No authentication token found');
        navigate('/login', { replace: true });
        return;
      }

      // Check if user has admin role
      if (userRole !== 'admin') {
        console.warn('[SECURITY] Unauthorized access attempt - User role:', userRole);
        navigate('/home', { replace: true });
        return;
      }

      try {
        // Verify token is still valid by fetching current user
        const currentUser = await apiService.getCurrentUser();
        if (currentUser.role !== 'admin') {
          console.warn('[SECURITY] User role mismatch - Expected admin, got:', currentUser.role);
          localStorage.setItem('userRole', currentUser.role);
          navigate('/home', { replace: true });
          return;
        }

        setIsAuthenticated(true);
        setIsAdmin(true);
        console.info('[SECURITY] Admin access verified for user:', currentUser.email);
      } catch (err) {
        console.error('[SECURITY] Token validation failed:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        navigate('/login', { replace: true });
      }
    };

    verifyAccess();
  }, [navigate]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

    const loadData = async () => {
      const startTime = performance.now();
      setLoading(true);

      // Check if we have cached data less than 30 seconds old
      const now = Date.now();
      const cacheAge = dataCache.timestamp ? (now - dataCache.timestamp) / 1000 : Infinity;

      if (cacheAge < 30 && dataCache.users && dataCache.alerts && dataCache.predictions && dataCache.modelStats) {
        console.info(`[PERFORMANCE] Using cached data (age: ${cacheAge.toFixed(1)}s)`);
        setUsers(dataCache.users);
        setAlerts(dataCache.alerts);
        setPredictions(dataCache.predictions);
        setModelStats(dataCache.modelStats);
        setLoading(false);
        return;
      }

      try {
        // Parallel fetch with race condition - take first results within 1.8s
        const fetchPromise = Promise.all([fetchUsers(), fetchAlerts(), fetchPredictions(), fetchModelStats(), fetchTimeSeriesData(), fetchSettings()]);
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1800));

        const result = await Promise.race([
          fetchPromise.then(data => ({ success: true, data })),
          timeoutPromise.then(() => ({ success: false, data: null }))
        ]);

        if (result.success && result.data) {
          const [usersData, alertsData, predictionsData, modelStatsData] = result.data;

          // Update cache
          setDataCache({
            users: usersData,
            alerts: alertsData,
            predictions: predictionsData,
            modelStats: modelStatsData,
            timestamp: Date.now()
          });

          const loadTime = performance.now() - startTime;
          console.info(`[PERFORMANCE] Data loaded in ${loadTime.toFixed(0)}ms`);
        } else {
          console.warn('[PERFORMANCE] Data loading exceeded 1.8s - using partial data');
          // Use cache if available
          if (dataCache.users) setUsers(dataCache.users);
          if (dataCache.alerts) setAlerts(dataCache.alerts);
          if (dataCache.predictions) setPredictions(dataCache.predictions);
          if (dataCache.modelStats) setModelStats(dataCache.modelStats);
        }
      } catch (err) {
        console.error('[PERFORMANCE] Data loading failed:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, isAdmin]);

  // CRUD operations
  const handleDeleteUser = async (id: number) => {
    if (!confirm(t('confirmDeleteUser'))) return;
    try {
      await apiService.deleteUser(id);
      setSuccessMessage(t('userDeletedSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchUsers();
    } catch (err: any) {
      console.error('Delete user error:', err);
      setError(err.response?.data?.detail || t('deleteUserFailed'));
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteAlert = async (id: number) => {
    if (!confirm(t('confirmDeleteAlert'))) return;
    try {
      await apiService.deleteAlert(id);
      setSuccessMessage(t('alertDeletedSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchAlerts();
    } catch (err) {
      setError(t('deleteAlertFailed'));
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeletePrediction = async (id: number) => {
    if (!confirm(t('confirmDeletePrediction'))) return;
    try {
      await apiService.deletePrediction(id);
      setSuccessMessage(t('predictionDeletedSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchPredictions();
    } catch (err) {
      setError(t('deletePredictionFailed'));
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAddUser = async () => {
    try {
      await apiService.register(newUser);
      setShowUserForm(false);
      setNewUser({ email: '', full_name: '', role: 'community_member', password: '' });
      setSuccessMessage(t('userAddedSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || t('addUserFailed'));
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAddAlert = async () => {
    try {
      await apiService.createAlert(newAlert);
      setShowAlertForm(false);
      setNewAlert({ latitude: 6.877, longitude: 31.307, severity: 'high', message: '' });
      setSuccessMessage(t('alertCreatedSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchAlerts();
    } catch (err: any) {
      setError(err.response?.data?.detail || t('createAlertFailed'));
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCreatePrediction = async () => {
    if (!newPrediction.latitude || !newPrediction.longitude) {
      setError(t('invalidCoordinates'));
      setTimeout(() => setError(null), 3000);
      return;
    }

    setPredictionLoading(true);
    try {
      const result = await apiService.createPrediction(
        newPrediction.latitude,
        newPrediction.longitude,
        newPrediction.model_type,
        newPrediction.lead_time_hours
      );
      setShowPredictionForm(false);
      setNewPrediction({ latitude: 6.877, longitude: 31.307, model_type: 'ensemble', lead_time_hours: 48 });
      setSuccessMessage(t('predictionCreatedSuccess').replace('{risk}', result.risk_level).replace('{confidence}', Math.round(result.confidence_score * 100).toString()));
      setTimeout(() => setSuccessMessage(null), 5000);
      await fetchPredictions();
    } catch (err: any) {
      setError(err.response?.data?.detail || t('createPredictionFailed'));
      setTimeout(() => setError(null), 3000);
    } finally {
      setPredictionLoading(false);
    }
  };

  const handleLogout = () => {
    console.log('[SECURITY] Admin user logging out');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  // Filter data
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredAlerts = alertFilter === 'all'
    ? alerts
    : alerts.filter(a => a.severity === alertFilter);

  const filteredPredictions = predictionFilter === 'all'
    ? predictions
    : predictions.filter(p => p.risk_level === predictionFilter);

  // Calculate statistics for charts
  const getStatsForCharts = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    });

    // Use real time-series data from API (fetched in useEffect)
    const userGrowth = timeSeriesData?.user_growth || last7Days.map(day => ({ day, users: 0 }));
    const alertTrend = timeSeriesData?.alert_trend || last7Days.map(day => ({ day, alerts: 0 }));

    const predictionDistribution = {
      low: predictions.filter(p => p.risk_level === 'low').length,
      medium: predictions.filter(p => p.risk_level === 'medium').length,
      high: predictions.filter(p => p.risk_level === 'high').length,
      critical: predictions.filter(p => p.risk_level === 'critical').length,
      uncertain: predictions.filter(p => p.risk_level === 'uncertain').length
    };

    const alertBySeverity = {
      low: alerts.filter(a => a.severity === 'low').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      high: alerts.filter(a => a.severity === 'high').length,
      critical: alerts.filter(a => a.severity === 'critical').length
    };

    return { userGrowth, alertTrend, predictionDistribution, alertBySeverity };
  };

  if (loading && users.length === 0 && alerts.length === 0 && predictions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 font-medium">{t('loadingDashboard')}</p>
          <p className="text-gray-400 text-sm mt-1">{t('loadingTimeMsg')}</p>
        </div>
      </div>
    );
  }

  const adminSections = [
    { key: 'dashboard', label: t('adminDashboard') },
    { key: 'users', label: t('userManagement') },
    { key: 'alerts', label: t('alertsManagement') },
    { key: 'data', label: t('predictionDataManagement') },
    { key: 'system', label: t('systemHealthStatus') },
    { key: 'settings', label: t('settings') }
  ];

  const activeAlerts = alerts.filter(a => a.is_active).length;
  const criticalAlerts = alerts.filter(a => a.is_active && a.severity === 'critical').length;
  const stats = getStatsForCharts();
  const liveWindow = modelStats?.window_size || MODEL_STATS_WINDOW;
  const systemAccuracyDisplay = accuracyLabel === UNAVAILABLE_LABEL
    ? (accuracyLoading ? 'Loading...' : 'Unavailable')
    : (accuracyLabel || 'Unavailable');

  return (
    <div className="min-h-screen flex relative">
      <aside className="w-64 bg-white/95 backdrop-blur border-r border-gray-200 flex flex-col shadow-lg z-10">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
            </div>
            <div>
              <span className="font-bold text-lg text-gray-900 block">{t('adminPanel')}</span>
              <p className="text-xs text-gray-500">{t('floodSenseManagement')}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {adminSections.map((s, idx) => (
            <motion.button
              key={s.key}
              onClick={() => setSection(s.key)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${section === s.key
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : 'hover:bg-blue-50 text-gray-700 hover:text-blue-700'
                }`}
            >
              <span className="text-sm">{s.label}</span>
            </motion.button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <motion.button
            onClick={handleLogout}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800"
          >
            {t('logout')}
          </motion.button>
        </div>
      </aside>

      <main className="flex-1 p-6 sm:p-8 lg:p-10 overflow-auto">
        {/* Success/Error Messages */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            {successMessage}
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            {error}
          </motion.div>
        )}

        {section === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('adminDashboard')}</h1>
                <p className="text-base text-gray-600">{t('systemOverview')}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full shadow-sm">
                    <span className="font-semibold text-gray-900">{t('systemAccuracy')}: {systemAccuracyDisplay}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>{t('matchesPublicDashboards')}</span>
                  </div>
                </div>
              </div>
              <LanguageSwitcher />
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/80 backdrop-blur p-8 rounded-xl shadow-lg border border-gray-100 h-full flex flex-col justify-between text-left"
              >
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">{users.length}</h3>
                  <p className="text-gray-600 font-medium">{t('totalUsers')}</p>
                </div>
                <div className="mt-4 flex items-center text-sm text-green-600 font-medium bg-green-50 w-fit px-2 py-1 rounded">
                  {t('allActive')}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/80 backdrop-blur p-8 rounded-xl shadow-lg border border-gray-100 h-full flex flex-col justify-between text-left"
              >
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">{activeAlerts}</h3>
                  <p className="text-gray-600 font-medium">{t('activeAlertsCount')}</p>
                </div>
                <div className="mt-4 flex items-center text-sm text-red-600 font-medium bg-red-50 w-fit px-2 py-1 rounded">
                  <span className="font-bold mr-1">{t('criticalAlertsCount').replace('{count}', criticalAlerts.toString())}</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/80 backdrop-blur p-8 rounded-xl shadow-lg border border-gray-100 h-full flex flex-col justify-between text-left"
              >
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">{predictions.length}</h3>
                  <p className="text-gray-600 font-medium">{t('predictionsCountLabel')}</p>
                </div>
                <div className="mt-4 flex items-center text-sm text-blue-600 font-medium bg-blue-50 w-fit px-2 py-1 rounded">
                  {t('systemOperational')}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/80 backdrop-blur p-6 rounded-xl shadow-lg border border-gray-100 h-full flex flex-col justify-between text-left"
              >
                <div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">{t('systemAccuracy')}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{systemAccuracyDisplay}</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4 mt-auto">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">{t('liveModelAccuracy')}</p>
                  <p className="text-xl font-bold text-green-600 mt-1">
                    {modelStats?.overall_accuracy ? `${(modelStats.overall_accuracy * 100).toFixed(1)}%` : '--'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{t('lastPredictions').replace('{count}', liveWindow)}</p>
                </div>
              </motion.div>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-full flex flex-col"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('alertDistribution')}</h3>
                <div className="flex-grow min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { severity: 'Low', count: stats.alertBySeverity.low },
                      { severity: 'Medium', count: stats.alertBySeverity.medium },
                      { severity: 'High', count: stats.alertBySeverity.high },
                      { severity: 'Critical', count: stats.alertBySeverity.critical }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="severity" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-full flex flex-col"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('predictionRiskLevels')}</h3>
                <div className="flex-grow min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { risk: 'Low', count: stats.predictionDistribution.low },
                      { risk: 'Medium', count: stats.predictionDistribution.medium },
                      { risk: 'High', count: stats.predictionDistribution.high },
                      { risk: 'Critical', count: stats.predictionDistribution.critical },
                      { risk: 'Uncertain', count: stats.predictionDistribution.uncertain }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="risk" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="count" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Model Performance Section */}
            {(() => {
              console.log('[DEBUG] modelStats state:', modelStats);
              if (modelStats) {
                console.log('[DEBUG] modelStats.models:', modelStats.models);
                console.log('[DEBUG] modelStats keys:', Object.keys(modelStats));
              }
              return null;
            })()}
            {modelStats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
              >
                <h2 className="text-xl font-bold text-gray-900">{t('aiModelPerformance')}</h2>
                <p className="text-sm text-gray-500 mb-6">{t('aiModelPerformanceDesc').replace('{count}', liveWindow)}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modelStats.models && Object.entries(modelStats.models).map(([modelName, stats]: [string, any], idx) => {
                    console.log(`[DEBUG] Rendering ${modelName}:`, stats);
                    return (
                      <motion.div
                        key={modelName}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 * idx }}
                        className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 h-full flex flex-col justify-between"
                      >
                        <div className="mb-3">
                          <h3 className="font-bold text-gray-900 capitalize">{modelName.replace('_', ' ')}</h3>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{t('liveAccuracy').replace('{count}', liveWindow)}</span>
                            <span className="text-lg font-bold text-purple-700">
                              {stats.accuracy ? (stats.accuracy * 100).toFixed(1) : 'N/A'}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{t('confidence')}</span>
                            <span className="text-sm font-semibold text-gray-700">
                              {stats.confidence ? (stats.confidence * 100).toFixed(1) : 'N/A'}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{t('predictionsLabel')}</span>
                            <span className="text-sm font-semibold text-gray-700">
                              {stats.prediction_count || 0}
                            </span>
                          </div>
                          <div className="mt-2 pt-2 border-t border-purple-200">
                            <span className="text-xs text-gray-500">{t('lastUpdate')}: {new Date().toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Overall Stats */}
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">{t('liveAccuracy').replace('{count}', liveWindow)}</p>
                      <p className="text-2xl font-bold text-green-700">
                        {(modelStats.overall_accuracy * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">{t('totalPredictions')}</p>
                      <p className="text-2xl font-bold text-green-700">
                        {modelStats.total_predictions || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">{t('bestModel')}</p>
                      <p className="text-lg font-bold text-green-700 capitalize">
                        {modelStats.best_model?.replace('_', ' ') || 'N/A'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">{t('avgConfidence')}</p>
                      <p className="text-2xl font-bold text-green-700">
                        {modelStats.average_confidence ? `${(modelStats.average_confidence * 100).toFixed(1)}%` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('quickActions')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button
                  onClick={() => { setSection('users'); setShowUserForm(true); }}
                  className="flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200"
                >
                  {t('addNewUser')}
                </button>
                <button
                  onClick={() => { setSection('alerts'); setShowAlertForm(true); }}
                  className="flex items-center gap-3 px-4 py-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors border border-orange-200"
                >
                  {t('createAlert')}
                </button>
                <button
                  onClick={() => { setSection('data'); setShowPredictionForm(true); }}
                  className="flex items-center gap-3 px-4 py-3 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-lg transition-colors border border-cyan-200"
                >
                  {t('makePrediction')}
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors border border-green-200"
                >
                  {t('refreshData')}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {section === 'users' && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{t('userManagementTitle')}</h1>
                <p className="text-gray-600 mt-1">{t('userManagementDesc')}</p>
              </div>
              <button
                onClick={() => setShowUserForm(!showUserForm)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                {showUserForm ? t('cancel') : t('addNewUser')}
              </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('searchUsersPlaceholder')}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all"
                />
              </div>
            </div>

            {showUserForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-white p-6 rounded-xl shadow-lg mb-6 border border-gray-100"
              >
                <h3 className="font-bold text-lg mb-4 text-gray-900">{t('addNewUser')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="email"
                    placeholder={t('emailAddress')}
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                  <input
                    type="text"
                    placeholder={t('fullName')}
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    className="border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                  <input
                    type="password"
                    placeholder={t('password')}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  >
                    <option value="community_member">{t('roleCommunityMember')}</option>
                    <option value="ngo_partner">{t('roleNgoPartner')}</option>
                    <option value="admin">{t('roleAdministrator')}</option>
                  </select>
                </div>
                <button
                  onClick={handleAddUser}
                  className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-2.5 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
                >
                  {t('addNewUser')}
                </button>
              </motion.div>
            )}

            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colName')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colEmail')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colRole')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colStatus')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colCreated')}</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          <p>{t('noUsersFound')}</p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{user.full_name || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">{user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${user.role === 'admin'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : user.role === 'ngo_partner'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}>
                              {user.role === 'admin' ? t('roleAdministrator') :
                                user.role === 'ngo_partner' ? t('roleNgoPartner') :
                                  t('roleCommunityMember')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${user.is_active
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-300'
                              }`}>
                              {user.is_active ? t('statusActive') : t('statusInactive')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                            >
                              {t('actionDelete')}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {section === 'alerts' && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{t('alertsManagementTitle')}</h1>
                <p className="text-gray-600 mt-1">{t('alertsManagementDesc')}</p>
              </div>
              <button
                onClick={() => setShowAlertForm(!showAlertForm)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-5 py-2.5 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                {showAlertForm ? t('cancel') : t('createAlert')}
              </button>
            </div>

            {/* Filter Buttons */}
            <div className="mb-6 flex flex-wrap gap-2">
              {['all', 'low', 'medium', 'high', 'critical'].map((severity) => (
                <button
                  key={severity}
                  onClick={() => setAlertFilter(severity)}
                  className={`px-4 py-2 rounded-lg transition-colors ${alertFilter === severity
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                >
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </button>
              ))}
            </div>

            {showAlertForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-white p-6 rounded-xl shadow-lg mb-6 border border-gray-100"
              >
                <h3 className="font-bold text-lg mb-4 text-gray-900">{t('createNewAlert')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="number"
                    step="0.0001"
                    placeholder={t('latitude')}
                    value={newAlert.latitude || ''}
                    onChange={(e) => setNewAlert({ ...newAlert, latitude: e.target.value ? parseFloat(e.target.value) : 0 })}
                    className="border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    placeholder={t('longitude')}
                    value={newAlert.longitude || ''}
                    onChange={(e) => setNewAlert({ ...newAlert, longitude: e.target.value ? parseFloat(e.target.value) : 0 })}
                    className="border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                  <select
                    value={newAlert.severity}
                    onChange={(e) => setNewAlert({ ...newAlert, severity: e.target.value })}
                    className="border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  >
                    <option value="low">{t('lowLabel')}</option>
                    <option value="medium">{t('mediumLabel')}</option>
                    <option value="high">{t('highLabel')}</option>
                    <option value="critical">{t('criticalLabel')}</option>
                  </select>
                  <input
                    type="text"
                    placeholder={t('alertMessage')}
                    value={newAlert.message}
                    onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })}
                    className="border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                </div>
                <button
                  onClick={handleAddAlert}
                  className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-2.5 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
                >
                  {t('createAlert')}
                </button>
              </motion.div>
            )}

            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-orange-50 to-red-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colLocation')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colSeverity')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colMessage')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colStatus')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colCreated')}</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAlerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${alert.severity === 'critical' ? 'bg-red-200 text-red-900 border border-red-300' :
                            alert.severity === 'high' ? 'bg-orange-200 text-orange-900 border border-orange-300' :
                              alert.severity === 'medium' ? 'bg-yellow-200 text-yellow-900 border border-yellow-300' :
                                'bg-green-200 text-green-900 border border-green-300'
                            }`}>
                            {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-md truncate">{alert.message}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${alert.is_active
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-300'
                            }`}>
                            {alert.is_active ? t('statusActive') : t('statusInactive')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(alert.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleDeleteAlert(alert.id)}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                          >
                            {t('actionDelete')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {section === 'data' && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{t('predictionDataTitle')}</h1>
                <p className="text-gray-600 mt-1">{t('predictionDataDesc')}</p>
              </div>
              <button
                onClick={() => setShowPredictionForm(!showPredictionForm)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-5 py-2.5 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                {showPredictionForm ? t('cancel') : t('makePrediction')}
              </button>
            </div>

            {/* Prediction Form */}
            {showPredictionForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-white/95 backdrop-blur p-6 rounded-xl shadow-lg mb-6 border border-cyan-200"
              >
                <div className="mb-6">
                  <h3 className="font-bold text-xl text-gray-900">{t('aiFloodRiskPrediction')}</h3>
                  <p className="text-sm text-gray-600 mt-1">{t('aiFloodRiskPredictionDesc')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('latitude')}
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="6.8770 (South Sudan)"
                      value={newPrediction.latitude || ''}
                      onChange={(e) => setNewPrediction({ ...newPrediction, latitude: e.target.value ? parseFloat(e.target.value) : 0 })}
                      className="w-full border-2 border-cyan-300 rounded-lg px-4 py-3 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-200 transition-all font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('longitude')}
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="31.3070 (South Sudan)"
                      value={newPrediction.longitude || ''}
                      onChange={(e) => setNewPrediction({ ...newPrediction, longitude: e.target.value ? parseFloat(e.target.value) : 0 })}
                      className="w-full border-2 border-cyan-300 rounded-lg px-4 py-3 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-200 transition-all font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('modelType')}
                    </label>
                    <select
                      value={newPrediction.model_type}
                      onChange={(e) => setNewPrediction({ ...newPrediction, model_type: e.target.value })}
                      className="w-full border-2 border-cyan-300 rounded-lg px-4 py-3 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-200 transition-all font-mono text-sm"
                    >
                      <option value="ensemble">Ensemble (Recommended)</option>
                      <option value="lstm">LSTM</option>
                      <option value="tcn">TCN</option>
                      <option value="random_forest">Random Forest</option>
                      <option value="gradient_boosting">Gradient Boosting</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('leadTimeHours')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={newPrediction.lead_time_hours}
                      onChange={(e) => setNewPrediction({ ...newPrediction, lead_time_hours: parseInt(e.target.value) || 48 })}
                      className="w-full border-2 border-cyan-300 rounded-lg px-4 py-3 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-200 transition-all font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-1">{t('howItWorks')}</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-800">
                        <li>{t('howItWorks1')}</li>
                        <li>{t('howItWorks2')}</li>
                        <li>{t('howItWorks3')}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCreatePrediction}
                    disabled={predictionLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl font-semibold disabled:cursor-not-allowed"
                  >
                    {predictionLoading ? (
                      <>
                        {t('analyzing')}
                      </>
                    ) : (
                      <>
                        {t('generatePrediction')}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setNewPrediction({ latitude: 6.877, longitude: 31.307, model_type: 'ensemble', lead_time_hours: 48 })}
                    className="px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-lg border-2 border-gray-300 transition-colors font-medium"
                  >
                    {t('reset')}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Filter Buttons */}
            <div className="mb-6 flex flex-wrap gap-2">
              {['all', 'low', 'medium', 'high', 'critical', 'uncertain'].map((level) => (
                <button
                  key={level}
                  onClick={() => setPredictionFilter(level)}
                  className={`px-4 py-2 rounded-lg transition-colors ${predictionFilter === level
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-cyan-50 to-blue-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colLocation')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colRiskLevel')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colFloodProbability')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colConfidence')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colDate')}</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPredictions.map((pred) => (
                      <tr key={pred.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {pred.latitude.toFixed(4)}, {pred.longitude.toFixed(4)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            title={pred.risk_level === 'uncertain' && pred.flood_probability >= 0.6 ? t('downgradedRisk') : ""}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${pred.risk_level === 'critical' ? 'bg-red-200 text-red-900 border border-red-300' :
                              pred.risk_level === 'high' ? 'bg-orange-200 text-orange-900 border border-orange-300' :
                                pred.risk_level === 'medium' ? 'bg-yellow-200 text-yellow-900 border border-yellow-300' :
                                  pred.risk_level === 'uncertain' ? 'bg-gray-200 text-gray-900 border border-gray-300 cursor-help' :
                                    'bg-green-200 text-green-900 border border-green-300'
                              }`}>
                            {pred.risk_level.charAt(0).toUpperCase() + pred.risk_level.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-semibold text-gray-900">{Math.round(pred.flood_probability * 100)}%</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`text-sm font-semibold ${pred.confidence_score < 0.6 ? 'text-amber-600' : 'text-gray-900'}`}>
                              {pred.confidence_score ? Math.round(pred.confidence_score * 100) + '%' : '-'}
                            </div>
                            {pred.confidence_score < 0.6 && (
                              <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title={t('lowConfidenceWarning')}>
                                {t('lowLabel')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(pred.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleDeletePrediction(pred.id)}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                          >
                            {t('actionDelete')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {section === 'system' && (
          <section>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">{t('systemHealthStatus')}</h1>
              <p className="text-gray-600 mt-1">{t('monitorSystemPerformance')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-white/90 backdrop-blur rounded-xl border-l-4 border-green-500 shadow-lg h-full flex flex-col justify-between text-left"
              >
                <div>
                  <h2 className="font-bold text-xl text-gray-900 mb-2">{t('apiServerStatus')}</h2>
                  <p className="text-green-600 font-bold text-2xl mb-6">{t('operational')}</p>
                </div>
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">{t('totalUsers')}</span>
                    <span className="font-bold text-gray-900">{users.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">{t('activeAlerts')}</span>
                    <span className="font-bold text-gray-900">{activeAlerts}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">{t('totalPredictions')}</span>
                    <span className="font-bold text-gray-900">{predictions.length}</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 bg-white/90 backdrop-blur rounded-xl border-l-4 border-blue-500 shadow-lg h-full flex flex-col justify-between text-left"
              >
                <div>
                  <h2 className="font-bold text-xl text-gray-900 mb-2">{t('databaseStatus')}</h2>
                  <p className="text-blue-600 font-bold text-2xl mb-6">{t('connected')}</p>
                </div>
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">{t('systemUptime')}</span>
                    <span className="font-bold text-gray-900">99.9%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">{t('responseTime')}</span>
                    <span className="font-bold text-gray-900">&lt;100ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">{t('lastCheck')}</span>
                    <span className="font-bold text-gray-900">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {section === 'settings' && (
          <section>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">{t('systemSettings')}</h1>
              <p className="text-gray-600 mt-1">{t('configureSystem')}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-bold text-gray-900">{t('simulationMode')}</h3>
                    <p className="text-sm text-gray-600">{t('simulationModeDesc')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simulationMode}
                      onChange={(e) => setSimulationMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button
                    onClick={handleSaveSettings}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-colors"
                  >
                    {t('saveSettings')}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Admin;
