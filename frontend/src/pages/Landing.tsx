import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { usePerformanceProfile } from '../hooks/usePerformanceProfile';
import { useSystemAccuracy } from '../hooks/useSystemAccuracy';

type LandingStats = {
  predictions: number | null;
  communities: number | null;
};

type CachedLandingStats = {
  stats: LandingStats;
  timestamp: string;
};

const DEFAULT_STATS: LandingStats = { predictions: null, communities: null };
const STATS_CACHE_KEY = 'landing_stats_cache';

const readCachedStats = (): CachedLandingStats | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STATS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedLandingStats;
  } catch {
    return null;
  }
};

const cacheLandingStats = (stats: LandingStats, timestamp: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ stats, timestamp }));
  } catch (error) {
    console.warn('Unable to cache landing stats', error);
  }
};

const Landing: React.FC = () => {
  const { isOffline } = useNetworkStatus();
  const { shouldReduceMotion } = usePerformanceProfile();
  const { accuracyLabel, isLoading: accuracyLoading } = useSystemAccuracy({ refreshIntervalMs: 60_000 });
  const [stats, setStats] = useState<LandingStats>(DEFAULT_STATS);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const accuracyDisplay = accuracyLabel === '—'
    ? (accuracyLoading ? 'Loading...' : 'Unavailable')
    : accuracyLabel;

  useEffect(() => {
    const cached = readCachedStats();
    if (cached) {
      setStats(cached.stats);
      setLastUpdated(cached.timestamp);
    }
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiService.getSystemStats();
        const normalizedStats: LandingStats = {
          predictions: typeof data.total_predictions === 'number' ? data.total_predictions : 0,
          communities: typeof data.total_users === 'number' ? data.total_users : 0
        };
        const timestamp = new Date().toISOString();
        setStats(normalizedStats);
        setLastUpdated(timestamp);
        cacheLandingStats(normalizedStats, timestamp);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        const cached = readCachedStats();
        if (cached) {
          setStats(cached.stats);
          setLastUpdated(cached.timestamp);
        } else {
          setStats({ predictions: 0, communities: 0 });
        }
      }
    };

    if (isOffline) {
      const cached = readCachedStats();
      if (cached) {
        setStats(cached.stats);
        setLastUpdated(cached.timestamp);
      }
      return;
    }

    fetchStats();
  }, [isOffline]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-40"></div>

        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-20 w-32 h-32 bg-blue-200/30 rounded-full blur-xl"
            animate={shouldReduceMotion ? { opacity: 0.4 } : {
              y: [0, 20, 0],
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 right-20 w-40 h-40 bg-cyan-200/30 rounded-full blur-xl"
            animate={shouldReduceMotion ? { opacity: 0.3 } : {
              y: [0, -20, 0],
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 w-full">
          {isOffline && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
              <p className="text-sm sm:text-base">
                Offline mode active. Showing cached metrics
                {lastUpdated ? ` from ${new Date(lastUpdated).toLocaleString()}` : ''}.
              </p>
            </div>
          )}
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
            {/* Left Column - Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: "easeOut" }}
              className="space-y-8 text-center lg:text-left"
            >
              {/* Status Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium border border-green-200"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live Monitoring Active</span>
              </motion.div>

              {/* Main Heading */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="space-y-4 sm:space-y-5"
              >
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 bg-clip-text text-transparent">
                    FloodSense
                  </span>
                  <br />
                  <span className="text-slate-900">Protecting South Sudan</span>
                </h1>

                <p className="text-base sm:text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl">
                  AI-Powered Flood Prediction & Early Warning System leveraging advanced machine learning and real-time satellite data to protect communities across South Sudan.
                </p>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="flex flex-col sm:flex-row gap-4 sm:gap-6"
              >
                <Link to="/home">
                  <motion.button
                    className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 w-full sm:w-auto"
                    whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                  >
                    Launch Dashboard
                  </motion.button>
                </Link>
                <Link to="/map">
                  <motion.button
                    className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-700 font-semibold rounded-xl border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 hover:scale-105 w-full sm:w-auto"
                    whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                  >
                    View Live Map
                  </motion.button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Right Column - Stats Dashboard */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.8, delay: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" }}
              className="relative max-w-xl mx-auto lg:mx-0"
            >
              <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-slate-200">
                <div className="space-y-4 sm:space-y-6">
                  {/* Predictions Card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: shouldReduceMotion ? 0 : 0.6, duration: shouldReduceMotion ? 0 : 0.6 }}
                    className="flex items-center justify-between p-5 sm:p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl border border-blue-200 gap-4"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Predictions Made</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {stats.predictions === null ? 'Loading...' : stats.predictions.toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-600">Real-time AI predictions</p>
                    </div>
                  </motion.div>

                  {/* Communities Card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: shouldReduceMotion ? 0 : 0.7, duration: shouldReduceMotion ? 0 : 0.6 }}
                    className="flex items-center justify-between p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-2xl border border-green-200"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Active Communities</p>
                      <p className="text-3xl font-bold text-green-900">
                        {stats.communities === null ? 'Loading...' : stats.communities.toLocaleString()}
                      </p>
                      <p className="text-xs text-green-600">Protected communities</p>
                    </div>
                  </motion.div>

                  {/* Accuracy Card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: shouldReduceMotion ? 0 : 0.8, duration: shouldReduceMotion ? 0 : 0.6 }}
                    className="flex items-center justify-between p-6 bg-gradient-to-r from-cyan-50 to-cyan-100 rounded-2xl border border-cyan-200"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-cyan-700 uppercase tracking-wide">System Accuracy</p>
                      <p className="text-3xl font-bold text-cyan-900">{accuracyDisplay}</p>
                      <p className="text-xs text-cyan-600">AI prediction accuracy (global)</p>
                    </div>
                  </motion.div>
                </div>
                <div className="pt-4 text-center text-xs text-slate-500">
                  {isOffline && 'Offline cache active. '}
                  {lastUpdated ? `Last refreshed ${new Date(lastUpdated).toLocaleString()}` : 'Awaiting live metrics...'}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>



      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-24 bg-white w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.8 }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
              <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed px-4">
              Cutting-edge technology meets humanitarian impact. Our advanced AI system delivers life-saving predictions with unprecedented accuracy.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {[
              {
                title: 'AI-Powered Predictions',
                desc: 'Ensemble machine learning models using Random Forest and TCN architectures',
                color: 'from-blue-500 to-blue-600'
              },
              {
                title: 'Real-Time Early Warnings',
                desc: 'Instant alerts delivered 1-168 hours in advance with multi-channel notification system',
                color: 'from-green-500 to-green-600'
              },
              {
                title: 'Nationwide Coverage',
                desc: 'Comprehensive monitoring across all 10 states with 24/7 satellite surveillance',
                color: 'from-cyan-500 to-cyan-600'
              },
              {
                title: 'Sentinel-1 SAR Data',
                desc: 'High-resolution satellite imagery from Google Earth Engine for precise flood detection',
                color: 'from-yellow-500 to-yellow-600'
              },
              {
                title: 'Smart GIS Integration',
                desc: 'Intelligent infrastructure recommendations and evacuation route optimization',
                color: 'from-indigo-500 to-indigo-600'
              },
              {
                title: 'Offline PWA Support',
                desc: 'Progressive Web App with 24-hour offline access for remote communities',
                color: 'from-gray-500 to-gray-600'
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: shouldReduceMotion ? 0 : idx * 0.1, duration: shouldReduceMotion ? 0 : 0.6 }}
                whileHover={shouldReduceMotion ? undefined : { y: -8, scale: 1.02 }}
                className="group relative bg-white rounded-2xl p-5 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 h-full"
              >
                <div className="space-y-3 sm:space-y-4 h-full flex flex-col">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors duration-300 leading-tight">
                        {feature.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors duration-300 text-sm flex-1">
                    {feature.desc}
                  </p>

                  <div className="pt-2">
                    <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${feature.color} rounded-full`}
                        initial={{ width: shouldReduceMotion ? '100%' : '0%' }}
                        whileInView={{ width: '100%' }}
                        viewport={{ once: true }}
                        transition={{ delay: shouldReduceMotion ? 0 : idx * 0.1 + 0.5, duration: shouldReduceMotion ? 0 : 1.2, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-700 relative overflow-hidden w-full">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: 'radial-gradient(circle, white 2px, transparent 2px)',
            backgroundSize: '60px 60px'
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.8 }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-white">Making Real Impact</h2>
            <p className="text-lg sm:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed px-4">
              Every prediction saves lives. Every alert protects families. Every day, we're building a safer South Sudan through cutting-edge technology and community collaboration.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12 lg:mb-16">
            {[
              {
                value: stats.predictions === null ? 'Loading...' : `${stats.predictions.toLocaleString()}+`,
                label: 'Total Predictions',
                desc: 'AI-powered flood forecasts'
              },
              {
                value: '24/7',
                label: 'Continuous Monitoring',
                desc: 'Real-time satellite surveillance'
              },
              {
                value: accuracyDisplay,
                label: 'System Accuracy',
                desc: 'Advanced ML precision'
              }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: shouldReduceMotion ? 0 : idx * 0.2, duration: shouldReduceMotion ? 0 : 0.6 }}
                className="text-center p-6 sm:p-8 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300"
              >
                <div className="text-4xl font-bold mb-2 text-white">{stat.value}</div>
                <div className="text-lg font-semibold text-white/90 mb-2">{stat.label}</div>
                <div className="text-sm text-white/70">{stat.desc}</div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.8 }}
            className="text-center"
          >
            <Link to="/home">
              <motion.button
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-700 font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105"
                whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
              >
                Get Started Now
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer rendered by App.tsx */}
    </div>
  );
};

export default Landing;
