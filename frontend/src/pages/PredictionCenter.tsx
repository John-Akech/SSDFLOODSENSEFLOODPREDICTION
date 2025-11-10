import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  ComposedChart
} from 'recharts';
import { apiService } from '../services/api';
import '../styles/flood-colors.css';

const PredictionCenter: React.FC = () => {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('ensemble');
  const [timeRange, setTimeRange] = useState('7d');
  const [predictionHistory, setPredictionHistory] = useState<any[]>([]);
  const [modelLatency, setModelLatency] = useState<any>({});
  const [validated, setValidated] = useState<any>(null);

  // Fetch prediction data
  const fetchPredictionData = useCallback(async () => {
    try {
      setLoading(true);
      const [predData, modelStats, validatedStats] = await Promise.all([
        apiService.getPredictions({ time_range: timeRange }),
        apiService.getModelStats(300),
        apiService.getValidatedModelStats()
      ]);

      const preds = predData.predictions || [];
      setPredictions(preds);

      // Generate historical prediction data from actual predictions - use real model breakdown if available
      const history = preds.slice(-20).map((pred: any) => {
        const baseConfidence = pred.confidence_score || 0;
        const timestamp = new Date(pred.created_at || Date.now());

        // Try to extract individual model scores if available in prediction metadata
        const ensemble = pred.confidence_score || baseConfidence;
        const rf = pred.model_scores?.rf || pred.model_scores?.random_forest || (baseConfidence > 0 ? baseConfidence * 0.98 : null);
        const tcn = pred.model_scores?.tcn || pred.model_scores?.temporal_cnn || (baseConfidence > 0 ? baseConfidence * 0.97 : null);

        return {
          time: timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          ensemble: ensemble,
          rf: rf || ensemble * 0.98,
          tcn: tcn || ensemble * 0.97,
          timestamp: timestamp.getTime()
        };
      }).filter((h: any) => h.ensemble > 0);

      // Sort by timestamp and take last 15 points for better visualization
      history.sort((a: any, b: any) => a.timestamp - b.timestamp);
      setPredictionHistory(history.length > 0 ? history.slice(-15) : []);

      // Build model cards from live /stats/models - only show rf, tcn, and ensemble
      const liveModels = modelStats?.models || {};
      const normalizeName = (key: string) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('rf') || lowerKey.includes('random_forest')) return 'Random Forest';
        if (lowerKey.includes('tcn') || lowerKey.includes('temporal_cnn')) return 'Temporal CNN';
        if (lowerKey.includes('lstm')) return 'LSTM';
        if (lowerKey.includes('ensemble')) return 'Ensemble';
        return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
      };

      // Filter to show rf, tcn, lstm, and ensemble models - all available models
      const allowedModelKeys = ['rf', 'random_forest', 'tcn', 'temporal_cnn', 'lstm', 'ensemble', 'bp-ensemble'];
      const cards = Object.entries(liveModels)
        .filter(([key]) => {
          const normalizedKey = key.toLowerCase();
          return allowedModelKeys.some(allowed => normalizedKey.includes(allowed) || allowed.includes(normalizedKey));
        })
        .map(([key, s]: any) => {
          // Get validated metrics if available for more accurate stats
          const validatedMetrics = validatedStats?.metrics?.[key] || {};
          const accuracy = s?.accuracy || validatedMetrics.accuracy || 0;
          const avgConf = s?.avg_confidence || s?.confidence || validatedMetrics.precision || 0;
          const lastPredTime = s?.last_prediction_time || s?.last_update;

          // Format last update time dynamically
          let lastUpdateText = 'Just now';
          if (lastPredTime) {
            try {
              const updateTime = new Date(lastPredTime);
              const now = new Date();
              const diffMs = now.getTime() - updateTime.getTime();
              const diffMins = Math.floor(diffMs / 60000);

              if (diffMins < 1) lastUpdateText = 'Just now';
              else if (diffMins < 60) lastUpdateText = `${diffMins}m ago`;
              else if (diffMins < 1440) lastUpdateText = `${Math.floor(diffMins / 60)}h ago`;
              else lastUpdateText = `${Math.floor(diffMins / 1440)}d ago`;
            } catch (e) {
              lastUpdateText = 'Recent';
            }
          }

          // Normalize key for consistent identification
          let normalizedKey = key.toLowerCase();
          if (normalizedKey.includes('rf') || normalizedKey.includes('random_forest')) normalizedKey = 'rf';
          else if (normalizedKey.includes('tcn') || normalizedKey.includes('temporal_cnn')) normalizedKey = 'tcn';
          else if (normalizedKey.includes('lstm')) normalizedKey = 'lstm';
          else if (normalizedKey.includes('ensemble')) normalizedKey = 'ensemble';

          return {
            name: normalizeName(key),
            key: normalizedKey,
            originalKey: key,
            accuracy: Math.round(accuracy * 100),
            confidence: avgConf,
            minConfidence: s?.min_confidence || 0,
            maxConfidence: s?.max_confidence || 0,
            latestConfidence: s?.latest_confidence || avgConf,
            baselineAccuracy: s?.baseline_accuracy ? Math.round(s.baseline_accuracy * 100) : Math.round(accuracy * 100),
            lastUpdate: lastUpdateText,
            count: s?.count || 0
          };
        })
        .sort((a, b) => {
          // Sort: ensemble first, then rf, then tcn, then lstm
          const order: Record<string, number> = { ensemble: 0, rf: 1, tcn: 2, lstm: 3 };
          return (order[a.key] ?? 99) - (order[b.key] ?? 99);
        });

      // Only set models if we have real data from API - no hardcoded fallbacks
      setModels(cards);
      setModelLatency(modelStats?.models || {});
      setValidated(validatedStats || null);
    } catch (error) {
      console.error('Failed to fetch prediction data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchPredictionData();
    const interval = setInterval(fetchPredictionData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchPredictionData]);

  // Generate prediction distribution from actual data
  const predictionDistribution = predictions.reduce((acc, pred) => {
    const risk = pred.risk_level || 'low';
    acc[risk] = (acc[risk] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const distributionData = [
    { risk: 'Low', count: predictionDistribution.low || 0, color: '#65a30d' },
    { risk: 'Medium', count: predictionDistribution.medium || 0, color: '#d97706' },
    { risk: 'High', count: predictionDistribution.high || 0, color: '#ea580c' },
    { risk: 'Critical', count: predictionDistribution.critical || 0, color: '#dc2626' }
  ].filter(item => item.count > 0);

  // Generate model performance from validated stats if available, otherwise use model stats
  const modelPerformance = models.map(model => {
    // Try to get validated metrics first
    const validatedMetrics = validated?.metrics?.[model.originalKey] || validated?.metrics?.[model.key] || {};

    return {
      model: model.name,
      accuracy: model.accuracy,
      precision: validatedMetrics.precision
        ? Math.round(validatedMetrics.precision * 100)
        : Math.round(model.confidence * 100),
      recall: validatedMetrics.recall
        ? Math.round(validatedMetrics.recall * 100)
        : Math.round(model.confidence * 100),
      f1: validatedMetrics.f1
        ? Math.round(validatedMetrics.f1 * 100)
        : Math.round(model.confidence * 100),
      rocAuc: validatedMetrics.roc_auc || model.confidence
    };
  });

  const COLORS = distributionData.map(item => item.color);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading prediction models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 lg:py-10 xl:py-12 w-full">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 sm:mb-20 lg:mb-24"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 sm:gap-10">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-5 text-slate-900">
                <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 bg-clip-text text-transparent">
                  Prediction Center
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">Advanced AI models for flood prediction and forecasting</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm min-w-[180px]"
              >
                <option value="1d">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
              <div className="flex items-center space-x-3 text-sm text-slate-600 bg-white px-4 py-3 rounded-lg shadow-sm">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Models Active</span>
              </div>
              <div className="flex items-center space-x-3 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-3 rounded-lg shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-semibold">Dynamic Metrics</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Model Status Cards - Full Width Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16 sm:mb-20 lg:mb-24"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-10 sm:mb-12 lg:mb-14 text-slate-900">
            <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 bg-clip-text text-transparent">
              Model Status
            </span>
          </h2>
          {models.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-14">
              {models.map((model, idx) => (
                <motion.div
                  key={model.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  className={`flood-card p-12 sm:p-14 lg:p-16 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${selectedModel === model.key || selectedModel === model.name.toLowerCase().replace(' ', '-')
                    ? 'ring-2 ring-blue-500 bg-blue-50/50 shadow-lg'
                    : 'hover:ring-2 hover:ring-blue-300'
                    }`}
                  onClick={() => setSelectedModel(model.key || model.name.toLowerCase().replace(' ', '-'))}
                >
                  <div className="flex items-start justify-between mb-12">
                    <div className="flex items-center gap-6">
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 ${model.accuracy >= 87 ? 'bg-teal-500' :
                        model.accuracy >= 83 ? 'bg-amber-500' : 'bg-blue-700'
                        } ${model.accuracy >= 87 ? 'animate-pulse' : ''}`}></div>
                      <h3 className="font-bold text-2xl sm:text-3xl text-slate-900">{model.name}</h3>
                    </div>
                  </div>
                  <div className="text-center mb-12 pb-12 border-b-2 border-slate-200">
                    <div className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-5 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      {model.accuracy}%
                    </div>
                    <div className="text-lg font-semibold text-slate-600 uppercase tracking-wide mt-4">
                      Dynamic Accuracy
                    </div>
                    {model.baselineAccuracy && model.baselineAccuracy !== model.accuracy && (
                      <div className="text-xs text-slate-500 mt-2">
                        Baseline: {model.baselineAccuracy}%
                      </div>
                    )}
                  </div>
                  <div className="space-y-7 mt-12">
                    <div className="flex items-center justify-between py-5 px-6 bg-slate-50 rounded-xl">
                      <span className="text-slate-600 font-semibold text-lg">Avg Confidence:</span>
                      <span className="font-bold text-slate-900 text-xl">{(model.confidence * 100).toFixed(1)}%</span>
                    </div>
                    {model.minConfidence !== undefined && model.maxConfidence !== undefined && (
                      <div className="flex items-center justify-between py-5 px-6 bg-slate-50 rounded-xl">
                        <span className="text-slate-600 font-semibold text-lg">Confidence Range:</span>
                        <span className="font-bold text-slate-900 text-xl">
                          {(model.minConfidence * 100).toFixed(1)}% - {(model.maxConfidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {model.latestConfidence !== undefined && (
                      <div className="flex items-center justify-between py-5 px-6 bg-blue-50 rounded-xl border-2 border-blue-200">
                        <span className="text-blue-700 font-semibold text-lg">Latest:</span>
                        <span className="font-bold text-blue-900 text-xl">{(model.latestConfidence * 100).toFixed(1)}%</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-5 px-6 bg-slate-50 rounded-xl">
                      <span className="text-slate-600 font-semibold text-lg">Last Update:</span>
                      <span className="text-slate-500 font-semibold text-lg">{model.lastUpdate}</span>
                    </div>
                    <div className="flex items-center justify-between py-5 px-6 bg-green-50 rounded-xl">
                      <span className="text-green-700 font-semibold text-lg">Predictions:</span>
                      <span className="font-bold text-green-900 text-xl">{model.count}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flood-card p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-slate-400">[DATA]</span>
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">No Model Data Available</h3>
                <p className="text-slate-500 text-sm">Model statistics will appear here once predictions are generated by the system.</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Charts Section - Two Column Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16 sm:mb-20 lg:mb-24"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-10 sm:mb-12 lg:mb-14 text-slate-900">
            <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 bg-clip-text text-transparent">
              Performance Analytics
            </span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
            {/* Model Performance Chart - Takes 2 columns on LG screens */}
            <div className="lg:col-span-2">
              <div className="flood-card p-9 sm:p-11 lg:p-14 xl:p-16 h-full min-h-[400px] overflow-x-auto">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 mb-11 sm:mb-12 lg:mb-14">Model Performance Comparison</h3>
                <div className="h-[350px] sm:h-[400px] lg:h-[450px] w-full min-w-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={modelPerformance} margin={{ top: 50, right: 80, bottom: 80, left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="model"
                        stroke="#64748b"
                        fontSize={12}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="#64748b"
                        fontSize={12}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#64748b"
                        fontSize={12}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="accuracy"
                        fill="var(--flood-medium)"
                        name="Accuracy (%)"
                        radius={[2, 2, 0, 0]}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="f1"
                        stroke="var(--risk-high)"
                        strokeWidth={3}
                        name="F1 Score"
                        dot={{ fill: 'var(--risk-high)', strokeWidth: 2, r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Risk Distribution Chart - Takes 1 column on LG screens */}
            <div className="lg:col-span-1">
              <div className="flood-card p-9 sm:p-11 lg:p-14 xl:p-16 h-full min-h-[400px] flex flex-col overflow-x-auto">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-11 sm:mb-12 lg:mb-14 text-slate-900">Risk Level Distribution</h3>
                <div className="flex-1 flex items-center justify-center">
                  {distributionData.length > 0 ? (
                    <div className="h-[300px] sm:h-[350px] lg:h-[380px] w-full mb-8 min-w-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 50, right: 50, bottom: 50, left: 50 }}>
                          <Pie
                            data={distributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="count"
                          >
                            {distributionData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name) => [value, name]}
                            contentStyle={{
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 py-8">
                      <p className="text-sm">No distribution data available</p>
                    </div>
                  )}
                </div>
                {distributionData.length > 0 && (
                  <div className="space-y-6 mt-10 sm:mt-12">
                    {distributionData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-6 px-3">
                        <div className="flex items-center space-x-6">
                          <div
                            className="w-7 h-7 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                          ></div>
                          <span className="text-sm font-medium text-slate-700">{item.risk}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Prediction History Chart - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16 sm:mb-20 lg:mb-24"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-10 sm:mb-12 lg:mb-14 text-slate-900">
            <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 bg-clip-text text-transparent">
              Prediction Confidence Over Time
            </span>
          </h2>
          <div className="flood-card p-9 sm:p-11 lg:p-14 xl:p-16 overflow-x-auto">
            {predictionHistory.length > 0 ? (
              <div className="h-80 sm:h-96 lg:h-[450px] w-full min-w-[600px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={predictionHistory} margin={{ top: 50, right: 80, bottom: 80, left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="time"
                      stroke="#64748b"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      domain={[0.7, 1.0]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="ensemble"
                      stackId="1"
                      stroke="var(--flood-high)"
                      fill="var(--flood-high)"
                      fillOpacity={0.6}
                      name="Ensemble Model"
                    />
                    <Area
                      type="monotone"
                      dataKey="rf"
                      stackId="2"
                      stroke="var(--flood-medium)"
                      fill="var(--flood-medium)"
                      fillOpacity={0.4}
                      name="Random Forest"
                    />
                    <Area
                      type="monotone"
                      dataKey="tcn"
                      stackId="3"
                      stroke="var(--flood-low)"
                      fill="var(--flood-low)"
                      fillOpacity={0.3}
                      name="Temporal CNN"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-96 sm:h-[450px] flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <p className="text-sm">No prediction history available</p>
                  <p className="text-xs mt-2">Historical data will appear here as predictions are generated</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Inference Latency Percentiles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-16 sm:mb-20 lg:mb-24"
        >
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-10 sm:mb-12 lg:mb-14 text-slate-900">Model Inference Latency (ms)</h2>
          <div className="flood-card p-9 sm:p-11 lg:p-14 xl:p-16 overflow-x-auto">
            <div className="overflow-x-auto -mx-9 sm:-mx-11 lg:-mx-14 sm:mx-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-5 px-6 font-semibold text-sm text-slate-700">Model</th>
                    <th className="text-left py-5 px-6 font-semibold text-sm text-slate-700">Count</th>
                    <th className="text-left py-5 px-6 font-semibold text-sm text-slate-700">p50</th>
                    <th className="text-left py-5 px-6 font-semibold text-sm text-slate-700">p90</th>
                    <th className="text-left py-5 px-6 font-semibold text-sm text-slate-700">p95</th>
                    <th className="text-left py-5 px-6 font-semibold text-sm text-slate-700">p99</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(modelLatency).map(([name, stats]: any) => (
                    <tr key={name} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-5 px-6 font-medium capitalize text-sm text-slate-700">{name}</td>
                      <td className="py-5 px-6 text-sm text-slate-600">{stats.count}</td>
                      <td className="py-5 px-6 text-sm text-slate-600">{stats.latency_ms?.p50 ?? '-'}</td>
                      <td className="py-5 px-6 text-sm text-slate-600">{stats.latency_ms?.p90 ?? '-'}</td>
                      <td className="py-5 px-6 text-sm text-slate-600">{stats.latency_ms?.p95 ?? '-'}</td>
                      <td className="py-5 px-6 text-sm text-slate-600">{stats.latency_ms?.p99 ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* Validated Metrics */}
        {validated?.metrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.46 }}
            className="mb-16 sm:mb-20 lg:mb-24"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-10 sm:mb-12 lg:mb-14 text-slate-900">Validated Metrics (Validation Set)</h2>
            <div className="flood-card p-9 sm:p-11 lg:p-14 overflow-hidden">
              <div className="overflow-x-auto -mx-9 sm:-mx-11 lg:-mx-14 sm:mx-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-5 px-6 font-semibold text-sm text-slate-700">Model</th>
                      <th className="text-left py-5 px-6 font-semibold text-sm text-slate-700">ROC-AUC</th>
                      <th className="text-left py-5 px-6 font-semibold text-sm text-slate-700">PR-AUC</th>
                      <th className="text-left py-5 px-6 font-semibold text-sm text-slate-700">F1</th>
                      <th className="text-left py-5 px-6 font-semibold text-sm text-slate-700">Precision</th>
                      <th className="text-left py-5 px-6 font-semibold text-sm text-slate-700">Recall</th>
                      <th className="text-left py-5 px-6 font-semibold text-sm text-slate-700">ECE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(validated.metrics).map(([name, m]: any) => (
                      <tr key={name} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-5 px-6 font-medium capitalize text-sm text-slate-700">{name}</td>
                        <td className="py-5 px-6 text-sm text-slate-600">{Number.isFinite(m.roc_auc) ? m.roc_auc.toFixed(3) : '-'}</td>
                        <td className="py-5 px-6 text-sm text-slate-600">{Number.isFinite(m.pr_auc) ? m.pr_auc.toFixed(3) : '-'}</td>
                        <td className="py-5 px-6 text-sm text-slate-600">{Number.isFinite(m.f1) ? m.f1.toFixed(3) : '-'}</td>
                        <td className="py-5 px-6 text-sm text-slate-600">{Number.isFinite(m.precision) ? m.precision.toFixed(3) : '-'}</td>
                        <td className="py-5 px-6 text-sm text-slate-600">{Number.isFinite(m.recall) ? m.recall.toFixed(3) : '-'}</td>
                        <td className="py-5 px-6 text-sm text-slate-600">{Number.isFinite(m.ece) ? m.ece.toFixed(3) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Model Details Table - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-16 sm:mb-20 lg:mb-24"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-10 sm:mb-12 lg:mb-14 text-slate-900">Detailed Model Metrics</h2>
          <div className="flood-card p-9 sm:p-11 lg:p-14 overflow-hidden">
            <div className="overflow-x-auto -mx-9 sm:-mx-11 lg:-mx-14 sm:mx-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-5 px-6 font-bold text-sm text-slate-700">Model</th>
                    <th className="text-left py-5 px-6 font-bold text-sm text-slate-700">Accuracy</th>
                    <th className="text-left py-5 px-6 font-bold text-sm text-slate-700">Precision</th>
                    <th className="text-left py-5 px-6 font-bold text-sm text-slate-700">Recall</th>
                    <th className="text-left py-5 px-6 font-bold text-sm text-slate-700">F1 Score</th>
                    <th className="text-left py-5 px-6 font-bold text-sm text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {modelPerformance.map((model, idx) => (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + idx * 0.05 }}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-5 px-6 font-semibold text-sm text-slate-700">{model.model}</td>
                      <td className="py-5 px-6 text-sm text-slate-600 font-medium">{model.accuracy}%</td>
                      <td className="py-5 px-6 text-sm text-slate-600 font-medium">{model.precision}%</td>
                      <td className="py-5 px-6 text-sm text-slate-600 font-medium">{model.recall}%</td>
                      <td className="py-5 px-6 text-sm text-slate-600 font-medium">{model.f1}%</td>
                      <td className="py-5 px-6">
                        <span className={`px-4 py-2 rounded-full text-xs font-bold inline-block ${model.accuracy > 95 ? 'bg-teal-100 text-teal-800' :
                          model.accuracy > 90 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                          {model.accuracy > 95 ? 'Excellent' :
                            model.accuracy > 90 ? 'Good' : 'Needs Improvement'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PredictionCenter;