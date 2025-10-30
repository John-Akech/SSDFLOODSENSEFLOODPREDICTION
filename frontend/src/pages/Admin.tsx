import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import '../styles/flood-colors.css';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

interface Prediction {
  id: number;
  latitude: number;
  longitude: number;
  risk_level: string;
  confidence_score: number;
  created_at: string;
}

const Admin: React.FC = () => {
  const [section, setSection] = useState('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form states
  const [showUserForm, setShowUserForm] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Search and filter states
  const [userSearch, setUserSearch] = useState('');
  const [alertFilter, setAlertFilter] = useState('all');
  const [predictionFilter, setPredictionFilter] = useState('all');
  
  const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'community_member', password: '' });
  const [newAlert, setNewAlert] = useState({ latitude: 6.877, longitude: 31.307, severity: 'high', message: '' });

  // Fetch data
  const fetchUsers = async () => {
    try {
      const data = await apiService.getUsers();
      setUsers(data);
    } catch (err) {
      setError('Failed to load users');
    }
  };

  const fetchAlerts = async () => {
    try {
      const data = await apiService.getActiveAlerts();
      setAlerts(data.alerts || []);
    } catch (err) {
      setError('Failed to load alerts');
    }
  };

  const fetchPredictions = async () => {
    try {
      const data = await apiService.getPredictions();
      setPredictions(data.predictions || data);
    } catch (err) {
      setError('Failed to load predictions');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchAlerts(), fetchPredictions()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // CRUD operations
  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiService.deleteUser(id);
      setSuccessMessage('User deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchUsers();
    } catch (err: any) {
      console.error('Delete user error:', err);
      setError(err.response?.data?.detail || 'Failed to delete user');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteAlert = async (id: number) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;
    try {
      await apiService.deleteAlert(id);
      setSuccessMessage('Alert deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchAlerts();
    } catch (err) {
      setError('Failed to delete alert');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeletePrediction = async (id: number) => {
    if (!confirm('Are you sure you want to delete this prediction?')) return;
    try {
      await apiService.deletePrediction(id);
      setSuccessMessage('Prediction deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchPredictions();
    } catch (err) {
      setError('Failed to delete prediction');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAddUser = async () => {
    try {
      await apiService.register(newUser);
      setShowUserForm(false);
      setNewUser({ email: '', full_name: '', role: 'community_member', password: '' });
      setSuccessMessage('User added successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add user');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAddAlert = async () => {
    try {
      await apiService.createAlert(newAlert);
      setShowAlertForm(false);
      setNewAlert({ latitude: 6.877, longitude: 31.307, severity: 'high', message: '' });
      setSuccessMessage('Alert created successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchAlerts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create alert');
      setTimeout(() => setError(null), 3000);
    }
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

    // Mock data for demonstration - in production, fetch from backend
    const userGrowth = last7Days.map(day => ({ day, users: Math.floor(Math.random() * 20) + 10 }));
    const alertTrend = last7Days.map(day => ({ day, alerts: Math.floor(Math.random() * 15) + 5 }));
    const predictionDistribution = {
      low: predictions.filter(p => p.risk_level === 'low').length,
      medium: predictions.filter(p => p.risk_level === 'medium').length,
      high: predictions.filter(p => p.risk_level === 'high').length,
      critical: predictions.filter(p => p.risk_level === 'critical').length
    };

    const alertBySeverity = {
      low: alerts.filter(a => a.severity === 'low').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      high: alerts.filter(a => a.severity === 'high').length,
      critical: alerts.filter(a => a.severity === 'critical').length
    };

    return { userGrowth, alertTrend, predictionDistribution, alertBySeverity };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const adminSections = [
    { key: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { key: 'users', label: 'User Management', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { key: 'alerts', label: 'Alerts', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { key: 'data', label: 'Prediction Data', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { key: 'system', label: 'System Status', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
  ];

  const activeAlerts = alerts.filter(a => a.is_active).length;
  const criticalAlerts = alerts.filter(a => a.is_active && a.severity === 'critical').length;
  const stats = getStatsForCharts();

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-lg text-gray-900">Admin Panel</span>
              <p className="text-xs text-gray-500">FloodSense Management</p>
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                section === s.key 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                  : 'hover:bg-blue-50 text-gray-700 hover:text-blue-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
              </svg>
              {s.label}
            </motion.button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        {/* Success/Error Messages */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </motion.div>
        )}
        
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </motion.div>
        )}

        {section === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600 mt-1">System overview and management controls</p>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={adminSections[1].icon} />
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{users.length}</h3>
                <p className="text-gray-600 text-sm mt-1">Total Users</p>
                <div className="mt-3 flex items-center text-xs text-green-600">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  All active
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={adminSections[2].icon} />
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{activeAlerts}</h3>
                <p className="text-gray-600 text-sm mt-1">Active Alerts</p>
                <div className="mt-3 flex items-center text-xs text-red-600">
                  <span className="font-semibold">{criticalAlerts}</span>
                  <span className="ml-1">critical</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={adminSections[3].icon} />
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{predictions.length}</h3>
                <p className="text-gray-600 text-sm mt-1">Predictions</p>
                <div className="mt-3 flex items-center text-xs text-blue-600">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  System operational
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={adminSections[4].icon} />
                    </svg>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">99.9%</h3>
                <p className="text-gray-600 text-sm mt-1">System Uptime</p>
                <div className="mt-3 flex items-center text-xs text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  All services online
                </div>
              </motion.div>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Alert Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
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
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Prediction Risk Levels</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { risk: 'Low', count: stats.predictionDistribution.low },
                    { risk: 'Medium', count: stats.predictionDistribution.medium },
                    { risk: 'High', count: stats.predictionDistribution.high },
                    { risk: 'Critical', count: stats.predictionDistribution.critical }
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
              </motion.div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => { setSection('users'); setShowUserForm(true); }}
                  className="flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add New User
                </button>
                <button
                  onClick={() => { setSection('alerts'); setShowAlertForm(true); }}
                  className="flex items-center gap-3 px-4 py-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors border border-orange-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Create Alert
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors border border-green-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Data
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {section === 'users' && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-600 mt-1">Manage system users and permissions</p>
              </div>
              <button 
                onClick={() => setShowUserForm(!showUserForm)} 
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {showUserForm ? 'Cancel' : 'Add User'}
              </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users by email or name..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all"
                />
                <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {showUserForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-white p-6 rounded-xl shadow-lg mb-6 border border-gray-100"
              >
                <h3 className="font-bold text-lg mb-4 text-gray-900">Add New User</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                    className="border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  >
                    <option value="community_member">Community Member</option>
                    <option value="ngo_partner">NGO Partner</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <button 
                  onClick={handleAddUser} 
                  className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-2.5 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Add User
                </button>
              </motion.div>
            )}

            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <p>No users found</p>
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
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              user.role === 'admin' 
                                ? 'bg-red-100 text-red-800 border border-red-200' 
                                : user.role === 'ngo_partner'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {user.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              user.is_active 
                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                : 'bg-gray-100 text-gray-700 border border-gray-300'
                            }`}>
                              {user.is_active ? 'Active' : 'Inactive'}
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
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
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
                <h1 className="text-3xl font-bold text-gray-900">Alerts Management</h1>
                <p className="text-gray-600 mt-1">Monitor and manage flood alerts</p>
              </div>
              <button 
                onClick={() => setShowAlertForm(!showAlertForm)} 
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-5 py-2.5 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {showAlertForm ? 'Cancel' : 'Create Alert'}
              </button>
            </div>

            {/* Filter Buttons */}
            <div className="mb-6 flex flex-wrap gap-2">
              {['all', 'low', 'medium', 'high', 'critical'].map((severity) => (
                <button
                  key={severity}
                  onClick={() => setAlertFilter(severity)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    alertFilter === severity
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
                <h3 className="font-bold text-lg mb-4 text-gray-900">Create New Alert</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Latitude"
                    value={newAlert.latitude}
                    onChange={(e) => setNewAlert({...newAlert, latitude: parseFloat(e.target.value)})}
                    className="border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Longitude"
                    value={newAlert.longitude}
                    onChange={(e) => setNewAlert({...newAlert, longitude: parseFloat(e.target.value)})}
                    className="border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                  <select
                    value={newAlert.severity}
                    onChange={(e) => setNewAlert({...newAlert, severity: e.target.value})}
                    className="border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Alert Message"
                    value={newAlert.message}
                    onChange={(e) => setNewAlert({...newAlert, message: e.target.value})}
                    className="border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                </div>
                <button 
                  onClick={handleAddAlert} 
                  className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-2.5 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Create Alert
                </button>
              </motion.div>
            )}

            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-orange-50 to-red-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Severity</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Message</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
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
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            alert.severity === 'critical' ? 'bg-red-200 text-red-900 border border-red-300' :
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
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            alert.is_active 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : 'bg-gray-100 text-gray-700 border border-gray-300'
                          }`}>
                            {alert.is_active ? 'Active' : 'Inactive'}
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
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
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
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Prediction Data Management</h1>
              <p className="text-gray-600 mt-1">View and manage AI-generated flood predictions</p>
            </div>

            {/* Filter Buttons */}
            <div className="mb-6 flex flex-wrap gap-2">
              {['all', 'low', 'medium', 'high', 'critical'].map((level) => (
                <button
                  key={level}
                  onClick={() => setPredictionFilter(level)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    predictionFilter === level
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
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Risk Level</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Confidence</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
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
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            pred.risk_level === 'critical' ? 'bg-red-200 text-red-900 border border-red-300' :
                            pred.risk_level === 'high' ? 'bg-orange-200 text-orange-900 border border-orange-300' :
                            pred.risk_level === 'medium' ? 'bg-yellow-200 text-yellow-900 border border-yellow-300' :
                            'bg-green-200 text-green-900 border border-green-300'
                          }`}>
                            {pred.risk_level.charAt(0).toUpperCase() + pred.risk_level.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-semibold text-gray-900">{Math.round(pred.confidence_score * 100)}%</div>
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
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
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
              <h1 className="text-3xl font-bold text-gray-900">System Health & Status</h1>
              <p className="text-gray-600 mt-1">Monitor system performance and service status</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-lg text-gray-900">API / Server Status</h2>
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <p className="text-green-700 font-bold text-xl mb-4">Operational</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Total Users</span>
                    <span className="font-semibold text-gray-900">{users.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Active Alerts</span>
                    <span className="font-semibold text-gray-900">{activeAlerts}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Total Predictions</span>
                    <span className="font-semibold text-gray-900">{predictions.length}</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-lg text-gray-900">Database Status</h2>
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    </svg>
                  </div>
                </div>
                <p className="text-blue-700 font-bold text-xl mb-4">Connected</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">System Uptime</span>
                    <span className="font-semibold text-gray-900">99.9%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Response Time</span>
                    <span className="font-semibold text-gray-900">&lt;100ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Last Check</span>
                    <span className="font-semibold text-gray-900">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Admin;
