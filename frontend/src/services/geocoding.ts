import api from './api';

interface LocationInfo {
  placeName: string;
  area: string;
  state: string;
  fullName: string;
}

// In-memory cache
const cache = new Map<string, string>();
const detailedCache = new Map<string, LocationInfo>();
const coordCache = new Map<string, { lat: number; lon: number }>();

// Rate limiting queue
let requestQueue: Array<() => Promise<void>> = [];
let isProcessing = false;
const REQUEST_DELAY = 100; // 100ms between requests for better performance

// Load cache from localStorage on startup
const loadCacheFromStorage = () => {
  try {
    const stored = localStorage.getItem('geocode_cache');
    if (stored) {
      const parsed = JSON.parse(stored);
      Object.entries(parsed).forEach(([key, value]) => {
        cache.set(key, value as string);
      });
    }
  } catch (error) {
    console.warn('Failed to load geocode cache:', error);
  }
};

// Save cache to localStorage
const saveCacheToStorage = () => {
  try {
    const obj: Record<string, string> = {};
    cache.forEach((value, key) => {
      obj[key] = value;
    });
    localStorage.setItem('geocode_cache', JSON.stringify(obj));
  } catch (error) {
    console.warn('Failed to save geocode cache:', error);
  }
};

// Initialize cache
loadCacheFromStorage();

// Process queue with rate limiting
const processQueue = async () => {
  if (isProcessing || requestQueue.length === 0) return;

  isProcessing = true;
  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (request) {
      await request();
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    }
  }
  isProcessing = false;
};

/**
 * Reverse geocode coordinates to get a place name.
 * STRICT MODE: No hardcoded fallbacks.
 * Returns the coordinate string if the API fails or times out.
 */
export const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  // Validate coordinates
  if (!lat || !lon || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return 'Invalid coordinates';
  }

  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;

  // Check cache first
  if (cache.has(key)) return cache.get(key)!;

  // We do NOT use knownLocations anymore.
  // We will await the real API call.

  return new Promise<string>((resolve) => {
    const fallback = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

    // Add to queue
    requestQueue.push(async () => {
      try {
        // Use backend proxy to avoid CORS issues
        const response = await api.get(`/gis/geocode?lat=${lat}&lon=${lon}`);
        const data = response.data;

        // Extract detailed location information
        let name = '';
        if (data.address) {
          const parts = [];
          const addr = data.address;

          // Add village/town/city/suburb (most specific location)
          if (addr.village) parts.push(addr.village);
          else if (addr.town) parts.push(addr.town);
          else if (addr.city) parts.push(addr.city);
          else if (addr.suburb) parts.push(addr.suburb);

          // Add state
          if (addr.state && !parts.includes(addr.state)) {
            parts.push(addr.state);
          }

          // Add country
          if (addr.country && !parts.includes(addr.country)) {
            parts.push(addr.country);
          }

          name = parts.join(', ');
        }

        // Fallback to display_name
        if (!name && data.display_name) {
          const displayParts = data.display_name.split(',').map((p: string) => p.trim());
          name = displayParts.slice(0, 3).join(', ');
        }

        if (name) {
          cache.set(key, name);
          saveCacheToStorage();
          resolve(name);
        } else {
          resolve(fallback);
        }
      } catch (error) {
        console.warn(`Geocoding failed for ${lat},${lon}:`, error);
        resolve(fallback);
      }
    });

    processQueue();
  });
};

export const getDetailedLocation = async (lat: number, lon: number): Promise<LocationInfo> => {
  // Validate coordinates
  if (!lat || !lon || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return {
      placeName: 'Invalid coordinates',
      area: 'Unknown',
      state: 'Unknown',
      fullName: 'Invalid coordinates'
    };
  }

  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (detailedCache.has(key)) return detailedCache.get(key)!;

  const fallback: LocationInfo = {
    placeName: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    area: 'Unknown',
    state: 'Unknown',
    fullName: `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  };

  return new Promise<LocationInfo>((resolve) => {
    requestQueue.push(async () => {
      try {
        // Use backend proxy
        const response = await api.get(`/gis/geocode?lat=${lat}&lon=${lon}`);
        const data = response.data;

        if (data.address) {
          const addr = data.address;
          const placeName = addr.village || addr.town || addr.city || addr.suburb || '';
          const state = addr.state || 'Unknown State';
          const area = addr.county || addr.municipality || state;

          const parts = [];
          if (placeName) parts.push(placeName);
          if (area && !parts.includes(area)) parts.push(area);
          if (state && !parts.includes(state)) parts.push(state);

          const info: LocationInfo = {
            placeName: placeName || fallback.placeName,
            area,
            state,
            fullName: parts.join(', ') || fallback.fullName
          };

          detailedCache.set(key, info);
          resolve(info);
        } else {
          resolve(fallback);
        }
      } catch (error) {
        console.warn(`Detailed geocoding failed for ${lat},${lon}:`, error);
        resolve(fallback);
      }
    });
    processQueue();
  });
};

export const getStateName = async (lat: number, lon: number): Promise<string> => {
  // Validate coordinates
  if (!lat || !lon || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return 'Unknown State';
  }

  try {
    // Use backend proxy
    const response = await api.get(`/gis/geocode?lat=${lat}&lon=${lon}`);
    const data = response.data;
    return data.address?.state || 'Unknown State';
  } catch {
    return 'Unknown State';
  }
};

export const forwardGeocode = async (placeName: string): Promise<{ lat: number; lon: number; displayName?: string } | null> => {
  if (!placeName || placeName.trim().length === 0) return null;

  const key = placeName.toLowerCase().trim();
  if (coordCache.has(key)) return coordCache.get(key)!;

  try {
    // Use backend proxy for forward geocoding
    const response = await api.get(`/gis/search?q=${encodeURIComponent(placeName)},South Sudan&countrycodes=ss`);
    const data = response.data;

    if (data && data.length > 0) {
      const item = data[0];
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);

      // Validate coordinates are in South Sudan region
      if (lat >= 3 && lat <= 13 && lon >= 24 && lon <= 36) {
        const coords = { lat, lon, displayName: item.display_name };
        coordCache.set(key, coords);
        return coords;
      }
    }
    return null;
  } catch (error) {
    console.warn('Geocoding error:', error);
    return null;
  }
};

