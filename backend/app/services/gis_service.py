import folium
from typing import List, Dict, Any, Tuple, Optional
from geopy.distance import geodesic
import logging
from app.core.database import SessionLocal
from app.models.database_models import Location, Shelter
import requests

logger = logging.getLogger(__name__)


class GISService:
    """Service for GIS operations and dyke placement recommendations"""

    @staticmethod
    def get_real_elevation(lat: float, lon: float) -> float:
        """Fetch real elevation data from Open-Elevation API"""
        try:
            url = f"https://api.open-elevation.com/api/v1/lookup?locations={lat},{lon}"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                results = response.json().get('results', [])
                if results:
                    return float(results[0]['elevation'])
        except Exception as e:
            logger.warning(f"Elevation API failed: {e}")
        return 410.0  # Fallback to average South Sudan elevation

    @staticmethod
    def fetch_osm_data(query: str) -> List[Dict[str, Any]]:
        """Fetch data from OpenStreetMap via Overpass API"""
        try:
            overpass_url = "https://overpass-api.de/api/interpreter"
            response = requests.get(overpass_url, params={
                                    'data': query}, timeout=10)
            if response.status_code == 200:
                return response.json().get('elements', [])
        except Exception as e:
            logger.warning(f"Overpass API failed: {e}")
        return []

    @staticmethod
    def generate_dyke_recommendations(
        latitude: float,
        longitude: float,
        flood_probability: float,
        elevation: float = None,
        river_distance: float = None,
        water_occurrence: float = None
    ) -> List[Dict[str, Any]]:
        """Generate dyke placement recommendations based on flood risk and terrain"""

        recommendations = []

        # Use default values if not provided
        if elevation is None:
            elevation = GISService.get_real_elevation(latitude, longitude)
        if river_distance is None:
            river_distance = GISService.get_river_distance(latitude, longitude)
        if water_occurrence is None:
            water_occurrence = 50.0  # Default water occurrence

        # High flood probability areas need immediate protection
        if flood_probability >= 0.6:
            # Primary dyke - upstream protection
            upstream_lat = latitude + 0.01  # ~1km north
            upstream_lon = longitude

            recommendations.append({
                "type": "primary_dyke",
                "latitude": upstream_lat,
                "longitude": upstream_lon,
                "priority": "critical" if flood_probability >= 0.8 else "high",
                "description": f"Primary flood barrier upstream of high-risk area (flood risk: {flood_probability:.1%})",
                "estimated_length_m": 500,
                "estimated_cost_usd": 25000,
                "construction_time_days": 30,
                "materials_needed": ["sandbags", "geotextile", "concrete_blocks"]
            })

            # Secondary dyke - lateral protection
            lateral_lat = latitude
            lateral_lon = longitude - 0.008  # ~800m west

            recommendations.append({
                "type": "secondary_dyke",
                "latitude": lateral_lat,
                "longitude": lateral_lon,
                "priority": "high",
                "description": "Secondary barrier for lateral flood protection",
                "estimated_length_m": 300,
                "estimated_cost_usd": 15000,
                "construction_time_days": 20,
                "materials_needed": ["sandbags", "geotextile"]
            })

        # Medium flood probability - drainage improvements
        elif flood_probability >= 0.3:
            # Drainage channel
            drainage_lat = latitude - 0.005  # ~500m south
            drainage_lon = longitude

            recommendations.append({
                "type": "drainage_channel",
                "latitude": drainage_lat,
                "longitude": drainage_lon,
                "priority": "medium",
                "description": f"Drainage channel to redirect water flow (flood risk: {flood_probability:.1%})",
                "estimated_length_m": 800,
                "estimated_cost_usd": 12000,
                "construction_time_days": 15,
                "materials_needed": ["excavation", "concrete_lining"]
            })

        # Areas near rivers need special consideration
        if river_distance < 20:  # Within 20km of river
            riverbank_lat = latitude + 0.003
            riverbank_lon = longitude + 0.003

            recommendations.append({
                "type": "riverbank_reinforcement",
                "latitude": riverbank_lat,
                "longitude": riverbank_lon,
                "priority": "high" if flood_probability >= 0.5 else "medium",
                "description": "Riverbank reinforcement to prevent erosion and overflow",
                "estimated_length_m": 200,
                "estimated_cost_usd": 8000,
                "construction_time_days": 10,
                "materials_needed": ["riprap", "geotextile", "vegetation"]
            })

        # High water occurrence areas need pumping stations
        if water_occurrence > 80:
            pump_lat = latitude - 0.002
            pump_lon = longitude + 0.002

            recommendations.append({
                "type": "pumping_station",
                "latitude": pump_lat,
                "longitude": pump_lon,
                "priority": "medium",
                "description": "Pumping station for water management in high-occurrence area",
                "estimated_cost_usd": 50000,
                "construction_time_days": 60,
                "materials_needed": ["pumps", "electrical_system", "concrete_foundation"]
            })

        return recommendations

    @staticmethod
    def create_flood_risk_map(
        center_lat: float,
        center_lon: float,
        predictions: List[Dict[str, Any]] = None,
        recommendations: List[Dict[str, Any]] = None,
        zoom_level: int = 10
    ) -> str:
        """Create an interactive flood risk map using Folium"""

        # Create base map
        m = folium.Map(
            location=[center_lat, center_lon],
            zoom_start=zoom_level,
            tiles='OpenStreetMap'
        )

        # Add satellite imagery layer
        folium.TileLayer(
            tiles='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attr='Esri',
            name='Satellite',
            overlay=False,
            control=True
        ).add_to(m)

        # Add predictions as markers
        if predictions:
            for pred in predictions:
                lat, lon = pred['latitude'], pred['longitude']
                probability = pred['flood_probability']

                # Color based on flood probability
                if probability >= 0.8:
                    color = 'red'
                    icon = 'exclamation-triangle'
                elif probability >= 0.6:
                    color = 'orange'
                    icon = 'warning'
                elif probability >= 0.4:
                    color = 'yellow'
                    icon = 'info'
                else:
                    color = 'green'
                    icon = 'check'

                # Create popup content
                popup_content = f"""
                <b>Flood Risk Prediction</b><br>
                Probability: {probability:.1%}<br>
                Risk Level: {pred.get('risk_level', 'unknown')}<br>
                Model: {pred.get('model_type', 'unknown')}<br>
                Lead Time: {pred.get('lead_time_hours', 'unknown')} hours
                """

                folium.Marker(
                    location=[lat, lon],
                    popup=folium.Popup(popup_content, max_width=300),
                    icon=folium.Icon(color=color, icon=icon, prefix='fa'),
                    tooltip=f"Flood Risk: {probability:.1%}"
                ).add_to(m)

                # Add risk circle
                folium.Circle(
                    location=[lat, lon],
                    radius=probability * 2000,  # Radius based on probability
                    color=color,
                    fillColor=color,
                    fillOpacity=0.2,
                    weight=2
                ).add_to(m)

        # Add recommendations as different markers
        if recommendations:
            for rec in recommendations:
                lat, lon = rec['latitude'], rec['longitude']
                rec_type = rec['type']
                priority = rec['priority']

                # Icon and color based on recommendation type
                icon_map = {
                    'primary_dyke': ('home', 'blue'),
                    'secondary_dyke': ('home', 'lightblue'),
                    'drainage_channel': ('tint', 'purple'),
                    'riverbank_reinforcement': ('leaf', 'green'),
                    'pumping_station': ('cog', 'gray')
                }

                icon, color = icon_map.get(rec_type, ('question', 'black'))

                # Adjust color based on priority
                if priority == 'critical':
                    color = 'red'
                elif priority == 'high':
                    color = 'orange'

                popup_content = f"""
                <b>{rec_type.replace('_', ' ').title()}</b><br>
                Priority: {priority}<br>
                Description: {rec['description']}<br>
                Estimated Cost: ${rec.get('estimated_cost_usd', 'N/A'):,}<br>
                Construction Time: {rec.get('construction_time_days', 'N/A')} days
                """

                folium.Marker(
                    location=[lat, lon],
                    popup=folium.Popup(popup_content, max_width=350),
                    icon=folium.Icon(color=color, icon=icon, prefix='fa'),
                    tooltip=f"{rec_type.replace('_', ' ').title()} - {priority}"
                ).add_to(m)

        # Add layer control
        folium.LayerControl().add_to(m)

        # Add legend
        legend_html = '''
        <div style="position: fixed; 
                    bottom: 50px; left: 50px; width: 200px; height: 120px; 
                    background-color: white; border:2px solid grey; z-index:9999; 
                    font-size:14px; padding: 10px">
        <p><b>Flood Risk Legend</b></p>
        <p><i class="fa fa-circle" style="color:red"></i> Critical (80%+)</p>
        <p><i class="fa fa-circle" style="color:orange"></i> High (60-80%)</p>
        <p><i class="fa fa-circle" style="color:yellow"></i> Medium (40-60%)</p>
        <p><i class="fa fa-circle" style="color:green"></i> Low (<40%)</p>
        </div>
        '''
        m.get_root().html.add_child(folium.Element(legend_html))

        return m._repr_html_()

    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points in kilometers"""
        return geodesic((lat1, lon1), (lat2, lon2)).kilometers

    @staticmethod
    def get_nearby_locations(
        center_lat: float,
        center_lon: float,
        radius_km: float = 50
    ) -> List[Dict[str, Any]]:
        """Get nearby locations of interest from the database"""

        locations = []

        # Query real locations from database
        db = SessionLocal()
        try:
            # Get all locations (in a real production app with millions of rows,
            # we would use PostGIS for spatial queries, but for now we filter in python)
            all_locations = db.query(Location).all()

            for loc in all_locations:
                distance = GISService.calculate_distance(
                    center_lat, center_lon, loc.latitude, loc.longitude)

                if distance <= radius_km:
                    locations.append({
                        "name": loc.name,
                        "latitude": loc.latitude,
                        "longitude": loc.longitude,
                        "distance_km": round(distance, 2),
                        "type": loc.type,
                        "population": loc.population
                    })

        except Exception as e:
            logger.error(f"Error querying locations: {e}")
        finally:
            db.close()

        # If no locations found in DB, try OSM via Overpass API
        if not locations:
            try:
                # Query for towns and villages within radius
                radius_m = radius_km * 1000
                query = f"""
                [out:json][timeout:10];
                (
                  node["place"~"city|town|village"](around:{radius_m},{center_lat},{center_lon});
                );
                out body;
                """
                elements = GISService.fetch_osm_data(query)
                for element in elements:
                    lat = element.get('lat')
                    lon = element.get('lon')
                    name = element.get('tags', {}).get(
                        'name', 'Unknown Location')
                    place_type = element.get('tags', {}).get(
                        'place', 'settlement')

                    dist = GISService.calculate_distance(
                        center_lat, center_lon, lat, lon)
                    locations.append({
                        "name": name,
                        "latitude": lat,
                        "longitude": lon,
                        "distance_km": round(dist, 2),
                        "type": place_type,
                        "population": "Unknown"
                    })
            except Exception as e:
                logger.error(f"Failed to fetch OSM locations: {e}")

        return locations

    @staticmethod
    def reverse_geocode(lat: float, lon: float) -> dict:
        """Reverse geocode coordinates to get address details"""
        from geopy.geocoders import Nominatim
        from geopy.exc import GeocoderTimedOut, GeocoderServiceError

        # Use a specific user agent to comply with Nominatim policy
        geolocator = Nominatim(user_agent="FloodSense_Backend/1.0")
        try:
            # Language='en' to get English results
            location = geolocator.reverse(
                (lat, lon), exactly_one=True, timeout=10, language='en')
            if location:
                # Return the raw dictionary so frontend can parse address components
                return location.raw
            return {}
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            logger.warning(f"Geocoding service error: {e}")
            return {}
        except Exception as e:
            logger.error(f"Unexpected geocoding error: {e}")
            return {}

    @staticmethod
    def search_place(query: str, country_codes: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search for a place by name (forward geocoding)"""
        from geopy.geocoders import Nominatim
        from geopy.exc import GeocoderTimedOut, GeocoderServiceError

        geolocator = Nominatim(user_agent="FloodSense_Backend/1.0")
        try:
            # Prepare kwargs
            kwargs = {'exactly_one': False, 'limit': 5, 'timeout': 10}
            if country_codes:
                kwargs['country_codes'] = country_codes

            locations = geolocator.geocode(query, **kwargs)

            results = []
            if locations:
                for loc in locations:
                    results.append(loc.raw)
            return results
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            logger.warning(f"Geocoding search error: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected geocoding search error: {e}")
            return []

    @staticmethod
    def generate_evacuation_routes(
        start_lat: float,
        start_lon: float,
        flood_areas: List[Tuple[float, float]]
    ) -> List[Dict[str, Any]]:
        """Generate evacuation route recommendations to nearest shelters"""

        routes = []

        # Query real shelters from database
        db = SessionLocal()
        try:
            # Get all active shelters
            shelters = db.query(Shelter).filter(
                Shelter.is_active).all()

            # Find nearest shelters
            nearby_shelters = []
            for shelter in shelters:
                distance = GISService.calculate_distance(
                    start_lat, start_lon, shelter.latitude, shelter.longitude)
                # Only consider shelters within reasonable distance (e.g. 50km)
                if distance <= 50:
                    nearby_shelters.append((shelter, distance))

            # Sort by distance
            nearby_shelters.sort(key=lambda x: x[1])

            # Generate routes to top 3 nearest shelters
            for i, (shelter, distance) in enumerate(nearby_shelters[:3]):
                # In a real system, we would use a routing engine (OSRM, GraphHopper) here
                # For now, we generate a direct route with some intermediate points
                # to simulate following terrain/roads

                # Simple straight line interpolation for now
                mid_lat = (start_lat + shelter.latitude) / 2
                mid_lon = (start_lon + shelter.longitude) / 2

                routes.append({
                    "route_id": f"route_to_{shelter.id}",
                    "direction": "To " + shelter.name,
                    "waypoints": [
                        {"lat": start_lat, "lon": start_lon},
                        {"lat": mid_lat, "lon": mid_lon},
                        {"lat": shelter.latitude, "lon": shelter.longitude}
                    ],
                    "distance_km": round(distance, 2),
                    # Rough estimate: 6km/h walking
                    "estimated_time_minutes": int(distance * 10),
                    "safety_level": "high",
                    "description": f"Evacuation route to {shelter.name} ({shelter.type})"
                })

        except Exception as e:
            logger.error(f"Error generating routes: {e}")
        finally:
            db.close()

        if not routes:
            # Try OSM for shelters (hospitals, schools, etc)
            try:
                query = f"""
                [out:json][timeout:10];
                (
                  node["amenity"~"hospital|school|community_centre|place_of_worship"](around:50000,{start_lat},{start_lon});
                );
                out body;
                """
                elements = GISService.fetch_osm_data(query)

                # Sort by distance
                osm_shelters = []
                for element in elements:
                    lat = element.get('lat')
                    lon = element.get('lon')
                    name = element.get('tags', {}).get(
                        'name', 'Unknown Shelter')
                    amenity = element.get('tags', {}).get('amenity', 'shelter')
                    dist = GISService.calculate_distance(
                        start_lat, start_lon, lat, lon)
                    osm_shelters.append((dist, name, lat, lon, amenity))

                osm_shelters.sort(key=lambda x: x[0])

                # Generate routes to top 3
                for i, (dist, name, lat, lon, amenity) in enumerate(osm_shelters[:3]):
                    routes.append({
                        "route_id": f"osm_route_{i}",
                        "direction": f"To {name}",
                        "waypoints": [
                            {"lat": start_lat, "lon": start_lon},
                            {"lat": lat, "lon": lon}
                        ],
                        "distance_km": round(dist, 2),
                        # Slower walking speed
                        "estimated_time_minutes": int(dist * 12),
                        "safety_level": "medium",
                        "description": f"Evacuation route to {name} ({amenity})"
                    })
            except Exception as e:
                logger.error(f"Failed to fetch OSM shelters: {e}")

        return routes

    @staticmethod
    def get_river_distance(lat: float, lon: float) -> float:
        """Get distance to nearest river using Overpass API"""
        try:
            # Query for rivers within 50km
            query = f"""
            [out:json][timeout:10];
            (
              way["waterway"="river"](around:50000,{lat},{lon});
            );
            out geom;
            """
            elements = GISService.fetch_osm_data(query)
            min_dist = 50.0

            for element in elements:
                # Check geometry points
                geometry = element.get('geometry', [])
                for point in geometry:
                    p_lat = point.get('lat')
                    p_lon = point.get('lon')
                    if p_lat and p_lon:
                        dist = GISService.calculate_distance(
                            lat, lon, p_lat, p_lon)
                        if dist < min_dist:
                            min_dist = dist
            return min_dist
        except Exception as e:
            logger.warning(f"River distance API failed: {e}")
        return 50.0

    @staticmethod
    def analyze_location(
        latitude: float,
        longitude: float,
        nearby_alerts: List[Dict[str, Any]],
        nearby_predictions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Centralized logic for analyzing a location's flood risk.
        Moves business logic from frontend to backend.
        """

        # Calculate flood risk
        highest_risk = 0.0
        if nearby_predictions:
            highest_risk = max(p.get('flood_probability', 0)
                               for p in nearby_predictions)

        # Generate recommendation text
        recommendation = ''
        if highest_risk > 0.7:
            recommendation = 'Immediate evacuation recommended'
        elif highest_risk > 0.5:
            recommendation = 'High flood risk - prepare for evacuation'
        elif highest_risk > 0.3:
            recommendation = 'Moderate risk - monitor conditions'
        elif nearby_alerts:
            recommendation = 'Active flood alert in this area'
        else:
            recommendation = 'Low flood risk - area appears safe'

        return {
            "flood_risk_percent": round(highest_risk * 100),
            "recommendation": recommendation,
            "risk_level": "critical" if highest_risk > 0.7 else "high" if highest_risk > 0.5 else "medium" if highest_risk > 0.3 else "low"
        }
