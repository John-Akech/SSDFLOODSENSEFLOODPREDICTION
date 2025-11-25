import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { reverseGeocode } from '../services/geocoding';
import '../styles/flood-colors.css';

// VAPID public key directly from Vite environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set(JSON.parse(localStorage.getItem('dismissedNotifications') || '[]')));
  const [locationNames, setLocationNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const data = await apiService.getActiveAlerts();
        const alerts = data.alerts || [];
        const filtered = alerts.filter((a: any) => !dismissedIds.has(a.id));
        setNotifications(filtered);
        setUnreadCount(filtered.length);

        // Get location names for all alerts
        const locationPromises = alerts.map(async (alert: any) => {
          try {
            const name = await reverseGeocode(alert.latitude, alert.longitude);
            return { id: alert.id, name };
          } catch (error) {
            console.warn('Failed to get location name:', error);
            return { id: alert.id, name: 'Unknown Location' };
          }
        });

        const locationResults = await Promise.all(locationPromises);
        const newLocationNames = locationResults.reduce((acc, { id, name }) => {
          acc[id] = name;
          return acc;
        }, {} as Record<number, string>);

        setLocationNames(prev => ({ ...prev, ...newLocationNames }));
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [dismissedIds]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'var(--risk-critical)';
      case 'high': return 'var(--risk-high)';
      case 'medium': return 'var(--risk-medium)';
      case 'low': return 'var(--risk-low)';
      default: return 'var(--risk-minimal)';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Critical Alert';
      case 'high': return 'High Risk';
      case 'medium': return 'Medium Risk';
      case 'low': return 'Low Risk';
      default: return 'Information';
    }
  };

  const dismissNotification = (id: number) => {
    const newDismissed = new Set(dismissedIds).add(id);
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissedNotifications', JSON.stringify([...newDismissed]));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const newDismissed = new Set([...dismissedIds, ...allIds]);
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissedNotifications', JSON.stringify([...newDismissed]));
  };

  const subscribeToPush = async () => {
    try {
      // Check browser support
      if (!('serviceWorker' in navigator)) {
        alert('Your browser does not support service workers');
        return;
      }
      if (!('PushManager' in window)) {
        alert('Your browser does not support push notifications');
        return;
      }

      // Check notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission denied. Please enable notifications in your browser settings.');
        return;
      }

      // Get service worker registration
      const reg = await navigator.serviceWorker.ready;

      // Get VAPID public key from environment
      if (!VAPID_PUBLIC_KEY) {
        console.error('VITE_VAPID_PUBLIC_KEY not configured');
        alert('Push notification configuration is missing. Please contact support.');
        return;
      }

      // Subscribe to push notifications
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send subscription to backend
      await apiService.pushSubscribe(sub.toJSON());
      alert('Push notifications enabled successfully!');
    } catch (e: any) {
      console.error('Push subscribe failed:', e);
      const errorMsg = e?.message || 'Unknown error';
      alert(`Failed to enable notifications: ${errorMsg}\n\nPlease check:\n- Browser supports notifications\n- Permissions are granted\n- Using HTTPS or localhost`);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 group"
        aria-label="Notifications"
      >
        <span className="font-bold text-sm">ALERTS</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse shadow-lg">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-flood-title">Flood Alerts</h3>
                  <p className="text-sm text-water-subtitle">
                    {unreadCount} active {unreadCount === 1 ? 'warning' : 'warnings'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 hover:bg-blue-100 rounded"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={subscribeToPush}
                    className="text-xs text-green-700 hover:text-green-900 font-medium px-2 py-1 hover:bg-green-100 rounded"
                    title="Enable push notifications"
                  >
                    Enable Push
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  </div>
                  <p className="font-medium">No active alerts</p>
                  <p className="text-sm">All monitored areas are safe</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className="p-4 hover:bg-gray-50 transition-colors group relative border-b border-gray-100 last:border-b-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notif.id);
                      }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded-full"
                      title="Dismiss notification"
                    >
                      <span className="text-xs font-bold text-gray-600">X</span>
                    </button>

                    <div className="flex items-start gap-3 pr-8">
                      <div
                        className="w-3 h-3 mt-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getSeverityColor(notif.severity) }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-bold px-2 py-1 rounded-full text-white"
                            style={{ backgroundColor: getSeverityColor(notif.severity) }}
                          >
                            {getSeverityText(notif.severity)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(notif.created_at || notif.predicted_date).toLocaleTimeString()}
                          </span>
                        </div>

                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {notif.message || `Flood ${notif.severity} risk detected`}
                        </p>

                        <p className="text-xs text-gray-600 font-medium flex items-center gap-1">
                          {locationNames[notif.id] || `${notif.latitude.toFixed(4)}, ${notif.longitude.toFixed(4)}`}
                        </p>

                        {notif.confidence && (
                          <p className="text-xs text-gray-500 mt-1">
                            Confidence: {Math.round(notif.confidence * 100)}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Last updated: {new Date().toLocaleTimeString()}</span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Live updates
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;