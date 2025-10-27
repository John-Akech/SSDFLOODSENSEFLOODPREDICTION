export interface Prediction {
  id: number;
  latitude: number;
  longitude: number;
  flood_probability: number;
  model_type: string;
  lead_time_hours: number;
  confidence_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  model_predictions?: { rf?: number; tcn?: number };
}

export interface Alert {
  id: string;
  latitude: number;
  longitude: number;
  message: string;
  severity: string;
  created_at: string;
  expires_at?: string;
}

export interface Recommendation {
  type: string;
  latitude: number;
  longitude: number;
  priority: string;
  estimated_length_m?: number;
  estimated_cost_usd?: number;
  construction_time_days?: number;
  materials_needed?: string[];
}
