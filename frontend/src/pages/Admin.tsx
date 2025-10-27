import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { Prediction } from '../types';
import api from '../services/api';
import { ShieldIcon, ChartIcon } from '../components/Icons';
import { useLanguage } from '../i18n/LanguageContext';
import { reverseGeocode } from '../services/geocoding';

const Admin: React.FC = () => {
  const { t } = useLanguage();
  const [pendingPredictions, setPendingPredictions] = useState<Prediction[]>([]);
  const [locationNames, setLocationNames] = useState<Record<number, string>>({});
  const [publishedAlerts, setPublishedAlerts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ total: 0, approved: 0, pending: 0, approval_rate: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedPred, setSelectedPred] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const fetchData = async () => {
    try {
      const [pending, alerts, metricsData] = await Promise.all([
        api.get('/admin/pending-predictions'),
        apiService.getActiveAlerts(),
        api.get('/admin/metrics')
      ]);
      
      const predictions = pending.data.predictions || [];
      const alertList = alerts.alerts || [];
      
      setPendingPredictions(predictions);
      setPublishedAlerts(alertList);
      setMetrics(metricsData.data);
      
      [...predictions, ...alertList].forEach(async (item: any) => {
        const name = await reverseGeocode(item.latitude, item.longitude);
        setLocationNames(prev => ({ ...prev, [item.id]: name }));
      });
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (predId: number) => {
    try {
      await api.post(`/admin/approve-prediction/${predId}`, null, {
        params: { admin_notes: adminNotes }
      });
      alert('✓ Prediction approved and published to public UI');
      setAdminNotes('');
      setSelectedPred(null);
      fetchData();
    } catch (error) {
      alert('Failed to approve prediction');
    }
  };

  const handleReject = async (predId: number) => {
    if (!confirm('Reject this prediction? It will be hidden from public.')) return;
    try {
      await api.post(`/admin/reject-prediction/${predId}`, null, {
        params: { reason: 'Admin rejected' }
      });
      alert('✗ Prediction rejected');
      fetchData();
    } catch (error) {
      alert('Failed to reject prediction');
    }
  };

  const handleRetract = async (predId: number) => {
    if (!confirm('Retract this alert from public UI?')) return;
    try {
      await api.post(`/admin/retract-alert/${predId}`);
      alert('Alert retracted from public view');
      fetchData();
    } catch (error) {
      alert('Failed to retract alert');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-ocean-200"></div>
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-ocean-600 border-t-transparent absolute top-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-slide-in">
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-xl">
            <ShieldIcon className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-5xl font-black">
              <span className="gradient-text">{t('adminControlPanel')}</span>
            </h1>
            <p className="text-lg text-gray-600 mt-1">{t('moderateAIPredictions')} • {t('autoRefresh')} 10{t('seconds')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { value: metrics.pending, label: t('pendingReview'), color: 'from-orange-500 to-amber-500' },
          { value: metrics.approved, label: t('published'), color: 'from-emerald-500 to-teal-500' },
          { value: `${metrics.approval_rate}%`, label: t('approvalRate'), color: 'from-ocean-500 to-cyan-500' },
          { value: metrics.total, label: t('totalPredictions'), color: 'from-purple-500 to-pink-500' }
        ].map((stat, idx) => (
          <div key={idx} className="stat-card animate-float" style={{ animationDelay: `${idx * 0.1}s` }}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-3 h-12 bg-gradient-to-b ${stat.color} rounded-full`}></div>
              <span className="text-5xl font-black gradient-text">{stat.value}</span>
            </div>
            <p className="text-sm font-bold text-gray-700 uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-3 h-8 bg-gradient-to-b from-orange-500 to-red-500 rounded-full animate-pulse"></div>
            <h2 className="text-2xl font-black text-gray-900">{t('pendingPredictions')} ({pendingPredictions.length})</h2>
          </div>

          {pendingPredictions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-2xl font-black text-gray-900 mb-2">{t('allClear')}</p>
              <p className="text-gray-600">{t('noPendingPredictions')}</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {pendingPredictions.map((pred, idx) => (
                <div 
                  key={pred.id} 
                  className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <RiskBadge level={pred.risk_level} />
                      <p className="text-sm font-bold text-gray-700 mt-2">{t('aiConfidence')}: <span className="text-ocean-600">{(pred.confidence_score * 100).toFixed(0)}%</span></p>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 bg-white px-3 py-1 rounded-full">{new Date(pred.created_at).toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-4 bg-white/60 backdrop-blur-sm rounded-xl p-4">
                    <div className="font-semibold"><span className="text-gray-600">{t('location')}:</span> <span className="text-gray-900">{locationNames[pred.id] || `${pred.latitude.toFixed(3)}, ${pred.longitude.toFixed(3)}`}</span></div>
                    <div className="font-semibold"><span className="text-gray-600">{t('probability')}:</span> <span className="text-red-600">{(pred.flood_probability * 100).toFixed(1)}%</span></div>
                    <div className="font-semibold"><span className="text-gray-600">{t('model')}:</span> <span className="text-ocean-600">{pred.model_type.toUpperCase()}</span></div>
                    <div className="font-semibold"><span className="text-gray-600">{t('leadTime')}:</span> <span className="text-purple-600">{pred.lead_time_hours}h</span></div>
                  </div>

                  {pred.model_predictions && (
                    <div className="text-sm bg-white/80 backdrop-blur-sm p-3 rounded-xl mb-4 font-semibold">
                      <span className="text-gray-700">{t('modelBreakdown')}:</span> 
                      <span className="text-ocean-600 ml-2">RF: {(pred.model_predictions.rf! * 100).toFixed(0)}%</span>
                      <span className="text-cyan-600 ml-2">TCN: {(pred.model_predictions.tcn! * 100).toFixed(0)}%</span>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-bold mb-2 text-gray-700">{t('adminNotes')}:</label>
                    <textarea
                      className="w-full text-sm border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-200 transition-all"
                      rows={2}
                      placeholder={t('addContext')}
                      value={selectedPred === pred.id ? adminNotes : ''}
                      onChange={e => { setSelectedPred(pred.id); setAdminNotes(e.target.value); }}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(pred.id)}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3 rounded-xl text-sm font-bold hover:from-emerald-700 hover:to-emerald-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                    >
                      ✓ {t('approvePublish')}
                    </button>
                    <button
                      onClick={() => handleReject(pred.id)}
                      className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 rounded-xl text-sm font-bold hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                    >
                      ✗ {t('rejectHide')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-3 h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
            <h2 className="text-2xl font-black text-gray-900">{t('publishedAlerts')} ({publishedAlerts.length})</h2>
          </div>

          {publishedAlerts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <p className="text-2xl font-black text-gray-900 mb-2">{t('noPublishedAlerts')}</p>
              <p className="text-gray-600">{t('approvePredictions')}</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {publishedAlerts.map((alert, idx) => (
                <div 
                  key={alert.id} 
                  className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <RiskBadge level={alert.severity as any} />
                    <button
                      onClick={() => handleRetract(alert.id)}
                      className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-full transition-all"
                    >
                      {t('retract')}
                    </button>
                  </div>
                  <p className="text-sm font-bold text-gray-900 mb-3">{alert.message}</p>
                  <div className="text-xs font-semibold text-gray-600 bg-white/60 backdrop-blur-sm rounded-xl p-3 space-y-1">
                    <p>{t('location')}: {locationNames[alert.id] || `${alert.latitude.toFixed(3)}, ${alert.longitude.toFixed(3)}`}</p>
                    <p>{t('published')}: {new Date(alert.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
