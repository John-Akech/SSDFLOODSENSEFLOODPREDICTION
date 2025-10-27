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
    { value: 'flood_observation', label: 'Flood Observation Data', icon: '💧' },
    { value: 'rainfall_data', label: 'Rainfall Measurements', icon: '🌧️' },
    { value: 'satellite_imagery', label: 'Satellite Imagery', icon: '🛰️' },
    { value: 'infrastructure_data', label: 'Infrastructure Data', icon: '🏗️' },
    { value: 'community_feedback', label: 'Community Feedback', icon: '👥' },
    { value: 'other', label: 'Other Data', icon: '📊' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Share Your Data
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Help improve flood predictions by sharing your observations, measurements, and local knowledge with our research team.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Data Types */}
            <div className="lg:col-span-1">
              <div className="glass-card">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Data Types We Accept</h3>
                <div className="space-y-3">
                  {dataTypes.map((type, idx) => (
                    <motion.div
                      key={type.value}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        formData.dataType === type.value
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                      onClick={() => setFormData({ ...formData, dataType: type.value })}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{type.icon}</span>
                        <span className="font-semibold text-gray-900 text-sm">{type.label}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="glass-card mt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Why Share Data?</h3>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Improve AI model accuracy</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Help protect your community</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Contribute to research</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Build better early warnings</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Upload Form */}
            <div className="lg:col-span-2">
              <div className="glass-card">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Upload Your Data</h3>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g., Bor County, Jonglei State"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Date of Observation
                    </label>
                    <input
                      type="date"
                      className="input-field"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Description
                    </label>
                    <textarea
                      className="input-field"
                      rows={4}
                      placeholder="Describe your observation or data in detail..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Upload File (Optional)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                      <input
                        type="file"
                        className="hidden"
                        id="file-upload"
                        onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                        accept=".csv,.xlsx,.jpg,.png,.pdf"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-gray-600 font-medium">
                          {formData.file ? formData.file.name : 'Click to upload or drag and drop'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">CSV, Excel, Images, or PDF (max 10MB)</p>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="your.email@example.com"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      required
                    />
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Privacy Notice:</strong> Your data will be used solely for improving flood prediction models. 
                      All personal information will be kept confidential and secure.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-3">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      'Submit Data'
                    )}
                  </button>

                  {submitted && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-xl text-center shadow-lg"
                    >
                      <svg className="w-16 h-16 mx-auto mb-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xl font-bold mb-2">Data Submitted Successfully!</p>
                      <p className="text-sm opacity-90">Thank you for contributing to flood prediction research.</p>
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
