const cache = new Map<string, string>();
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
    
    const name = data.address?.state || data.address?.county || data.address?.city || 
                 data.address?.town || data.address?.village || data.address?.region ||
                 data.display_name?.split(',').slice(0, 2).join(', ') || 
                 `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    
    cache.set(key, name);
    return name;
  } catch {
    return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  }
};

export const forwardGeocode = async (placeName: string): Promise<{ lat: number; lon: number; displayName?: string } | null> => {
  const key = placeName.toLowerCase().trim();
  if (coordCache.has(key)) return coordCache.get(key)!;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)},South Sudan&format=json&limit=5&countrycodes=ss`,
      { headers: { 'User-Agent': 'FloodSense/1.0' } }
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      for (const item of data) {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        if (lat >= 3.5 && lat <= 12.2 && lon >= 24 && lon <= 36) {
          const coords = { lat, lon, displayName: item.display_name };
          coordCache.set(key, coords);
          return coords;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
};
