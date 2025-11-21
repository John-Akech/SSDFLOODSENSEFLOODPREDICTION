import axios from 'axios';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

export interface InfrastructureNode {
    id: number;
    lat: number;
    lon: number;
    type: 'hospital' | 'school' | 'church' | 'road' | 'other';
    name?: string;
    tags?: any;
}

export const osmService = {
    /**
     * Fetches infrastructure (hospitals, schools, churches) within the given bounds.
     * @param south South latitude
     * @param west West longitude
     * @param north North latitude
     * @param east East longitude
     */
    getInfrastructure: async (south: number, west: number, north: number, east: number): Promise<InfrastructureNode[]> => {
        // Construct Overpass QL query
        // We limit to 100 items per type to prevent overwhelming the map
        const query = `
      [out:json][timeout:25];
      (
        node["amenity"="hospital"](${south},${west},${north},${east});
        way["amenity"="hospital"](${south},${west},${north},${east});
        node["amenity"="clinic"](${south},${west},${north},${east});
        
        node["amenity"="school"](${south},${west},${north},${east});
        way["amenity"="school"](${south},${west},${north},${east});
        
        node["amenity"="place_of_worship"](${south},${west},${north},${east});
        way["amenity"="place_of_worship"](${south},${west},${north},${east});
      );
      out center;
    `;

        try {
            const response = await axios.post(OVERPASS_API_URL, `data=${encodeURIComponent(query)}`, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (!response.data || !response.data.elements) {
                return [];
            }

            return response.data.elements.map((element: any) => {
                let type: InfrastructureNode['type'] = 'other';
                const tags = element.tags || {};

                if (tags.amenity === 'hospital' || tags.amenity === 'clinic') type = 'hospital';
                else if (tags.amenity === 'school') type = 'school';
                else if (tags.amenity === 'place_of_worship') type = 'church';

                // For ways/relations, 'center' property contains lat/lon
                const lat = element.lat || element.center?.lat;
                const lon = element.lon || element.center?.lon;

                return {
                    id: element.id,
                    lat,
                    lon,
                    type,
                    name: tags.name || `${type.charAt(0).toUpperCase() + type.slice(1)}`,
                    tags
                };
            }).filter((node: any) => node.lat && node.lon); // Filter out invalid nodes

        } catch (error) {
            console.error('Error fetching OSM data:', error);
            return [];
        }
    }
};
