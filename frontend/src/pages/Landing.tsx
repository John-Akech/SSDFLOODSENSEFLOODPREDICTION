import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';

const Landing: React.FC = () => {
  const [stats, setStats] = useState({ predictions: 0, communities: 0, accuracy: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiService.getSystemStats();
        setStats({
          predictions: data.total_predictions || 0,
          communities: data.total_users || 0,
          accuracy: Math.round((data.accuracy_metrics?.overall_accuracy || 0) * 100)
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setStats({ predictions: 0, communities: 0, accuracy: 0 });
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 w-full overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>

        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-20 w-32 h-32 bg-blue-200/30 rounded-full blur-xl"
            animate={{
              y: [0, 20, 0],
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 right-20 w-40 h-40 bg-cyan-200/30 rounded-full blur-xl"
            animate={{
              y: [0, -20, 0],
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
            {/* Left Column - Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-8"
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
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Launch Dashboard
                  </motion.button>
                </Link>
                <Link to="/map">
                  <motion.button
                    className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-700 font-semibold rounded-xl border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 hover:scale-105 w-full sm:w-auto"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    View Live Map
                  </motion.button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Right Column - Stats Dashboard */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="relative"
            >
              <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-slate-200">
                <div className="space-y-4 sm:space-y-6">
                  {/* Predictions Card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    className="flex items-center justify-between p-5 sm:p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl border border-blue-200 gap-4"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Predictions Made</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {stats.predictions > 0 ? stats.predictions.toLocaleString() : 'Loading...'}
                      </p>
                      <p className="text-xs text-blue-600">Real-time AI predictions</p>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </motion.div>

                  {/* Communities Card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7, duration: 0.6 }}
                    className="flex items-center justify-between p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-2xl border border-green-200"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Active Communities</p>
                      <p className="text-3xl font-bold text-green-900">
                        {stats.communities > 0 ? stats.communities : 'Loading...'}
                      </p>
                      <p className="text-xs text-green-600">Protected communities</p>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </motion.div>

                  {/* Accuracy Card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    className="flex items-center justify-between p-6 bg-gradient-to-r from-cyan-50 to-cyan-100 rounded-2xl border border-cyan-200"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-cyan-700 uppercase tracking-wide">Model Accuracy</p>
                      <p className="text-3xl font-bold text-cyan-900">{stats.accuracy}%</p>
                      <p className="text-xs text-cyan-600">AI prediction accuracy</p>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </motion.div>
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
            transition={{ duration: 0.8 }}
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
                color: 'from-blue-500 to-blue-600',
                icon: 'Brain'
              },
              {
                title: 'Real-Time Early Warnings',
                desc: 'Instant alerts delivered 1-168 hours in advance with multi-channel notification system',
                color: 'from-green-500 to-green-600',
                icon: 'Alert'
              },
              {
                title: 'Nationwide Coverage',
                desc: 'Comprehensive monitoring across all 10 states with 24/7 satellite surveillance',
                color: 'from-cyan-500 to-cyan-600',
                icon: 'Map'
              },
              {
                title: 'Sentinel-1 SAR Data',
                desc: 'High-resolution satellite imagery from Google Earth Engine for precise flood detection',
                color: 'from-yellow-500 to-yellow-600',
                icon: 'Satellite'
              },
              {
                title: 'Smart GIS Integration',
                desc: 'Intelligent infrastructure recommendations and evacuation route optimization',
                color: 'from-indigo-500 to-indigo-600',
                icon: 'Infrastructure'
              },
              {
                title: 'Offline PWA Support',
                desc: 'Progressive Web App with 24-hour offline access for remote communities',
                color: 'from-gray-500 to-gray-600',
                icon: 'Mobile'
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.6 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative bg-white rounded-2xl p-5 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 h-full"
              >
                <div className="space-y-3 sm:space-y-4 h-full flex flex-col">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                      {feature.icon === 'Brain' && (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      )}
                      {feature.icon === 'Alert' && (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      {feature.icon === 'Map' && (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                      )}
                      {feature.icon === 'Satellite' && (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                      )}
                      {feature.icon === 'Infrastructure' && (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )}
                      {feature.icon === 'Mobile' && (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      )}
                      {feature.icon === 'Analytics' && (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      )}
                      {feature.icon === 'Target' && (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                      )}
                    </div>
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
                        initial={{ width: "0%" }}
                        whileInView={{ width: "100%" }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 + 0.5, duration: 1.2, ease: "easeOut" }}
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
            transition={{ duration: 0.8 }}
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
                value: stats.predictions > 0 ? `${stats.predictions}+` : 'Loading...',
                label: 'Total Predictions',
                desc: 'AI-powered flood forecasts',
                icon: 'Analytics'
              },
              {
                value: '24/7',
                label: 'Continuous Monitoring',
                desc: 'Real-time satellite surveillance',
                icon: 'Satellite'
              },
              {
                value: stats.accuracy > 0 ? `${stats.accuracy}%` : 'Loading...',
                label: 'Model Accuracy',
                desc: 'Advanced ML precision',
                icon: 'Target'
              }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2, duration: 0.6 }}
                className="text-center p-6 sm:p-8 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 hover:bg-white/15 transition-all duration-300"
              >
                <div className="flex justify-center mb-4">
                  {stat.icon === 'Analytics' && (
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  )}
                  {stat.icon === 'Satellite' && (
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  )}
                  {stat.icon === 'Target' && (
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  )}
                </div>
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
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <Link to="/home">
              <motion.button
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-700 font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
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
