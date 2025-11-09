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
const REQUEST_DELAY = 1000; // 1 second between requests (Nominatim policy)

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

// Static fallback locations for common South Sudan coordinates
const knownLocations: Record<string, string> = {
  '7.012,31.306': 'Juba, Central Equatoria, South Sudan',
  '8.500,31.500': 'Malakal, Upper Nile, South Sudan',
  '6.210,31.560': 'Yei, Central Equatoria, South Sudan',
  '8.500,30.200': 'Wau, Western Bahr el Ghazal, South Sudan',
  '7.500,31.000': 'Bor, Jonglei, South Sudan',
  '9.317,30.417': 'Aweil, Northern Bahr el Ghazal, South Sudan',
  '6.877,31.307': 'Yambio, Western Equatoria, South Sudan',
  '7.500,30.500': 'Rumbek, Lakes, South Sudan',
  '4.620,31.580': 'Torit, Eastern Equatoria, South Sudan',
};

// Get closest known location
const getKnownLocation = (lat: number, lon: number): string | null => {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (knownLocations[key]) return knownLocations[key];

  // Check nearby (within 0.1 degrees)
  for (const [coordKey, name] of Object.entries(knownLocations)) {
    const [knownLat, knownLon] = coordKey.split(',').map(Number);
    if (Math.abs(knownLat - lat) < 0.1 && Math.abs(knownLon - lon) < 0.1) {
      return name;
    }
  }

  return null;
};

export const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  // Validate coordinates
  if (!lat || !lon || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return 'Invalid coordinates';
  }

  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;

  // Check cache first
  if (cache.has(key)) return cache.get(key)!;

  // Check known locations
  const known = getKnownLocation(lat, lon);
  if (known) {
    cache.set(key, known);
    saveCacheToStorage();
    return known;
  }

  // Return coordinates immediately and fetch in background
  const fallback = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

  // Queue the actual geocoding request (background processing)
  requestQueue.push(async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en&zoom=10`,
        {
          headers: { 'User-Agent': 'FloodSense/1.0' },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

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
      }
    } catch (error) {
      console.warn(`Geocoding failed for ${lat},${lon}:`, error);
    }
  });

  processQueue();

  // Return fallback immediately
  return fallback;
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

  // Return fallback immediately
  const fallback: LocationInfo = {
    placeName: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    area: 'Unknown',
    state: 'Unknown',
    fullName: `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  };

  // Check known locations
  const known = getKnownLocation(lat, lon);
  if (known) {
    const parts = known.split(', ');
    const info: LocationInfo = {
      placeName: parts[0] || fallback.placeName,
      area: parts[1] || 'Unknown',
      state: parts[1] || 'Unknown',
      fullName: known
    };
    detailedCache.set(key, info);
    return info;
  }

  // Queue request for background processing
  requestQueue.push(async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en&zoom=10`,
        {
          headers: { 'User-Agent': 'FloodSense/1.0' },
          signal: AbortSignal.timeout(5000)
        }
      );

      if (!response.ok) return;

      const data = await response.json();

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
      }
    } catch (error) {
      console.warn(`Detailed geocoding failed for ${lat},${lon}:`, error);
    }
  });

  processQueue();

  return fallback;
};

export const getStateName = async (lat: number, lon: number): Promise<string> => {
  // Validate coordinates
  if (!lat || !lon || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return 'Unknown State';
  }

  // Check known locations first
  const known = getKnownLocation(lat, lon);
  if (known) {
    const parts = known.split(', ');
    return parts[1] || 'Unknown State'; // Return the state part
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en&zoom=5`,
      {
        headers: { 'User-Agent': 'FloodSense/1.0' },
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!response.ok) return 'Unknown State';

    const data = await response.json();
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
    // Try with South Sudan country code first
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)},South Sudan&format=json&limit=5&countrycodes=ss`,
      {
        headers: { 'User-Agent': 'FloodSense/1.0' },
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

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

