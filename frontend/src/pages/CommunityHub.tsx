import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';
import { forwardGeocode } from '../services/geocoding';
import '../styles/flood-colors.css';

type TabType = 'report' | 'share' | 'sources' | 'impact';

const CommunityHub: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('report');    // Report Form State
    const [reportData, setReportData] = useState({
        placeName: '',
        latitude: '',
        longitude: '',
        severity: 3,
        comments: '',
        flood_occurred: false
    });
    const [reportSubmitted, setReportSubmitted] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);
    const [searchingLocation, setSearchingLocation] = useState(false);
    const [locationFound, setLocationFound] = useState(false);

    // Data Sharing Form State
    const [shareData, setShareData] = useState({
        dataType: 'flood_observation',
        location: '',
        date: '',
        description: '',
        file: null as File | null,
        contactEmail: '',
        organizationName: ''
    });
    const [shareSubmitted, setShareSubmitted] = useState(false);
    const [uploading, setUploading] = useState(false);

    const tabs = [
        {
            id: 'report' as TabType,
            label: 'Report Flood',
            color: 'from-orange-500 to-red-500',
            description: 'Quick flood event reporting'
        },
        {
            id: 'share' as TabType,
            label: 'Share Data',
            color: 'from-blue-500 to-cyan-500',
            description: 'Upload datasets & observations'
        },
        {
            id: 'sources' as TabType,
            label: 'Data Sources',
            color: 'from-purple-500 to-indigo-500',
            description: 'Available open datasets'
        },
        {
            id: 'impact' as TabType,
            label: 'Your Impact',
            color: 'from-green-500 to-teal-500',
            description: 'See your contributions'
        }
    ];

    const dataTypes = [
        {
            value: 'flood_observation',
            label: 'Flood Observation',
            color: 'from-blue-500 to-blue-600',
        },
        {
            value: 'rainfall_data',
            label: 'Rainfall Data',
            color: 'from-cyan-500 to-cyan-600',
        },
        {
            value: 'satellite_imagery',
            label: 'Satellite Imagery',
            color: 'from-purple-500 to-purple-600',
        },
        {
            value: 'infrastructure_data',
            label: 'Infrastructure',
            color: 'from-indigo-500 to-indigo-600',
        },
        {
            value: 'community_feedback',
            label: 'Community Feedback',
            color: 'from-green-500 to-green-600',
        }
    ];

    const dataSources = [
        {
            name: 'Google Earth Engine',
            type: 'Satellite & Remote Sensing',
            color: 'from-green-500 to-green-600',
            description: 'SAR flood detection & land cover analysis',
            access: 'API Access',
            frequency: 'Daily'
        },
        {
            name: 'CHIRPS Rainfall',
            type: 'Precipitation Data',
            color: 'from-blue-500 to-blue-600',
            description: 'Climate Hazards Group InfraRed Precipitation',
            access: 'Open Data',
            frequency: 'Daily/Pentadal'
        },
        {
            name: 'ERA5 Climate',
            type: 'Weather Reanalysis',
            color: 'from-cyan-500 to-cyan-600',
            description: 'ECMWF atmospheric reanalysis',
            access: 'Open Data',
            frequency: 'Hourly'
        },
        {
            name: 'DEM Elevation',
            type: 'Topographic Data',
            color: 'from-amber-500 to-amber-600',
            description: 'Digital Elevation Models for terrain analysis',
            access: 'Open Data',
            frequency: 'Static'
        },
        {
            name: 'NDVI Vegetation',
            type: 'Land Cover',
            color: 'from-lime-500 to-lime-600',
            description: 'Vegetation indices and land use patterns',
            access: 'API Access',
            frequency: '8-Day'
        },
        {
            name: 'Community Reports',
            type: 'Crowdsourced Data',
            color: 'from-pink-500 to-pink-600',
            description: 'Real-time flood observations from citizens',
            access: 'Community',
            frequency: 'Real-time'
        }
    ];

    const impactStats = [
        { label: 'Reports Submitted', value: '1,247', trend: '+23%' },
        { label: 'Data Points Shared', value: '8,432', trend: '+156' },
        { label: 'AI Accuracy Improvement', value: '+12.3%', trend: 'This month' },
        { label: 'Communities Protected', value: '34', trend: '+5 new' }
    ];

    const handleSearchLocation = async () => {
        if (!reportData.placeName.trim()) return;

        setSearchingLocation(true);
        try {
            const result = await forwardGeocode(reportData.placeName);
            if (result) {
                setReportData(prev => ({
                    ...prev,
                    latitude: result.lat.toFixed(6),
                    longitude: result.lon.toFixed(6),
                    comments: `${result.displayName || reportData.placeName}. ${prev.comments}`
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

    const handleReportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!reportData.latitude || !reportData.longitude) {
            alert('Please search for a location first.');
            return;
        }

        setReportLoading(true);
        try {
            await apiService.submitFeedback({
                feedback_type: 'community_report',
                rating: reportData.severity,
                comments: `Location: ${reportData.placeName}. ${reportData.comments}`,
                flood_occurred: reportData.flood_occurred,
                actual_severity: reportData.severity / 5
            });
            setReportSubmitted(true);
            setTimeout(() => {
                setReportSubmitted(false);
                setReportData({ placeName: '', latitude: '', longitude: '', severity: 3, comments: '', flood_occurred: false });
                setLocationFound(false);
            }, 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setReportLoading(false);
        }
    };

    const handleShareSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        setTimeout(() => {
            setShareSubmitted(true);
            setUploading(false);
            setTimeout(() => {
                setShareSubmitted(false);
                setShareData({
                    dataType: 'flood_observation',
                    location: '',
                    date: '',
                    description: '',
                    file: null,
                    contactEmail: '',
                    organizationName: ''
                });
            }, 3000);
        }, 2000);
    };

    return (
        <div className="min-h-screen pb-16">
            {/* Hero Section with Background Image */}
            <div className="relative h-[400px] w-full overflow-hidden mb-12">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: 'url("/images/Community Preparedness.jpg")' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-slate-50" />

                <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center text-center pt-16">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-3 px-6 py-2 bg-white/10 backdrop-blur-md text-white rounded-full text-sm font-semibold mb-6 border border-white/20"
                    >
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        Community Data Hub
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white drop-shadow-lg"
                    >
                        Contribute & Protect
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-xl text-slate-100 max-w-3xl mx-auto leading-relaxed drop-shadow-md"
                    >
                        Help us build the most accurate flood prediction system in South Sudan. Your contributions save lives.
                    </motion.p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">

                {/* Tab Navigation */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-10"
                >
                    <div className="bg-white rounded-2xl shadow-xl p-2 sm:p-4 border border-slate-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        relative flex flex-col items-center justify-center gap-2 px-6 py-6 rounded-xl transition-all duration-300 overflow-hidden group h-full
                                        ${activeTab === tab.id
                                            ? `bg-gradient-to-br ${tab.color} text-white shadow-lg transform scale-[1.02]`
                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:shadow-md'
                                        }
                                    `}
                                >
                                    <span className="font-bold text-lg relative z-10">{tab.label}</span>
                                    <span className={`text-xs relative z-10 ${activeTab === tab.id ? 'text-white/90' : 'text-slate-500'}`}>
                                        {tab.description}
                                    </span>
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-white/10"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'report' && (
                        <motion.div
                            key="report"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Report Form */}
                                <div className="lg:col-span-2">
                                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                                        <div className="p-8">
                                            <h2 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg text-white hidden">
                                                </div>
                                                Report Flood Event
                                            </h2>

                                            {reportSubmitted ? (
                                                <motion.div
                                                    initial={{ scale: 0.9, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className="text-center py-12"
                                                >
                                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 hidden">
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Report Submitted!</h3>
                                                    <p className="text-slate-600">Thank you for helping protect your community</p>
                                                </motion.div>
                                            ) : (
                                                <form onSubmit={handleReportSubmit} className="space-y-8">
                                                    {/* Location Search */}
                                                    <div>
                                                        <label className="block text-base font-bold mb-4 text-slate-900">
                                                            Location in South Sudan
                                                        </label>
                                                        <div className="flex gap-4">
                                                            <input
                                                                type="text"
                                                                value={reportData.placeName}
                                                                onChange={(e) => setReportData({ ...reportData, placeName: e.target.value })}
                                                                className="flex-1 px-5 py-4 text-base bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                                placeholder="e.g., Juba, Bor, Malakal..."
                                                                required
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={handleSearchLocation}
                                                                disabled={searchingLocation}
                                                                className="px-8 py-4 text-base bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                                                            >
                                                                {searchingLocation ? 'Searching...' : 'Search'}
                                                            </button>
                                                        </div>
                                                        {locationFound && (
                                                            <div className="mt-4 p-5 bg-green-50 border border-green-200 rounded-xl flex items-center gap-4">
                                                                <span className="text-base text-green-800 font-medium">
                                                                    Location found: {reportData.latitude}, {reportData.longitude}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Flood Occurred Checkbox */}
                                                    <div className="p-6 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-slate-200">
                                                        <label className="flex items-center gap-4 cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                className="w-6 h-6 text-blue-600 rounded-lg focus:ring-4 focus:ring-blue-500/20"
                                                                checked={reportData.flood_occurred}
                                                                onChange={e => setReportData({ ...reportData, flood_occurred: e.target.checked })}
                                                            />
                                                            <div className="flex-1">
                                                                <span className="text-lg font-bold text-slate-900">Flooding has already occurred</span>
                                                                <p className="text-sm text-slate-600 mt-1">Check if flooding is currently happening at this location</p>
                                                            </div>
                                                        </label>
                                                    </div>

                                                    {/* Severity */}
                                                    <div>
                                                        <label className="block text-sm font-bold mb-4 text-slate-900">
                                                            Flood Severity: <span className="text-blue-600">{reportData.severity}/5</span>
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="5"
                                                            value={reportData.severity}
                                                            onChange={e => setReportData({ ...reportData, severity: parseInt(e.target.value) })}
                                                            className="w-full h-3 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded-lg appearance-none cursor-pointer"
                                                        />
                                                        <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                                                            <span>Minimal</span>
                                                            <span>Moderate</span>
                                                            <span>Severe</span>
                                                        </div>
                                                    </div>

                                                    {/* Comments */}
                                                    <div>
                                                        <label className="block text-sm font-bold mb-3 text-slate-900">
                                                            Additional Details
                                                        </label>
                                                        <textarea
                                                            value={reportData.comments}
                                                            onChange={e => setReportData({ ...reportData, comments: e.target.value })}
                                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                            rows={4}
                                                            placeholder="Describe what you're seeing..."
                                                        />
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        disabled={reportLoading}
                                                        className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 transform hover:-translate-y-1"
                                                    >
                                                        {reportLoading ? 'Submitting...' : 'Submit Report'}
                                                    </button>
                                                </form>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Benefits Sidebar */}
                                <div className="space-y-6">
                                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
                                        <div className="h-48 rounded-xl bg-slate-100 mb-6 overflow-hidden relative">
                                            <img
                                                src="/images/image1.jpg"
                                                alt="Community Reporting"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                                                <span className="text-white font-bold">Community Action</span>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-4">Why Report?</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 text-blue-600 hidden">
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">Improve AI Accuracy</div>
                                                    <div className="text-sm text-slate-600">Your reports train our models</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 text-green-600 hidden">
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">Protect Communities</div>
                                                    <div className="text-sm text-slate-600">Help save lives with early warnings</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 text-purple-600 hidden">
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">Real-time Updates</div>
                                                    <div className="text-sm text-slate-600">Instant alert system activation</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-2xl shadow-lg p-6 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                        <div className="text-center relative z-10">
                                            <div className="text-4xl font-bold mb-2">1,247</div>
                                            <div className="text-blue-100 font-medium">Community Reports</div>
                                            <div className="mt-4 pt-4 border-t border-white/20">
                                                <div className="text-sm">Contributing to a safer South Sudan</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'share' && (
                        <motion.div
                            key="share"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2">
                                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                                        <div className="p-8">
                                            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-md hidden">
                                                </div>
                                                Share Data & Resources
                                            </h2>

                                            {shareSubmitted ? (
                                                <motion.div
                                                    initial={{ scale: 0.9, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className="text-center py-12"
                                                >
                                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 hidden">
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Data Uploaded!</h3>
                                                    <p className="text-slate-600">Your contribution helps improve flood predictions</p>
                                                </motion.div>
                                            ) : (
                                                <form onSubmit={handleShareSubmit} className="space-y-6">
                                                    {/* Organization Name */}
                                                    <div>
                                                        <label className="block text-sm font-bold mb-3 text-slate-900">
                                                            Organization Name (Optional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={shareData.organizationName}
                                                            onChange={(e) => setShareData({ ...shareData, organizationName: e.target.value })}
                                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                            placeholder="Your organization or institution"
                                                        />
                                                    </div>

                                                    {/* Data Type Selection */}
                                                    <div>
                                                        <label className="block text-sm font-bold mb-4 text-slate-900">
                                                            Data Type
                                                        </label>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {dataTypes.map((type) => (
                                                                <button
                                                                    key={type.value}
                                                                    type="button"
                                                                    onClick={() => setShareData({ ...shareData, dataType: type.value })}
                                                                    className={`p-4 rounded-xl border-2 transition-all text-left group ${shareData.dataType === type.value
                                                                        ? `border-blue-500 bg-gradient-to-r ${type.color} text-white shadow-lg`
                                                                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                                                                        }`}
                                                                >
                                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 ${shareData.dataType === type.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'} hidden`}>
                                                                    </div>
                                                                    <h3 className={`font-bold mb-1 ${shareData.dataType === type.value ? 'text-white' : 'text-slate-800'}`}>{type.label}</h3>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Location */}
                                                    <div>
                                                        <label className="block text-sm font-bold mb-3 text-slate-900">
                                                            Location/Region
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={shareData.location}
                                                            onChange={(e) => setShareData({ ...shareData, location: e.target.value })}
                                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                            placeholder="Area covered by your data"
                                                            required
                                                        />
                                                    </div>

                                                    {/* Date */}
                                                    <div>
                                                        <label className="block text-sm font-bold mb-3 text-slate-900">
                                                            Data Collection Date
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={shareData.date}
                                                            onChange={(e) => setShareData({ ...shareData, date: e.target.value })}
                                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                            required
                                                        />
                                                    </div>

                                                    {/* Description */}
                                                    <div>
                                                        <label className="block text-sm font-bold mb-3 text-slate-900">
                                                            Description & Methodology
                                                        </label>
                                                        <textarea
                                                            value={shareData.description}
                                                            onChange={(e) => setShareData({ ...shareData, description: e.target.value })}
                                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                            rows={4}
                                                            placeholder="Describe your data, collection methods, and any relevant details..."
                                                            required
                                                        />
                                                    </div>

                                                    {/* File Upload */}
                                                    <div>
                                                        <label className="block text-sm font-bold mb-3 text-slate-900">
                                                            Upload Data Files
                                                        </label>
                                                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors bg-slate-50 group cursor-pointer">
                                                            <input
                                                                type="file"
                                                                onChange={(e) => setShareData({ ...shareData, file: e.target.files?.[0] || null })}
                                                                className="hidden"
                                                                id="file-upload"
                                                                accept=".csv,.xlsx,.json,.geojson,.tif,.shp"
                                                            />
                                                            <label htmlFor="file-upload" className="cursor-pointer w-full h-full block">
                                                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform hidden">
                                                                </div>
                                                                <span className="text-blue-600 font-semibold text-lg">Click to upload</span>
                                                                <span className="text-slate-600"> or drag and drop</span>
                                                                <p className="text-sm text-slate-500 mt-2">CSV, Excel, JSON, GeoJSON, GeoTIFF, Shapefile</p>
                                                            </label>
                                                            {shareData.file && (
                                                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg inline-flex items-center gap-2 text-green-700 font-medium">
                                                                    {shareData.file.name}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Contact Email */}
                                                    <div>
                                                        <label className="block text-sm font-bold mb-3 text-slate-900">
                                                            Contact Email
                                                        </label>
                                                        <input
                                                            type="email"
                                                            value={shareData.contactEmail}
                                                            onChange={(e) => setShareData({ ...shareData, contactEmail: e.target.value })}
                                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                            placeholder="your.email@example.com"
                                                            required
                                                        />
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        disabled={uploading}
                                                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 transform hover:-translate-y-1"
                                                    >
                                                        {uploading ? 'Uploading...' : 'Share Data'}
                                                    </button>
                                                </form>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
                                        <div className="h-48 rounded-xl bg-slate-100 mb-6 overflow-hidden relative">
                                            <img
                                                src="/images/image2.jpg"
                                                alt="Data Sharing"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                                                <span className="text-white font-bold">Open Data Initiative</span>
                                            </div>
                                        </div>
                                        <div className="bg-gradient-to-br from-green-500 to-teal-600 text-white rounded-xl p-6 mb-6">
                                            <h3 className="text-xl font-bold mb-4">Data Guidelines</h3>
                                            <ul className="space-y-3 text-sm">
                                                <li className="flex items-start gap-2">
                                                    <span>Ensure data quality and accuracy</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span>Include metadata and documentation</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span>Verify you have rights to share</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span>Use standardized formats when possible</span>
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                                            <h3 className="text-lg font-bold text-slate-900 mb-4">Need Help?</h3>
                                            <p className="text-slate-600 text-sm mb-4">
                                                Contact our data team for assistance with large datasets or technical questions.
                                            </p>
                                            <button className="w-full py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-blue-300 transition-all">
                                                Contact Support
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'sources' && (
                        <motion.div
                            key="sources"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="mb-8 rounded-2xl overflow-hidden shadow-lg relative h-64">
                                <img
                                    src="/images/image3.jpg"
                                    alt="Data Sources"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-900/90 to-indigo-900/80 flex items-center p-8 sm:p-12">
                                    <div className="flex items-center gap-6 max-w-4xl">
                                        <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl hidden">
                                        </div>
                                        <div className="flex-1 text-white">
                                            <h2 className="text-3xl font-bold mb-2">Available Data Sources</h2>
                                            <p className="text-purple-100 text-lg">Open datasets powering FloodSense AI predictions</p>
                                        </div>
                                        <div className="text-right text-white hidden sm:block">
                                            <div className="text-4xl font-bold">{dataSources.length}</div>
                                            <div className="text-sm text-purple-200 font-medium">Active Sources</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {dataSources.map((source, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
                                    >
                                        <div className={`w-14 h-14 bg-gradient-to-r ${source.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md text-white hidden`}>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">{source.name}</h3>
                                        <div className="text-sm text-blue-600 font-semibold mb-3 uppercase tracking-wider">{source.type}</div>
                                        <p className="text-slate-600 text-sm mb-6 leading-relaxed flex-grow">{source.description}</p>
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                <span className="text-xs text-slate-700 font-semibold">{source.access}</span>
                                            </div>
                                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{source.frequency}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="mt-8 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl p-8 shadow-sm">
                                <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg text-white transform rotate-3 hidden">
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">Need Access to Raw Data?</h3>
                                        <p className="text-slate-600 mb-4 sm:mb-0 max-w-2xl">
                                            Researchers and organizations can request API access or bulk datasets for their projects. We support open science and collaboration.
                                        </p>
                                    </div>
                                    <button className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-blue-500/30 whitespace-nowrap">
                                        Request API Access
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'impact' && (
                        <motion.div
                            key="impact"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Hero Banner for Impact */}
                            <div className="mb-10 rounded-2xl overflow-hidden shadow-xl relative h-72">
                                <img
                                    src="/images/Lives Saved.jpg"
                                    alt="Community Impact"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-green-900/90 to-teal-900/80 flex items-center justify-center text-center p-8">
                                    <div className="max-w-3xl">
                                        <h2 className="text-4xl font-bold mb-4 text-white">Community Impact Dashboard</h2>
                                        <p className="text-green-100 text-xl leading-relaxed">
                                            Together, we're building a safer South Sudan. Your data is directly saving lives and improving flood response.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                                {impactStats.map((stat, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col justify-center items-center"
                                    >
                                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-white hidden">
                                        </div>
                                        <div className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">{stat.value}</div>
                                        <div className="text-sm font-bold text-slate-600 mb-3 uppercase tracking-wide">{stat.label}</div>
                                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold">
                                            {stat.trend}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Recent Contributions */}
                                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 h-full">
                                    <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                                        <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                                        Recent Contributions
                                    </h3>
                                    <div className="space-y-4">
                                        {[
                                            { user: 'John M.', action: 'Reported flood in Juba', time: '2 hours ago', type: 'report' },
                                            { user: 'Sarah K.', action: 'Shared rainfall data', time: '5 hours ago', type: 'data' },
                                            { user: 'Ahmed H.', action: 'Verified flood extent', time: '1 day ago', type: 'verify' },
                                            { user: 'Mary W.', action: 'Uploaded satellite imagery', time: '2 days ago', type: 'data' }
                                        ].map((item, index) => (
                                            <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-blue-50 transition-colors">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm hidden ${item.type === 'report' ? 'bg-orange-100 text-orange-600' :
                                                    item.type === 'data' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-green-100 text-green-600'
                                                    }`}>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-slate-900">{item.user}</div>
                                                    <div className="text-sm text-slate-600">{item.action}</div>
                                                </div>
                                                <div className="text-xs font-medium text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100">{item.time}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Achievement Card */}
                                <div className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-2xl shadow-lg p-8 relative overflow-hidden h-full">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>

                                    <h3 className="text-2xl font-bold mb-8 relative z-10 flex items-center gap-3">
                                        Achievement Unlocked!
                                    </h3>

                                    <div className="space-y-8 relative z-10">
                                        <div className="flex items-center gap-6">
                                            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-inner hidden">
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-2xl mb-1">Community Hero</div>
                                                <div className="text-blue-100 text-base">Contributed 10+ valuable reports</div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-white/20">
                                            <div className="flex justify-between text-sm mb-2 font-medium">
                                                <span>Next: Data Champion</span>
                                                <span>13 / 20</span>
                                            </div>
                                            <div className="w-full bg-black/20 rounded-full h-4 overflow-hidden backdrop-blur-sm">
                                                <div className="bg-gradient-to-r from-yellow-300 to-yellow-500 h-full rounded-full shadow-lg" style={{ width: '65%' }}></div>
                                            </div>
                                            <div className="text-xs text-blue-100 mt-3 text-center">Just 7 more contributions to level up!</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 bg-white rounded-2xl shadow-lg border border-slate-100 p-10 text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-blue-500 to-green-500"></div>
                                <h3 className="text-3xl font-bold text-slate-900 mb-4">Keep Making a Difference!</h3>
                                <p className="text-slate-600 mb-8 max-w-2xl mx-auto text-lg">
                                    Your contributions directly improve our AI models and help protect communities across South Sudan. Every report, every dataset makes us more accurate.
                                </p>
                                <div className="flex flex-col sm:flex-row justify-center gap-4">
                                    <button
                                        onClick={() => setActiveTab('report')}
                                        className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all hover:-translate-y-1"
                                    >
                                        Submit New Report
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('share')}
                                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all hover:-translate-y-1"
                                    >
                                        Share Data
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default CommunityHub;
