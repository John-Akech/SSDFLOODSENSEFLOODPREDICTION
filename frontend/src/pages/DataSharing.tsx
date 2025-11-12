import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { apiService } from '../services/api';
import '../styles/flood-colors.css';

const DataSharing: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [modelAccuracy, setModelAccuracy] = useState<number>(0);
  const [formData, setFormData] = useState({
    dataType: 'flood_observation',
    location: '',
    date: '',
    description: '',
    file: null as File | null,
    contactEmail: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch real model accuracy
  useEffect(() => {
    const fetchModelAccuracy = async () => {
      try {
        const stats = await apiService.getSystemStats();
        const accuracy = stats?.accuracy_metrics?.overall_accuracy || 0;
        setModelAccuracy(accuracy);
      } catch (error) {
        console.error('Failed to fetch model accuracy:', error);
      }
    };
    fetchModelAccuracy();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    // Simulate upload
    setTimeout(() => {
      setSubmitted(true);
      setUploading(false);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          dataType: 'flood_observation',
          location: '',
          date: '',
          description: '',
          file: null,
          contactEmail: ''
        });
      }, 3000);
    }, 2000);
  };

  const dataTypes = [
    {
      value: 'flood_observation',
      label: 'Flood Observation',
      icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
      color: 'from-blue-500 to-blue-600',
      desc: 'Visual observations of flood conditions, water levels, and extent'
    },
    {
      value: 'rainfall_data',
      label: 'Rainfall Data',
      icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
      color: 'from-cyan-500 to-cyan-600',
      desc: 'Precipitation measurements and rainfall records'
    },
    {
      value: 'satellite_imagery',
      label: 'Satellite Imagery',
      icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
      color: 'from-purple-500 to-purple-600',
      desc: 'Remote sensing data and satellite images'
    },
    {
      value: 'infrastructure_data',
      label: 'Infrastructure',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      color: 'from-indigo-500 to-indigo-600',
      desc: 'Roads, buildings, and critical facilities data'
    },
    {
      value: 'community_feedback',
      label: 'Community Feedback',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      color: 'from-green-500 to-green-600',
      desc: 'Local knowledge, community reports, and feedback'
    },
    {
      value: 'other',
      label: 'Other Data',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      color: 'from-gray-500 to-gray-600',
      desc: 'Additional relevant information and data'
    }
  ];

  const benefits = [
    {
      text: 'Improve AI Model Accuracy',
      icon: 'M13 10V3L4 14h7v7l9-11h-7z',
      color: 'text-blue-600'
    },
    {
      text: 'Protect Your Community',
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      color: 'text-green-600'
    },
    {
      text: 'Contribute to Research',
      icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
      color: 'text-purple-600'
    },
    {
      text: 'Better Early Warnings',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      color: 'text-orange-600'
    }
  ];

  // Determine which section to show based on route
  const isDataSources = currentPath === '/data-sources';

  // Render Data Sources page
  if (isDataSources) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 rounded-full text-sm font-semibold mb-6 border border-blue-200 shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                Data Sources & Integration
              </motion.div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 bg-clip-text text-transparent">
                Available Data Sources
              </h1>
              <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
                Explore the comprehensive data sources used by FloodSense for flood prediction and monitoring across South Sudan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {[
                {
                  title: 'Satellite Imagery',
                  provider: 'Google Earth Engine',
                  description: 'High-resolution satellite data for flood extent detection and monitoring.',
                  icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
                  color: 'from-purple-500 to-purple-600',
                  features: ['Sentinel-1 SAR', 'Landsat imagery', 'Real-time updates']
                },
                {
                  title: 'Weather Data',
                  provider: 'Meteorological Services',
                  description: 'Rainfall, temperature, and weather forecast data for predictive modeling.',
                  icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
                  color: 'from-cyan-500 to-cyan-600',
                  features: ['Historical records', 'Live forecasts', 'Multi-station data']
                },
                {
                  title: 'Hydrological Data',
                  provider: 'Water Resource Management',
                  description: 'River levels, water flow measurements, and basin monitoring data.',
                  icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                  color: 'from-blue-500 to-blue-600',
                  features: ['River gauges', 'Water levels', 'Flow rates']
                },
                {
                  title: 'Ground Observations',
                  provider: 'Community Reports',
                  description: 'On-the-ground observations and citizen science contributions.',
                  icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
                  color: 'from-green-500 to-green-600',
                  features: ['Crowdsourced data', 'Community feedback', 'Field reports']
                },
                {
                  title: 'Infrastructure Data',
                  provider: 'Government Agencies',
                  description: 'Roads, buildings, and critical infrastructure locations for risk assessment.',
                  icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
                  color: 'from-indigo-500 to-indigo-600',
                  features: ['GIS databases', 'Asset inventories', 'Spatial layers']
                },
                {
                  title: 'DEM & Elevation',
                  provider: 'Topographic Surveys',
                  description: 'Digital Elevation Models and terrain data for flood modeling.',
                  icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
                  color: 'from-amber-500 to-amber-600',
                  features: ['Elevation maps', 'Terrain analysis', 'Slope data']
                }
              ].map((source, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flood-card p-6"
                >
                  <div className={`w-12 h-12 bg-gradient-to-r ${source.color} rounded-xl flex items-center justify-center mb-4`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={source.icon} />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{source.title}</h3>
                  <p className="text-sm text-blue-600 font-medium mb-3">{source.provider}</p>
                  <p className="text-slate-600 text-sm mb-4">{source.description}</p>
                  <ul className="space-y-2">
                    {source.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2 text-xs text-slate-500">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flood-card p-8"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Data Integration Process</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { step: '01', title: 'Collection', desc: 'Automated data collection from multiple sources' },
                  { step: '02', title: 'Processing', desc: 'Data cleaning, validation, and standardization' },
                  { step: '03', title: 'Analysis', desc: 'Integration into ML models and risk algorithms' },
                  { step: '04', title: 'Visualization', desc: 'Real-time dashboards and map displays' }
                ].map((item, idx) => (
                  <div key={idx} className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">
                      {item.step}
                    </div>
                    <h4 className="font-semibold text-slate-900 mb-2">{item.title}</h4>
                    <p className="text-sm text-slate-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Default: Data Sharing form
  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header Section */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 rounded-full text-base font-bold mb-8 border-2 border-blue-300 shadow-xl"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Data Contribution Portal - Help Build Better Predictions
            </motion.div>

            <h1 className="text-6xl md:text-7xl font-extrabold mb-8 bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 bg-clip-text text-transparent leading-tight">
              Share Your Data
            </h1>
            <p className="text-2xl text-slate-700 max-w-4xl mx-auto leading-relaxed font-medium mb-8">
              Help improve flood predictions by sharing your observations, measurements, and local knowledge.
              <span className="block mt-4 text-xl text-blue-600 font-bold">Every contribution makes a difference in protecting communities across South Sudan!</span>
            </p>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto mt-12">
              {[
                { num: '2,345', label: 'Data Contributions', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'from-blue-500 to-blue-600' },
                { num: '487', label: 'Active Contributors', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', color: 'from-green-500 to-green-600' },
                { num: modelAccuracy > 0 ? `${Math.round(modelAccuracy * 100)}%` : '-', label: 'Model Accuracy', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', color: 'from-purple-500 to-purple-600' },
                { num: '12', label: 'Counties Covered', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'from-cyan-500 to-cyan-600' }
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="bg-white rounded-2xl shadow-xl p-6 border-2 border-slate-200 hover:border-blue-300 transition-all duration-300"
                >
                  <div className={`w-14 h-14 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                    </svg>
                  </div>
                  <p className="text-3xl font-black text-slate-900 mb-2">{stat.num}</p>
                  <p className="text-sm font-semibold text-slate-600">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Main Content - Grid Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-10 items-start">
            {/* Left Sidebar - Data Types */}
            <div className="xl:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-slate-200 sticky top-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </div>
                  Data Types
                </h3>
                <div className="space-y-3">
                  {dataTypes.map((type) => (
                    <motion.button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, dataType: type.value })}
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm transition-all duration-200 ${formData.dataType === type.value
                        ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-500 shadow-lg scale-105'
                        : 'bg-white border-gray-200 text-gray-800 hover:border-blue-300 hover:shadow-md'
                        }`}
                      whileHover={{ scale: formData.dataType !== type.value ? 1.02 : 1.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 bg-gradient-to-r ${type.color} rounded-lg flex items-center justify-center shadow-md`}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={type.icon} />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-base block">{type.label}</span>
                          {formData.dataType === type.value && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="text-xs px-2 py-1 rounded-full bg-blue-500 text-white font-semibold inline-block mt-1"
                            >
                              Selected
                            </motion.span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{type.desc}</p>
                    </motion.button>
                  ))}
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl p-8 border-2 border-green-200 mt-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    Why Share?
                  </h3>
                  <ul className="space-y-4">
                    {benefits.map((item, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + idx * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div className={`w-8 h-8 bg-gradient-to-br ${item.color.replace('text-', 'from-')} to-${item.color.split('-')[1]}-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md`}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{item.text}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {idx === 0 && 'Your data trains better AI models'}
                            {idx === 1 && 'Help save lives in your community'}
                            {idx === 2 && 'Support scientific research'}
                            {idx === 3 && 'Enable faster emergency response'}
                          </p>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Main Form Area */}
            <div className="xl:col-span-3">
              <div className="bg-white rounded-2xl shadow-2xl p-10 border-2 border-slate-200">
                <div className="mb-8">
                  <h3 className="text-3xl font-black text-gray-900 mb-3 flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    Upload Your Data
                  </h3>
                  <p className="text-lg text-gray-600">Fill out the form below to contribute your valuable data to our flood prediction system</p>
                </div>

                <AnimatePresence mode="wait">
                  {!submitted ? (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleSubmit}
                      className="space-y-6"
                    >
                      {/* Form Fields Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="min-w-0">
                          <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Location
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 text-gray-900 break-words"
                            placeholder="e.g., Bor County, Jonglei State"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Date of Observation
                          </label>
                          <input
                            type="date"
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Description
                        </label>
                        <textarea
                          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 text-gray-900 resize-none break-words"
                          rows={4}
                          placeholder="Describe your observation or data in detail..."
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Upload File (Optional)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-200">
                          <input
                            type="file"
                            className="hidden"
                            id="file-upload"
                            onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                            accept=".csv,.xlsx,.jpg,.png,.pdf"
                          />
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <p className="text-base text-gray-700 font-medium mb-2">
                              {formData.file ? formData.file.name : 'Click to upload or drag and drop'}
                            </p>
                            <p className="text-sm text-gray-500">CSV, Excel, Images, or PDF (max 10MB)</p>
                          </label>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Contact Email
                        </label>
                        <input
                          type="email"
                          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 text-gray-900 break-words"
                          placeholder="your.email@example.com"
                          value={formData.contactEmail}
                          onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                          required
                        />
                      </div>

                      {/* Privacy Notice */}
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-5">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-1">Privacy & Security</h4>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              Your data will be used solely for improving flood prediction models.
                              All personal information will be kept confidential and secure in compliance with data protection regulations.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <motion.button
                        type="submit"
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={uploading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {uploading ? (
                          <span className="flex items-center justify-center gap-3">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Uploading...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-3">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Submit Data Contribution
                          </span>
                        )}
                      </motion.button>
                    </motion.form>
                  ) : (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-10 rounded-xl text-center shadow-2xl border border-green-400"
                    >
                      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-3">Data Submitted Successfully!</h3>
                      <p className="text-lg opacity-95 mb-6">Thank you for contributing to flood prediction research. Your data will help protect communities across South Sudan.</p>
                      <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 rounded-full text-base font-semibold backdrop-blur-sm">
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                        Your contribution is being processed
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DataSharing;
