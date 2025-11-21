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
    <div className="pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 rounded-full text-sm font-semibold mb-6 border border-orange-200"
            >
              Community Reporting Portal
            </motion.div>

            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
              {t('reportFloodEvent')}
            </h1>
            <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed mb-4">
              {t('helpCommunity')} - Your reports help train our AI models and protect communities across South Sudan.
            </p>
            <div className="flex items-center justify-center gap-2 text-slate-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium">Report from anywhere in South Sudan - Your data improves AI accuracy</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200"
        >
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 hidden">
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Community Contribution</h3>
                <p className="text-slate-700 text-sm leading-relaxed">{t('helpCommunity')} - Your reports train our AI models and save lives.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-sm font-bold mb-4 text-slate-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center hidden">
                </div>
                Location Name
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  className="flex-1 px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-200 placeholder-slate-400 text-slate-900 font-medium"
                  placeholder="Enter place name (e.g., Juba, Bor, Malakal, Bentiu)"
                  value={formData.placeName}
                  onChange={e => {
                    setFormData({ ...formData, placeName: e.target.value });
                    setLocationFound(false);
                  }}
                  required
                />
                <motion.button
                  type="button"
                  onClick={handleSearchLocation}
                  disabled={searchingLocation || !formData.placeName.trim()}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {searchingLocation ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Searching...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      Find
                    </div>
                  )}
                </motion.button>
              </div>
              {locationFound && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center hidden">
                    </div>
                    <div>
                      <p className="text-sm text-green-800 font-bold">Location verified in South Sudan</p>
                      <p className="text-xs text-green-700 mt-1">
                        Coordinates: {formData.latitude}, {formData.longitude}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold mb-4 text-slate-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center hidden">
                </div>
                {t('severity')} (1-5):
                <span className={`ml-3 px-4 py-2 rounded-full text-sm font-bold ${formData.severity >= 4 ? 'bg-red-100 text-red-700 border border-red-200' :
                  formData.severity >= 3 ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                    'bg-yellow-100 text-yellow-700 border border-yellow-200'
                  }`}>
                  {formData.severity}
                </span>
              </label>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <input
                  type="range"
                  min="1"
                  max="5"
                  className="w-full h-3 bg-gradient-to-r from-green-200 via-yellow-200 via-orange-200 to-red-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  value={formData.severity}
                  onChange={e => setFormData({ ...formData, severity: parseInt(e.target.value) })}
                />
                <div className="flex justify-between text-xs text-slate-600 mt-4 font-semibold">
                  <span className="text-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mx-auto mb-1"></div>
                    Minor
                  </span>
                  <span className="text-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mx-auto mb-1"></div>
                    Moderate
                  </span>
                  <span className="text-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mx-auto mb-1"></div>
                    Severe
                  </span>
                  <span className="text-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mx-auto mb-1"></div>
                    Critical
                  </span>
                  <span className="text-center">
                    <div className="w-2 h-2 bg-red-700 rounded-full mx-auto mb-1"></div>
                    Catastrophic
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-slate-200">
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="w-6 h-6 text-blue-600 rounded-lg focus:ring-4 focus:ring-blue-500/20 cursor-pointer"
                    checked={formData.flood_occurred}
                    onChange={e => setFormData({ ...formData, flood_occurred: e.target.checked })}
                  />
                  {formData.flood_occurred && (
                    <div className="absolute inset-0 w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center hidden">
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <span className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{t('reportFloodEvent')}</span>
                  <p className="text-sm text-slate-600 mt-1">Check this if flooding has already occurred at this location</p>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-bold mb-4 text-slate-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center hidden">
                </div>
                {t('description')}
              </label>
              <textarea
                className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-slate-400 text-slate-900 font-medium resize-none"
                rows={5}
                value={formData.comments}
                onChange={e => setFormData({ ...formData, comments: e.target.value })}
                placeholder="Describe the flood situation: water depth, affected areas, damage to property, people affected, etc."
              />
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-6 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{t('submitting')}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <span>{t('submitReport')}</span>
                </div>
              )}
            </motion.button>

            {submitted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="mt-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white p-8 rounded-2xl text-center shadow-2xl border border-green-400"
              >
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 hidden">
                </div>
                <h3 className="text-2xl font-bold mb-3">Report Submitted Successfully!</h3>
                <p className="text-lg opacity-90 mb-4">{t('helpCommunity')} - Thank you for contributing to community safety.</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm font-semibold">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  Your report is being processed
                </div>
              </motion.div>
            )}
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            { title: 'Real-time Processing', desc: 'Reports processed instantly', color: 'from-blue-500 to-cyan-500' },
            { title: 'Verified Data', desc: 'AI validates all submissions', color: 'from-green-500 to-emerald-500' },
            { title: 'Community Impact', desc: 'Helps protect thousands', color: 'from-purple-500 to-pink-500' }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + idx * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200 hover:shadow-2xl transition-all duration-300"
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg hidden`}>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
              <p className="text-slate-600 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Report;
