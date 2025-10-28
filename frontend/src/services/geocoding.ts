const cache = new Map<string, string>();
const coordCache = new Map<string, { lat: number; lon: number }>();

export const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en&zoom=8`,
      { headers: { 'User-Agent': 'FloodSense/1.0' } }
    );
    const data = await response.json();
    
    // Extract location with state priority for South Sudan
    let name = '';
    if (data.address) {
      const parts = [];
      if (data.address.city || data.address.town || data.address.village) {
        parts.push(data.address.city || data.address.town || data.address.village);
      }
      if (data.address.state) {
        parts.push(data.address.state);
      }
      name = parts.join(', ') || data.address.county || data.address.region;
    }
    
    if (!name) {
      name = data.display_name?.split(',').slice(0, 2).join(', ') || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    }
    
    cache.set(key, name);
    return name;
  } catch {
    return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
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

