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
            icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
            color: 'from-orange-500 to-red-500',
            description: 'Quick flood event reporting'
        },
        {
            id: 'share' as TabType,
            label: 'Share Data',
            icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
            color: 'from-blue-500 to-cyan-500',
            description: 'Upload datasets & observations'
        },
        {
            id: 'sources' as TabType,
            label: 'Data Sources',
            icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4',
            color: 'from-purple-500 to-indigo-500',
            description: 'Available open datasets'
        },
        {
            id: 'impact' as TabType,
            label: 'Your Impact',
            icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
            color: 'from-green-500 to-teal-500',
            description: 'See your contributions'
        }
    ];

    const dataTypes = [
        {
            value: 'flood_observation',
            label: 'Flood Observation',
            icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
            color: 'from-blue-500 to-blue-600',
        },
        {
            value: 'rainfall_data',
            label: 'Rainfall Data',
            icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
            color: 'from-cyan-500 to-cyan-600',
        },
        {
            value: 'satellite_imagery',
            label: 'Satellite Imagery',
            icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
            color: 'from-purple-500 to-purple-600',
        },
        {
            value: 'infrastructure_data',
            label: 'Infrastructure',
            icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
            color: 'from-indigo-500 to-indigo-600',
        },
        {
            value: 'community_feedback',
            label: 'Community Feedback',
            icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
            color: 'from-green-500 to-green-600',
        }
    ];

    const dataSources = [
        {
            name: 'Google Earth Engine',
            type: 'Satellite & Remote Sensing',
            icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
            color: 'from-green-500 to-green-600',
            description: 'SAR flood detection & land cover analysis',
            access: 'API Access',
            frequency: 'Daily'
        },
        {
            name: 'CHIRPS Rainfall',
            type: 'Precipitation Data',
            icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
            color: 'from-blue-500 to-blue-600',
            description: 'Climate Hazards Group InfraRed Precipitation',
            access: 'Open Data',
            frequency: 'Daily/Pentadal'
        },
        {
            name: 'ERA5 Climate',
            type: 'Weather Reanalysis',
            icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
            color: 'from-cyan-500 to-cyan-600',
            description: 'ECMWF atmospheric reanalysis',
            access: 'Open Data',
            frequency: 'Hourly'
        },
        {
            name: 'DEM Elevation',
            type: 'Topographic Data',
            icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
            color: 'from-amber-500 to-amber-600',
            description: 'Digital Elevation Models for terrain analysis',
            access: 'Open Data',
            frequency: 'Static'
        },
        {
            name: 'NDVI Vegetation',
            type: 'Land Cover',
            icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945',
            color: 'from-lime-500 to-lime-600',
            description: 'Vegetation indices and land use patterns',
            access: 'API Access',
            frequency: '8-Day'
        },
        {
            name: 'Community Reports',
            type: 'Crowdsourced Data',
            icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857',
            color: 'from-pink-500 to-pink-600',
            description: 'Real-time flood observations from citizens',
            access: 'Community',
            frequency: 'Real-time'
        }
    ];

    const impactStats = [
        { label: 'Reports Submitted', value: '1,247', trend: '+23%', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
        { label: 'Data Points Shared', value: '8,432', trend: '+156', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
        { label: 'AI Accuracy Improvement', value: '+12.3%', trend: 'This month', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
        { label: 'Communities Protected', value: '34', trend: '+5 new', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' }
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
        <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 min-h-screen pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 rounded-full text-sm font-semibold mb-6 border border-blue-200"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Community Data Hub
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6"
                    >
                        <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
                            Contribute & Protect
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed"
                    >
                        Help us build the most accurate flood prediction system in South Sudan. Your contributions save lives.
                    </motion.p>
                </motion.div>

                {/* Tab Navigation */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-10"
                >
                    <div className="flood-card p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative group p-6 rounded-xl transition-all duration-300 ${activeTab === tab.id
                                        ? `bg-gradient-to-r ${tab.color} text-white shadow-lg scale-105`
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    <div className="flex flex-col items-center gap-3 min-h-[120px] justify-center">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                                        </svg>
                                        <div className="text-base font-bold">{tab.label}</div>
                                        <div className={`text-sm ${activeTab === tab.id ? 'text-white/90' : 'text-slate-500'}`}>
                                            {tab.description}
                                        </div>
                                    </div>
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 rounded-xl"
                                            style={{ zIndex: -1 }}
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
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                {/* Report Form */}
                                <div className="lg:col-span-2">
                                    <div className="flood-card">
                                        <h2 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                            Report Flood Event
                                        </h2>

                                        {reportSubmitted ? (
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="text-center py-12"
                                            >
                                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
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
                                                            className="flex-1 px-5 py-4 text-base bg-white border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
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
                                                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            <span className="text-base text-green-800">
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
                                                    <div className="flex justify-between text-xs text-slate-500 mt-2">
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
                                                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                                                        rows={4}
                                                        placeholder="Describe what you're seeing..."
                                                    />
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={reportLoading}
                                                    className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50"
                                                >
                                                    {reportLoading ? 'Submitting...' : 'Submit Report'}
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </div>

                                {/* Benefits Sidebar */}
                                <div className="space-y-6">
                                    <div className="flood-card">
                                        <h3 className="text-lg font-bold text-slate-900 mb-4">Why Report?</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">Improve AI Accuracy</div>
                                                    <div className="text-sm text-slate-600">Your reports train our models</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">Protect Communities</div>
                                                    <div className="text-sm text-slate-600">Help save lives with early warnings</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">Real-time Updates</div>
                                                    <div className="text-sm text-slate-600">Instant alert system activation</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flood-card bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                                        <div className="text-center">
                                            <div className="text-4xl font-bold mb-2">1,247</div>
                                            <div className="text-blue-100">Community Reports</div>
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
                                    <div className="flood-card">
                                        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                            </div>
                                            Share Data & Resources
                                        </h2>

                                        {shareSubmitted ? (
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="text-center py-12"
                                            >
                                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
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
                                                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
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
                                                                className={`p-4 rounded-xl border-2 transition-all ${shareData.dataType === type.value
                                                                    ? `border-blue-500 bg-gradient-to-r ${type.color} text-white`
                                                                    : 'border-slate-200 bg-white hover:border-blue-300'
                                                                    }`}
                                                            >
                                                                <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={type.icon} />
                                                                </svg>
                                                                <div className="text-sm font-semibold">{type.label}</div>
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
                                                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
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
                                                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
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
                                                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
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
                                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                                                        <svg className="w-12 h-12 mx-auto mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                        </svg>
                                                        <input
                                                            type="file"
                                                            onChange={(e) => setShareData({ ...shareData, file: e.target.files?.[0] || null })}
                                                            className="hidden"
                                                            id="file-upload"
                                                            accept=".csv,.xlsx,.json,.geojson,.tif,.shp"
                                                        />
                                                        <label htmlFor="file-upload" className="cursor-pointer">
                                                            <span className="text-blue-600 font-semibold">Click to upload</span>
                                                            <span className="text-slate-600"> or drag and drop</span>
                                                        </label>
                                                        <p className="text-sm text-slate-500 mt-2">CSV, Excel, JSON, GeoJSON, GeoTIFF, Shapefile</p>
                                                        {shareData.file && (
                                                            <div className="mt-4 text-sm text-green-600 font-semibold">
                                                                ✓ {shareData.file.name}
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
                                                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                                                        placeholder="your.email@example.com"
                                                        required
                                                    />
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={uploading}
                                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50"
                                                >
                                                    {uploading ? 'Uploading...' : 'Share Data'}
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flood-card bg-gradient-to-br from-green-500 to-teal-600 text-white">
                                        <h3 className="text-xl font-bold mb-4">Data Guidelines</h3>
                                        <ul className="space-y-3 text-sm">
                                            <li className="flex items-start gap-2">
                                                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>Ensure data quality and accuracy</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>Include metadata and documentation</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>Verify you have rights to share</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>Use standardized formats when possible</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="flood-card">
                                        <h3 className="text-lg font-bold text-slate-900 mb-4">Need Help?</h3>
                                        <p className="text-slate-600 text-sm mb-4">
                                            Contact our data team for assistance with large datasets or technical questions.
                                        </p>
                                        <button className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors">
                                            Contact Support
                                        </button>
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
                            <div className="mb-8 flood-card bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold mb-2">Available Data Sources</h2>
                                        <p className="text-purple-100">Open datasets powering FloodSense AI predictions</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-bold">{dataSources.length}</div>
                                        <div className="text-sm text-purple-200">Active Sources</div>
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
                                        className="flood-card group hover:shadow-2xl transition-all duration-300"
                                    >
                                        <div className={`w-14 h-14 bg-gradient-to-r ${source.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={source.icon} />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">{source.name}</h3>
                                        <div className="text-sm text-blue-600 font-semibold mb-3">{source.type}</div>
                                        <p className="text-slate-600 text-sm mb-4 leading-relaxed">{source.description}</p>
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-xs text-green-600 font-semibold">{source.access}</span>
                                            </div>
                                            <span className="text-xs text-slate-500">{source.frequency}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="mt-8 flood-card bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">Need Access to Raw Data?</h3>
                                        <p className="text-slate-600 mb-4">
                                            Researchers and organizations can request API access or bulk datasets for their projects.
                                        </p>
                                        <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                                            Request API Access
                                        </button>
                                    </div>
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
                            <div className="mb-8 flood-card bg-gradient-to-r from-green-500 to-teal-600 text-white">
                                <div className="text-center">
                                    <h2 className="text-3xl font-bold mb-3">Community Impact Dashboard</h2>
                                    <p className="text-green-100 text-lg">Together, we're building a safer South Sudan</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                {impactStats.map((stat, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flood-card text-center"
                                    >
                                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                                            </svg>
                                        </div>
                                        <div className="text-3xl font-bold text-slate-900 mb-2">{stat.value}</div>
                                        <div className="text-sm font-medium text-slate-600 mb-2">{stat.label}</div>
                                        <div className="text-xs text-green-600 font-semibold">{stat.trend}</div>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="flood-card">
                                    <h3 className="text-xl font-bold text-slate-900 mb-6">Recent Contributions</h3>
                                    <div className="space-y-4">
                                        {[
                                            { user: 'John M.', action: 'Reported flood in Juba', time: '2 hours ago', type: 'report' },
                                            { user: 'Sarah K.', action: 'Shared rainfall data', time: '5 hours ago', type: 'data' },
                                            { user: 'Ahmed H.', action: 'Verified flood extent', time: '1 day ago', type: 'verify' },
                                            { user: 'Mary W.', action: 'Uploaded satellite imagery', time: '2 days ago', type: 'data' }
                                        ].map((item, index) => (
                                            <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'report' ? 'bg-orange-100 text-orange-600' :
                                                    item.type === 'data' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-green-100 text-green-600'
                                                    }`}>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-semibold text-slate-900">{item.user}</div>
                                                    <div className="text-sm text-slate-600">{item.action}</div>
                                                </div>
                                                <div className="text-xs text-slate-500">{item.time}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flood-card bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
                                    <h3 className="text-xl font-bold mb-6">Achievement Unlocked!</h3>
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-lg">Community Hero</div>
                                                <div className="text-blue-100 text-sm">Contributed 10+ valuable reports</div>
                                            </div>
                                        </div>
                                        <div className="pt-6 border-t border-white/20">
                                            <div className="text-sm mb-2">Next Achievement: Data Champion</div>
                                            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                                                <div className="bg-white h-full rounded-full" style={{ width: '65%' }}></div>
                                            </div>
                                            <div className="text-xs text-blue-100 mt-2">13 / 20 contributions</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flood-card text-center">
                                <h3 className="text-2xl font-bold text-slate-900 mb-4">Keep Making a Difference!</h3>
                                <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
                                    Your contributions directly improve our AI models and help protect communities across South Sudan. Every report, every dataset makes us more accurate.
                                </p>
                                <div className="flex justify-center gap-4">
                                    <button
                                        onClick={() => setActiveTab('report')}
                                        className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                                    >
                                        Submit New Report
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('share')}
                                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
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
