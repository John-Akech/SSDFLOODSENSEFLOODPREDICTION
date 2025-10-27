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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl"
            animate={{ y: [0, 30, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl"
            animate={{ y: [0, -40, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full text-sm font-medium mb-6 shadow-lg">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                Live Monitoring Active
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 bg-clip-text text-transparent">
                  FloodSense
                </span>
                <br />
                <span className="text-gray-900">Protecting South Sudan</span>
              </h1>
              
              <p className="text-xl text-gray-700 mb-4 leading-relaxed font-semibold">
                Community-Based Predictive Flood Forecasting and Early Warning System Using SAR and AI
              </p>
              
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Leveraging Sentinel-1 SAR satellite data, lightweight AI models (Random Forest & TCN), and GIS-based recommendations to deliver real-time flood predictions and early warnings across South Sudan's flood-prone states.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link to="/home">
                  <motion.button
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Launch Dashboard
                  </motion.button>
                </Link>
                <Link to="/map">
                  <motion.button
                    className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-blue-600"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    View Live Map
                  </motion.button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 backdrop-blur-xl border border-white/50">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl rotate-12 opacity-80"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl -rotate-12 opacity-80"></div>
                
                <div className="relative space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Predictions Made</p>
                      <p className="text-3xl font-bold text-blue-600">{stats.predictions > 0 ? stats.predictions.toLocaleString() : 'Loading...'}</p>
                    </div>
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Active Users</p>
                      <p className="text-3xl font-bold text-green-600">{stats.communities > 0 ? stats.communities : 'Loading...'}</p>
                    </div>
                    <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Model Accuracy</p>
                      <p className="text-3xl font-bold text-purple-600">{stats.accuracy}%</p>
                    </div>
                    <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>



      {/* Features */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Powerful Features</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Cutting-edge technology meets humanitarian impact
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'AI Predictions', desc: 'Ensemble ML models with high accuracy', color: 'from-blue-500 to-cyan-500' },
              { title: 'Early Warnings', desc: 'Real-time alerts 1-168 hours in advance', color: 'from-green-500 to-emerald-500' },
              { title: 'Nationwide Coverage', desc: 'All 10 states monitored 24/7', color: 'from-purple-500 to-pink-500' },
              { title: 'Satellite Data', desc: 'SAR imagery from Google Earth Engine', color: 'from-orange-500 to-red-500' },
              { title: 'GIS Integration', desc: 'Smart infrastructure recommendations', color: 'from-indigo-500 to-blue-500' },
              { title: 'Offline Ready', desc: 'PWA with 24-hour offline access', color: 'from-yellow-500 to-amber-500' }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -8 }}
                className="group relative p-8 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-100"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity`}></div>
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl mb-4 flex items-center justify-center`}>
                  <div className="w-8 h-8 bg-white rounded-lg"></div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Making Real Impact</h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Every prediction saves lives. Every alert protects families. Every day, we're building a safer South Sudan.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              { value: stats.predictions > 0 ? `${stats.predictions}+` : 'Loading...', label: 'Total Predictions' },
              { value: '24/7', label: 'Monitoring' },
              { value: stats.accuracy > 0 ? `${stats.accuracy}%` : 'Loading...', label: 'Model Accuracy' }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="text-center p-8 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20"
              >
                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-blue-100">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Link to="/home">
              <motion.button
                className="px-12 py-5 bg-white text-blue-600 font-bold text-lg rounded-xl shadow-2xl hover:shadow-3xl transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started Now
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-xl mb-4">FloodSense</h3>
              <p className="text-sm">AI-powered flood prediction system protecting communities across South Sudan.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2 text-sm">
                <Link to="/home" className="block hover:text-white transition">Dashboard</Link>
                <Link to="/map" className="block hover:text-white transition">Live Map</Link>
                <Link to="/analytics" className="block hover:text-white transition">Analytics</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <p className="text-sm">Email: support@floodsense.org</p>
              <p className="text-sm">Emergency: +211 XXX XXX XXX</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p className="mb-2">© 2025 FloodSense. Built for South Sudan communities.</p>
            <p className="text-xs text-gray-500">Leveraging SAR satellite data and AI for humanitarian impact</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
