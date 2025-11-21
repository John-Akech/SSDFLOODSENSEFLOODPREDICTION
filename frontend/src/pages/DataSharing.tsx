import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import '../styles/flood-colors.css';
import { useSystemAccuracy } from '../hooks/useSystemAccuracy';
import { apiService } from '../services/api';

const DataSharing: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { accuracyLabel, isLoading: accuracyLoading } = useSystemAccuracy({ refreshIntervalMs: 60000 });
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiService.getSystemStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
  }, []);

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
      color: 'from-blue-500 to-blue-600',
      desc: 'Visual observations of flood conditions, water levels, and extent'
    },
    {
      value: 'rainfall_data',
      label: 'Rainfall Data',
      color: 'from-cyan-500 to-cyan-600',
      desc: 'Precipitation measurements and rainfall records'
    },
    {
      value: 'satellite_imagery',
      label: 'Satellite Imagery',
      color: 'from-purple-500 to-purple-600',
      desc: 'Remote sensing data and satellite images'
    },
    {
      value: 'infrastructure_data',
      label: 'Infrastructure',
      color: 'from-indigo-500 to-indigo-600',
      desc: 'Roads, buildings, and critical facilities data'
    },
    {
      value: 'community_feedback',
      label: 'Community Feedback',
      color: 'from-green-500 to-green-600',
      desc: 'Local knowledge, community reports, and feedback'
    },
    {
      value: 'other',
      label: 'Other Data',
      color: 'from-gray-500 to-gray-600',
      desc: 'Additional relevant information and data'
    }
  ];

  const benefits = [
    {
      text: 'Improve AI Model Accuracy',
      color: 'text-blue-600'
    },
    {
      text: 'Protect Your Community',
      color: 'text-green-600'
    },
    {
      text: 'Contribute to Research',
      color: 'text-purple-600'
    },
    {
      text: 'Better Early Warnings',
      color: 'text-orange-600'
    }
  ];

  // Determine which section to show based on route
  const isDataSources = currentPath === '/data-sources';

  // Render Data Sources page
  if (isDataSources) {
    return (
      <div className="pb-16">
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
                  color: 'from-purple-500 to-purple-600',
                  features: ['Sentinel-1 SAR', 'Landsat imagery', 'Real-time updates']
                },
                {
                  title: 'Weather Data',
                  provider: 'Meteorological Services',
                  description: 'Rainfall, temperature, and weather forecast data for predictive modeling.',
                  color: 'from-cyan-500 to-cyan-600',
                  features: ['Historical records', 'Live forecasts', 'Multi-station data']
                },
                {
                  title: 'Hydrological Data',
                  provider: 'Water Resource Management',
                  description: 'River levels, water flow measurements, and basin monitoring data.',
                  color: 'from-blue-500 to-blue-600',
                  features: ['River gauges', 'Water levels', 'Flow rates']
                },
                {
                  title: 'Ground Observations',
                  provider: 'Community Reports',
                  description: 'On-the-ground observations and citizen science contributions.',
                  color: 'from-green-500 to-green-600',
                  features: ['Crowdsourced data', 'Community feedback', 'Field reports']
                },
                {
                  title: 'Infrastructure Data',
                  provider: 'Government Agencies',
                  description: 'Roads, buildings, and critical infrastructure locations for risk assessment.',
                  color: 'from-indigo-500 to-indigo-600',
                  features: ['GIS databases', 'Asset inventories', 'Spatial layers']
                },
                {
                  title: 'DEM & Elevation',
                  provider: 'Topographic Surveys',
                  description: 'Digital Elevation Models and terrain data for flood modeling.',
                  color: 'from-amber-500 to-amber-600',
                  features: ['Elevation maps', 'Terrain analysis', 'Slope data']
                }
              ].map((source, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flood-card p-6 h-full flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{source.title}</h3>
                    <p className="text-sm text-blue-600 font-medium mb-3">{source.provider}</p>
                    <p className="text-slate-600 text-sm mb-4">{source.description}</p>
                  </div>
                  <ul className="space-y-2">
                    {source.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2 text-xs text-slate-500">
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
    <div className="min-h-screen pb-20">
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
                {
                  num: stats ? stats.total_predictions.toLocaleString() : '2,345',
                  label: 'Total Predictions',
                  color: 'from-blue-500 to-blue-600'
                },
                {
                  num: stats ? stats.total_users.toLocaleString() : '487',
                  label: 'Active Contributors',
                  color: 'from-green-500 to-green-600'
                },
                {
                  num: accuracyLoading ? 'Updating...' : (accuracyLabel || '-'),
                  label: 'System Accuracy',
                  color: 'from-purple-500 to-purple-600'
                },
                {
                  num: stats && stats.population_by_state ? Object.keys(stats.population_by_state).length.toString() : '10',
                  label: 'States Covered',
                  color: 'from-cyan-500 to-cyan-600'
                }
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="bg-white rounded-2xl shadow-xl p-6 border-2 border-slate-200 hover:border-blue-300 transition-all duration-300"
                >
                  <p className="text-3xl font-black text-slate-900 mb-2">{stat.num}</p>
                  <p className="text-sm font-semibold text-slate-600">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Main Content - Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
            {/* Left Sidebar - Data Types */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-slate-200 sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  Data Types
                </h3>
                <div className="space-y-4">
                  {dataTypes.map((type) => (
                    <motion.button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, dataType: type.value })}
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm transition-all duration-200 ${formData.dataType === type.value
                        ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-500 shadow-lg ring-2 ring-blue-200'
                        : 'bg-white border-gray-200 text-gray-800 hover:border-blue-300 hover:shadow-md'
                        }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3 mb-2 justify-center text-center">
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-base block leading-tight">{type.label}</span>
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
                      <p className="text-xs text-gray-600 leading-relaxed break-words">{type.desc}</p>
                    </motion.button>
                  ))}
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl p-8 border-2 border-green-200 mt-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
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
                        <div className="hidden">
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
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-2xl p-10 border-2 border-slate-200">
                <div className="mb-8">
                  <h3 className="text-3xl font-black text-gray-900 mb-3 flex items-center gap-3">
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
