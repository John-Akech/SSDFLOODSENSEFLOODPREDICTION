import { create } from 'zustand';

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location: string;
  timestamp: string;
  read: boolean;
}

interface Prediction {
  id: number;
  latitude: number;
  longitude: number;
  flood_probability: number;
  risk_level: string;
  confidence_score: number;
  created_at: string;
}

interface AppState {
  alerts: Alert[];
  predictions: Prediction[];
  isOnline: boolean;
  lastSync: string | null;
  addAlert: (alert: Alert) => void;
  markAlertRead: (id: string) => void;
  setPredictions: (predictions: Prediction[]) => void;
  setOnlineStatus: (status: boolean) => void;
  updateLastSync: () => void;
}

export const useStore = create<AppState>((set) => ({
  alerts: [],
  predictions: [],
  isOnline: navigator.onLine,
  lastSync: null,
  
  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts].slice(0, 50)
  })),
  
  markAlertRead: (id) => set((state) => ({
    alerts: state.alerts.map(a => a.id === id ? { ...a, read: true } : a)
  })),
  
  setPredictions: (predictions) => set({ predictions }),
  
  setOnlineStatus: (status) => set({ isOnline: status }),
  
  updateLastSync: () => set({ lastSync: new Date().toISOString() })
}));
