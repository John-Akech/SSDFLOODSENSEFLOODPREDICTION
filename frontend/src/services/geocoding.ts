interface LocationInfo {
  placeName: string;
  area: string;
  state: string;
  fullName: string;
}

const cache = new Map<string, string>();
const detailedCache = new Map<string, LocationInfo>();
const coordCache = new Map<string, { lat: number; lon: number }>();

export const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en&zoom=10`,
      { headers: { 'User-Agent': 'FloodSense/1.0' } }
    );
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
      else if (addr.neighbourhood) parts.push(addr.neighbourhood);
      
      // Add county/subcounty (middle administrative level)
      if (addr.county && !parts.includes(addr.county)) {
        parts.push(addr.county);
      } else if (addr.municipality && !parts.includes(addr.municipality)) {
        parts.push(addr.municipality);
      }
      
      // Add state (high administrative level for South Sudan)
      if (addr.state && !parts.includes(addr.state)) {
        parts.push(addr.state);
      }
      
      // Add country for clarity
      if (!parts.includes(addr.country)) {
        parts.push(addr.country);
      }
      
      name = parts.join(', ');
    }
    
    // Fallback to display_name
    if (!name) {
      const displayParts = data.display_name?.split(',').map((p: string) => p.trim());
      if (displayParts) {
        // Take first 3-4 parts for better context
        name = displayParts.slice(0, 4).join(', ');
      } else {
        name = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      }
    }
    
    cache.set(key, name);
    return name;
  } catch {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
};

export const getDetailedLocation = async (lat: number, lon: number): Promise<LocationInfo> => {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (detailedCache.has(key)) return detailedCache.get(key)!;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en&zoom=10`,
      { headers: { 'User-Agent': 'FloodSense/1.0' } }
    );
    const data = await response.json();
    
    if (data.address) {
      const addr = data.address;
      const placeName = addr.village || addr.town || addr.city || addr.suburb || addr.neighbourhood || '';
      const state = addr.state || addr.region || 'Unknown State';
      const area = addr.county || addr.municipality || state;
      
      // Build full name
      const parts = [];
      if (placeName) parts.push(placeName);
      if (area && !parts.includes(area)) parts.push(area);
      if (state && !parts.includes(state)) parts.push(state);
      if (addr.country && !parts.includes(addr.country)) parts.push(addr.country);
      const fullName = parts.join(', ');
      
      const info: LocationInfo = {
        placeName,
        area,
        state,
        fullName: fullName || `${lat.toFixed(4)}, ${lon.toFixed(4)}`
      };
      
      detailedCache.set(key, info);
      return info;
    }
    
    // Fallback
    const fullName = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    return {
      placeName: fullName,
      area: 'Unknown',
      state: 'Unknown',
      fullName
    };
  } catch {
    const fullName = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    return {
      placeName: fullName,
      area: 'Unknown',
      state: 'Unknown',
      fullName
    };
  }
};

export const getStateName = async (lat: number, lon: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en&zoom=5`,
      { headers: { 'User-Agent': 'FloodSense/1.0' } }
    );
    const data = await response.json();
    return data.address?.state || 'Unknown State';
  } catch {
    return 'Unknown State';
  }
};

export const forwardGeocode = async (placeName: string): Promise<{ lat: number; lon: number; displayName?: string } | null> => {
  const key = placeName.toLowerCase().trim();
  if (coordCache.has(key)) return coordCache.get(key)!;

  try {
    // Try with South Sudan country code first
    let response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)},South Sudan&format=json&limit=10&countrycodes=ss`,
      { headers: { 'User-Agent': 'FloodSense/1.0' } }
    );
    let data = await response.json();
    
    // If no results, try without country code but with South Sudan in query
    if (!data || data.length === 0) {
      response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName + ' South Sudan')}&format=json&limit=10`,
        { headers: { 'User-Agent': 'FloodSense/1.0' } }
      );
      data = await response.json();
    }
    
    if (data && data.length > 0) {
      // Take the first result that's roughly in South Sudan area
      const item = data[0];
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      const coords = { lat, lon, displayName: item.display_name };
      coordCache.set(key, coords);
      return coords;
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

