import React, { useState } from 'react';
import { motion } from 'framer-motion';

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
    { value: 'flood_observation', label: 'Flood Observation Data', icon: 'Water' },
    { value: 'rainfall_data', label: 'Rainfall Measurements', icon: 'Rain' },
    { value: 'satellite_imagery', label: 'Satellite Imagery', icon: 'Satellite' },
    { value: 'infrastructure_data', label: 'Infrastructure Data', icon: 'Infrastructure' },
    { value: 'community_feedback', label: 'Community Feedback', icon: 'Community' },
    { value: 'other', label: 'Other Data', icon: 'Data' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 rounded-full text-sm font-semibold mb-6 border border-blue-200"
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
              Help improve flood predictions by sharing your observations, measurements, and local knowledge with our research team. Every contribution makes a difference.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Data Types */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Data Types We Accept</h3>
                </div>
                <div className="space-y-4">
                  {dataTypes.map((type, idx) => (
                    <motion.div
                      key={type.value}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer group ${
                        formData.dataType === type.value
                          ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-500 shadow-lg scale-105'
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-lg hover:scale-105'
                      }`}
                      onClick={() => setFormData({ ...formData, dataType: type.value })}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                          formData.dataType === type.value
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg'
                            : 'bg-slate-100 group-hover:bg-blue-100'
                        }`}>
                          {type.icon}
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-slate-900 text-sm">{type.label}</span>
                          {formData.dataType === type.value && (
                            <div className="flex items-center gap-1 mt-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-xs text-blue-600 font-semibold">Selected</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl p-8 border border-green-200 mt-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Why Share Data?</h3>
                </div>
                <ul className="space-y-4">
                  {[
                    { text: 'Improve AI model accuracy', icon: 'Target' },
                    { text: 'Help protect your community', icon: 'Shield' },
                    { text: 'Contribute to research', icon: 'Research' },
                    { text: 'Build better early warnings', icon: 'Alert' }
                  ].map((item, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-4 p-3 bg-white/60 rounded-xl hover:bg-white/80 transition-all duration-200"
                    >
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-lg">
                        {item.icon}
                      </div>
                      <span className="font-semibold text-slate-700">{item.text}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Upload Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-slate-900">Upload Your Data</h3>
                    <p className="text-slate-600">Fill out the form below to contribute your data</p>
                  </div>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-3">
                        Location
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-slate-400 text-slate-900 font-medium"
                        placeholder="e.g., Bor County, Jonglei State"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-3">
                        Date of Observation
                      </label>
                      <input
                        type="date"
                        className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-slate-900 font-medium"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-3">
                      Description
                    </label>
                    <textarea
                      className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-slate-400 text-slate-900 font-medium resize-none"
                      rows={4}
                      placeholder="Describe your observation or data in detail..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-3">
                      Upload File (Optional)
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-200 group">
                      <input
                        type="file"
                        className="hidden"
                        id="file-upload"
                        onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                        accept=".csv,.xlsx,.jpg,.png,.pdf"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-sm text-slate-700 font-semibold mb-2">
                          {formData.file ? formData.file.name : 'Click to upload or drag and drop'}
                        </p>
                        <p className="text-xs text-slate-500">CSV, Excel, Images, or PDF (max 10MB)</p>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-3">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-slate-400 text-slate-900 font-medium"
                      placeholder="your.email@example.com"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      required
                    />
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 mb-2">Privacy Notice</h4>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          Your data will be used solely for improving flood prediction models. 
                          All personal information will be kept confidential and secure.
                        </p>
                      </div>
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    className="w-full py-5 bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                    disabled={uploading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Uploading...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-3">
                        <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Submit Data
                      </span>
                    )}
                  </motion.button>

                  {submitted && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-8 rounded-2xl text-center shadow-2xl border border-green-400"
                    >
                      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold mb-3">Data Submitted Successfully!</h3>
                      <p className="text-lg opacity-90 mb-4">Thank you for contributing to flood prediction research.</p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm font-semibold">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        Your contribution is being processed
                      </div>
                    </motion.div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DataSharing;
