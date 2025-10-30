import React, { useState, useEffect } from 'react';
import { BellIcon } from './Icons';
import { apiService } from '../services/api';
import { reverseGeocode } from '../services/geocoding';

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set(JSON.parse(localStorage.getItem('dismissedNotifications') || '[]')));
  const [locationNames, setLocationNames] = useState<Record<number, string>>({});

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await apiService.getActiveAlerts();
        const alerts = data.alerts || [];
        const filtered = alerts.filter((a: any) => !dismissedIds.has(a.id));
        setNotifications(filtered);
        setUnreadCount(filtered.length);
        
        alerts.forEach(async (alert: any) => {
          const name = await reverseGeocode(alert.latitude, alert.longitude);
          setLocationNames(prev => ({ ...prev, [alert.id]: name }));
        });
      } catch (error) {
        console.error('Failed to fetch notifications');
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [dismissedIds]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Flood Alerts</h3>
              <p className="text-sm text-gray-500">{unreadCount} active warnings</p>
            </div>
            <div className="divide-y divide-gray-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <BellIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No active alerts</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className="p-4 hover:bg-gray-50 transition-colors group relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newDismissed = new Set(dismissedIds).add(notif.id);
                        setDismissedIds(newDismissed);
                        localStorage.setItem('dismissedNotifications', JSON.stringify([...newDismissed]));
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded-full"
                      title="Dismiss"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                        notif.severity === 'critical' ? 'bg-red-500' :
                        notif.severity === 'high' ? 'bg-red-500' :
                        notif.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <div className="flex-1 pr-6">
                        <p className="text-sm font-medium text-gray-900">{notif.message}</p>
                        <p className="text-xs text-gray-600 mt-1 font-semibold">
                          {locationNames[notif.id] || `${notif.latitude.toFixed(3)}, ${notif.longitude.toFixed(3)}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notif.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
