import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/flood-colors.css';

const DataSharing: React.FC = () => {
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

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header Section */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 rounded-full text-sm font-semibold mb-6 border border-blue-200 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Data Contribution Portal
            </motion.div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 bg-clip-text text-transparent">
              Share Your Data
            </h1>
            <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
              Help improve flood predictions by sharing your observations, measurements, and local knowledge. 
              Every contribution makes a difference in protecting communities.
            </p>
          </div>

          {/* Main Content - Grid Layout (minimalist, no cards) */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 md:gap-10 items-start">
            {/* Left Sidebar - Data Types (plain list) */}
            <div className="xl:col-span-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Data Types</h3>
              <div className="space-y-2">
                {dataTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, dataType: type.value })}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                      formData.dataType === type.value
                        ? 'bg-blue-50 border-blue-400 text-blue-800'
                        : 'bg-white border-gray-200 text-gray-800 hover:border-blue-300'
                    }`}
                    aria-pressed={formData.dataType === type.value}
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="font-medium">{type.label}</span>
                      {formData.dataType === type.value && (
                        <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Selected</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">{type.desc}</div>
                  </button>
                ))}
              </div>

              <h3 className="text-base font-semibold text-gray-900 mt-8 mb-3">Why Share?</h3>
              <ul className="space-y-2">
                {benefits.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Main Form Area (plain section) */}
            <div className="xl:col-span-3 min-w-0">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Your Data</h3>
              <p className="text-gray-600 mb-6">Fill out the form below to contribute your data</p>
                
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
        </motion.div>
      </div>
    </div>
  );
};

export default DataSharing;
