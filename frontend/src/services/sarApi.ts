/**
 * SAR Detection API Service
 * Handles communication with the SAR flood detection microservice
 */

import axios from 'axios';

// Use environment variable or fallback to localhost for development
// VITE_SAR_URL should be '/sar' in production (proxied through app platform)
const SAR_BASE_URL = import.meta.env.VITE_SAR_URL || 'http://localhost:8080';

const sarApi = axios.create({
    baseURL: SAR_BASE_URL,
    timeout: 120000, // 2 minutes - SAR processing can be slow
    headers: { 'Content-Type': 'application/json' }
});

// Response interceptor for error handling
sarApi.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('SAR API Error:', error);
        return Promise.reject(error);
    }
);

export interface FloodDetectionRequest {
    bbox: string;
    init_start: string;
    init_last: string;
    flood_start: string;
    flood_last: string;
    flood_threshold?: number;
}

export interface FloodDetectionResponse {
    detection_id?: number;
    status: string;
    confidence?: number;
    classification?: string;
    flood_area_hectares?: number;
    flood_percentage?: number;
    flood_patches?: number;
    processing_time_seconds?: number;
    message?: string;
    // For display endpoint
    before_tile?: string;
    after_tile?: string;
    flood_tile?: string;
    permanent_water_tile?: string;
    high_slope_tile?: string;
    metadata?: Record<string, any>;
}

export interface SentinelAvailability {
    available: boolean;
    latest_date?: string;
    images_last_30_days?: number;
    message: string;
    recommended_flood_period_start?: string;
    recommended_flood_period_end?: string;
}

export interface FeatureExtractionRequest {
    latitude: number;
    longitude: number;
    buffer_km?: number;
    lead_time_hours?: number;
}

export const sarApiService = {
    /**
     * Check Google Earth Engine authentication status
     */
    checkGEEStatus: async () => {
        const response = await sarApi.get('/gee/status');
        return response.data;
    },

    /**
     * Authenticate with Google Earth Engine
     */
    authenticateGEE: async (projectId?: string) => {
        const response = await sarApi.post('/gee/authenticate', { project_id: projectId });
        return response.data;
    },

    /**
     * Check Sentinel-1 data availability for a location
     */
    checkSentinel1Availability: async (
        lat: number,
        lon: number,
        startDate?: string,
        endDate?: string
    ): Promise<SentinelAvailability> => {
        const params: Record<string, any> = { lat, lon };
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const response = await sarApi.get('/sentinel1/availability', { params });
        return response.data;
    },

    /**
     * Run flood detection and save to database (without downloading file)
     */
    detectFlood: async (request: FloodDetectionRequest): Promise<FloodDetectionResponse> => {
        const response = await sarApi.post('/flood_detect', request);
        return response.data;
    },

    /**
     * Display flood detection results as map tiles (for visualization)
     */
    displayFloodDetection: async (request: FloodDetectionRequest): Promise<FloodDetectionResponse> => {
        const response = await sarApi.post('/flood_display', request);
        return response.data;
    },

    /**
     * Download flood detection geopackage by ID
     */
    downloadFloodDetection: async (detectionId: number): Promise<Blob> => {
        const response = await sarApi.get(`/flood_download/${detectionId}`, {
            responseType: 'blob'
        });
        return response.data;
    },

    /**
     * List all flood detections from database
     */
    listFloodDetections: async (skip: number = 0, limit: number = 50) => {
        const response = await sarApi.get('/flood_detections', {
            params: { skip, limit }
        });
        return response.data;
    },

    /**
     * Extract satellite features for a location (for ML predictions)
     */
    extractFeatures: async (request: FeatureExtractionRequest) => {
        const response = await sarApi.post('/extract-features', request);
        return response.data;
    },

    /**
     * Health check for SAR service
     */
    healthCheck: async () => {
        const response = await sarApi.get('/health');
        return response.data;
    }
};

export default sarApi;
