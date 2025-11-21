import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

import { useLanguage } from '../i18n/LanguageContext';

const Login: React.FC = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiService.login({ email, password });
      // After successful login, always fetch user info with new token to get accurate role
      let user;
      try {
        user = await apiService.getCurrentUser(); // This gets /auth/me, which should always have the role
        localStorage.setItem('user', JSON.stringify(user)); // Keep localStorage fresh with latest user data
        localStorage.setItem('userRole', user.role); // Store role separately for ProtectedRoute
      } catch {
        // Fallback if getCurrentUser fails
        const storedUser = localStorage.getItem('user');
        user = storedUser ? JSON.parse(storedUser) : null;
        if (user?.role) {
          localStorage.setItem('userRole', user.role);
        }
      }

      // Redirect based on user role
      if (user && user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/home');
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full relative z-10 animate-slide-in">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-gradient-to-br from-ocean-500 to-cyan-600 rounded-3xl shadow-2xl mb-4">
          </div>
          <h1 className="text-4xl font-black mb-2">
            <span className="gradient-text">{t('adminLogin')}</span>
          </h1>
          <p className="text-gray-600">{t('accessControlPanel')}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{t('emailAddress')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-gray-900 font-medium"
              placeholder="admin@floodsense.org"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">{t('password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-gray-900 font-medium"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-cyan-700 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                {t('loggingIn')}
              </span>
            ) : (
              t('loginToDashboard')
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>{t('protectedBySecurity')}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
