import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { apiService } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { forwardGeocode } from '../services/geocoding';

const Report: React.FC = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({ placeName: '', latitude: '', longitude: '', severity: 3, comments: '', flood_occurred: false });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [locationFound, setLocationFound] = useState(false);

  const handleSearchLocation = async () => {
    if (!formData.placeName.trim()) return;
    
    setSearchingLocation(true);
    try {
      const result = await forwardGeocode(formData.placeName);
      if (result) {
        setFormData(prev => ({ 
          ...prev, 
          latitude: result.lat.toFixed(6), 
          longitude: result.lon.toFixed(6),
          comments: `${result.displayName || formData.placeName}. ${prev.comments}`
        }));
        setLocationFound(true);
      } else {
        alert('Location not found in South Sudan. Please check the spelling and try again.');
        setLocationFound(false);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to find location. Please try again.');
      setLocationFound(false);
    } finally {
      setSearchingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.latitude || !formData.longitude) {
      alert('Please search for a location first.');
      return;
    }
    
    setLoading(true);
    try {
      await apiService.submitFeedback({
        feedback_type: 'community_report',
        rating: formData.severity,
        comments: `Location: ${formData.placeName}. ${formData.comments}`,
        flood_occurred: formData.flood_occurred,
        actual_severity: formData.severity / 5
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ placeName: '', latitude: '', longitude: '', severity: 3, comments: '', flood_occurred: false });
        setLocationFound(false);
      }, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl flex items-center justify-center shadow-xl">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold gradient-text">
                {t('reportFloodEvent')}
              </h1>
              <p className="text-gray-600 mt-2">{t('helpCommunity')}</p>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Report from anywhere in South Sudan - Your data improves AI accuracy
              </p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card"
        >
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 p-6 rounded-xl mb-8 shadow-sm">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-blue-900 font-bold mb-1">Community Contribution</p>
                <p className="text-blue-700 text-sm">{t('helpCommunity')} - Your reports train our AI models and save lives.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-3 text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Location Name
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  className="input-field flex-1"
                  placeholder="Enter place name (e.g., Juba, Bor, Malakal, Bentiu)"
                  value={formData.placeName}
                  onChange={e => {
                    setFormData({...formData, placeName: e.target.value});
                    setLocationFound(false);
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={handleSearchLocation}
                  disabled={searchingLocation || !formData.placeName.trim()}
                  className="px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-cyan-500/50 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {searchingLocation ? 'Searching...' : 'Find'}
                </button>
              </div>
              {locationFound && (
                <div className="mt-3 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
                  <p className="text-sm text-green-800 font-semibold flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Location verified in South Sudan
                  </p>
                  <p className="text-xs text-green-700 ml-6">
                    Coordinates: {formData.latitude}, {formData.longitude}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold mb-3 text-gray-700">
                {t('severity')} (1-5):
                <span className={`ml-3 px-4 py-1 rounded-full text-sm font-bold ${
                  formData.severity >= 4 ? 'bg-red-100 text-red-700' :
                  formData.severity >= 3 ? 'bg-orange-100 text-orange-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {formData.severity}
                </span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                value={formData.severity}
                onChange={e => setFormData({...formData, severity: parseInt(e.target.value)})}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Minor</span>
                <span>Moderate</span>
                <span>Severe</span>
                <span>Critical</span>
                <span>Catastrophic</span>
              </div>
            </div>

            <div className="p-5 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border-2 border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  checked={formData.flood_occurred}
                  onChange={e => setFormData({...formData, flood_occurred: e.target.checked})}
                />
                <div>
                  <span className="text-sm font-bold text-gray-900">{t('reportFloodEvent')}</span>
                  <p className="text-xs text-gray-600 mt-1">Check this if flooding has already occurred</p>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-bold mb-3 text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {t('description')}
              </label>
              <textarea
                className="input-field"
                rows={5}
                value={formData.comments}
                onChange={e => setFormData({...formData, comments: e.target.value})}
                placeholder="Describe the flood situation: water depth, affected areas, damage to property, people affected, etc."
              />
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary w-full text-lg py-5 flex items-center justify-center gap-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
                  <span>{t('submitting')}</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>{t('submitReport')}</span>
                </>
              )}
            </motion.button>
            
            {submitted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white p-8 rounded-2xl text-center shadow-2xl"
              >
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-2xl font-bold mb-2">Report Submitted Successfully!</p>
                <p className="text-sm opacity-90">{t('helpCommunity')} - Thank you for contributing to community safety.</p>
              </motion.div>
            )}
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Real-time Processing', desc: 'Reports processed instantly' },
            { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', title: 'Verified Data', desc: 'AI validates all submissions' },
            { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', title: 'Community Impact', desc: 'Helps protect thousands' }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + idx * 0.1 }}
              className="glass-card text-center"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Report;
