import folium
import numpy as np
from typing import List, Dict, Any, Tuple
import json
from geopy.distance import geodesic
import logging

logger = logging.getLogger(__name__)


class GISService:
    """Service for GIS operations and dyke placement recommendations"""
    
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
            elevation = 410.0  # Average elevation in South Sudan
        if river_distance is None:
            river_distance = 50.0  # Default distance
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
        """Get nearby locations of interest (placeholder implementation)"""
        
        # In a real implementation, this would query a database of locations
        # For now, we'll generate some sample locations
        
        locations = []
        
        # Generate sample villages/towns around the center point
        offsets = [
            (0.1, 0.1, "Juba District"),
            (-0.05, 0.15, "Bor County"),
            (0.08, -0.12, "Yei River State"),
            (-0.15, -0.08, "Bentiu Area"),
            (0.12, 0.05, "Malakal Region")
        ]
        
        for lat_offset, lon_offset, name in offsets:
            lat = center_lat + lat_offset
            lon = center_lon + lon_offset
            distance = GISService.calculate_distance(center_lat, center_lon, lat, lon)
            
            if distance <= radius_km:
                locations.append({
                    "name": name,
                    "latitude": lat,
                    "longitude": lon,
                    "distance_km": round(distance, 2),
                    "type": "settlement"
                })
        
        return locations
    
    @staticmethod
    def generate_evacuation_routes(
        start_lat: float,
        start_lon: float,
        flood_areas: List[Tuple[float, float]]
    ) -> List[Dict[str, Any]]:
        """Generate evacuation route recommendations"""
        
        routes = []
        
        # Simple evacuation route generation (in reality, this would use road networks)
        # Route 1: North
        routes.append({
            "route_id": "north_route",
            "direction": "North",
            "waypoints": [
                {"lat": start_lat, "lon": start_lon},
                {"lat": start_lat + 0.02, "lon": start_lon},
                {"lat": start_lat + 0.05, "lon": start_lon + 0.01}
            ],
            "distance_km": 5.5,
            "estimated_time_minutes": 45,
            "safety_level": "high",
            "description": "Primary evacuation route heading north to higher ground"
        })
        
        # Route 2: East
        routes.append({
            "route_id": "east_route",
            "direction": "East",
            "waypoints": [
                {"lat": start_lat, "lon": start_lon},
                {"lat": start_lat + 0.01, "lon": start_lon + 0.03},
                {"lat": start_lat + 0.02, "lon": start_lon + 0.06}
            ],
            "distance_km": 6.8,
            "estimated_time_minutes": 55,
            "safety_level": "medium",
            "description": "Alternative evacuation route heading east"
        })
        
        return routes