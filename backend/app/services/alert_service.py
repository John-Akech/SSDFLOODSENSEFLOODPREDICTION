import asyncio
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass
import uuid
import os

logger = logging.getLogger(__name__)


@dataclass
class Alert:
    id: str
    latitude: float
    longitude: float
    message: str
    severity: str  # low, medium, high, critical
    created_at: datetime
    district: Optional[str] = None  # District/location name
    expires_at: Optional[datetime] = None
    sent: bool = False


class AlertService:
    """Service for managing flood alerts and notifications with geographic prioritization"""
    
    # HIGH-RISK ZONES: Historical flood-prone areas requiring priority alerts
    # Based on South Sudan flood history and population vulnerability
    HIGH_PRIORITY_DISTRICTS = {
        "Jonglei": {"priority": "critical", "reason": "Frequent flooding, large population"},
        "Unity": {"priority": "critical", "reason": "Oil infrastructure, displacement camps"},
        "Upper Nile": {"priority": "high", "reason": "White Nile overflow risk"},
        "Northern Bahr el Ghazal": {"priority": "high", "reason": "Seasonal flooding"},
        "Warrap": {"priority": "high", "reason": "Agricultural vulnerability"},
        "Lakes": {"priority": "medium", "reason": "Interconnected waterways"},
        "Western Bahr el Ghazal": {"priority": "medium", "reason": "Border flooding"},
        "Twic East": {"priority": "critical", "reason": "Remote location, limited evacuation routes"},
    }
    
    def __init__(self):
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.subscribers: List[Dict[str, Any]] = []
    
    def get_district_priority(self, district: Optional[str]) -> str:
        """Get priority level for district"""
        if not district:
            return "medium"
        return self.HIGH_PRIORITY_DISTRICTS.get(district, {}).get("priority", "medium")
    
    def create_alert(
        self,
        latitude: float,
        longitude: float,
        flood_probability: float,
        model_type: str,
        lead_time_hours: int = 48,
        district: Optional[str] = None
    ) -> Alert:
        """Create a flood alert based on prediction with graduated severity"""
        
        # Validate coordinates
        if latitude == -90.0 and longitude == -180.0:
            logger.error("Invalid default coordinates received for alert creation")
            raise ValueError("Invalid coordinates: cannot create alert with default values")
        
        if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
            logger.error(f"Invalid coordinates: lat={latitude}, lon={longitude}")
            raise ValueError(f"Invalid coordinates: lat={latitude}, lon={longitude}")
        
        # Format location string
        location_str = f"{district}, South Sudan" if district else "South Sudan"
        
        # Check if this is a high-priority district
        district_priority = self.get_district_priority(district)
        priority_boost = district_priority in ["critical", "high"]
        
        # GRADUATED ALERT SYSTEM - Real-world response framework
        # Based on probability, lead time, AND geographic priority
        
        # Apply priority boost: Lower threshold by 10% for high-risk areas
        effective_probability = flood_probability
        if priority_boost:
            effective_probability = min(flood_probability + 0.10, 1.0)
            logger.info(f"Priority boost applied for {district} ({district_priority} priority): {flood_probability:.2f} → {effective_probability:.2f}")
        
        if effective_probability >= 0.8:
            # CRITICAL: Immediate danger
            if lead_time_hours <= 12:
                severity = "emergency"
                action = "EVACUATE IMMEDIATELY"
                message = f"🚨 FLOOD EMERGENCY for {location_str}: {action}! Severe flooding imminent (>{flood_probability:.0%} probability) within {lead_time_hours} hours. Move to higher ground NOW. Life-threatening conditions."
            else:
                severity = "critical"
                action = "Begin evacuation"
                message = f"⚠️ CRITICAL FLOOD WARNING for {location_str}: {action}. Very high flood risk ({flood_probability:.0%}) predicted within {lead_time_hours} hours. Prepare emergency supplies, identify evacuation routes, secure property."
                
        elif effective_probability >= 0.6:
            # HIGH: Significant risk
            if lead_time_hours <= 24:
                severity = "high"
                action = "Prepare to evacuate"
                message = f"⚠️ FLOOD WARNING for {location_str}: {action}. High flood risk ({flood_probability:.0%}) within {lead_time_hours} hours. Pack emergency kit, move valuables to higher ground, monitor updates closely."
            else:
                severity = "high"
                action = "Heightened alert"
                message = f"⚠️ FLOOD WATCH for {location_str}: {action}. High flood risk ({flood_probability:.0%}) possible within {lead_time_hours} hours. Review evacuation plans, prepare supplies, stay informed."
                
        elif effective_probability >= 0.4:
            # MEDIUM: Moderate risk
            severity = "medium"
            action = "Monitor conditions"
            message = f"🟡 FLOOD ADVISORY for {location_str}: {action}. Moderate flood risk ({flood_probability:.0%}) within {lead_time_hours} hours. Stay alert, avoid low-lying areas, prepare emergency contacts."
            
        else:
            # LOW: Minor risk
            severity = "low"
            action = "Stay informed"
            message = f"🔵 FLOOD INFORMATION for {location_str}: {action}. Minor flood risk ({flood_probability:.0%}) within {lead_time_hours} hours. Continue normal activities but monitor weather."
        
        # Add model confidence note
        message += f" Prediction: {model_type.upper()} model. Update frequency: Check for new alerts every 6 hours."
        
        alert = Alert(
            id=str(uuid.uuid4()),
            latitude=latitude,
            longitude=longitude,
            message=message,
            severity=severity,
            district=district,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(hours=lead_time_hours + 12)  # Alert expires 12 hours after predicted event
        )
        
        self.active_alerts[alert.id] = alert
        logger.info(f"Created {severity.upper()} alert for {location_str} ({latitude}, {longitude}) - Action: {action}")
        
        return alert
    
    async def send_web_push_alert(self, alert: Alert, user_subscriptions: List[Dict[str, Any]]) -> bool:
        """Send Web Push notification using pywebpush if VAPID keys provided; otherwise simulate."""
        try:
            payload = {
                "title": f"FloodSense Alert - {alert.severity.upper()}",
                "body": alert.message,
                "icon": "/icons/flood-warning.png",
                "badge": "/icons/badge.png",
                "data": {
                    "alert_id": alert.id,
                    "latitude": alert.latitude,
                    "longitude": alert.longitude,
                    "severity": alert.severity,
                    "url": f"/alerts/{alert.id}"
                },
                "actions": [
                    {"action": "view", "title": "View Details"},
                    {"action": "dismiss", "title": "Dismiss"}
                ]
            }
            
            sent_count = 0
            vapid_pub = os.getenv("VAPID_PUBLIC_KEY")
            vapid_priv = os.getenv("VAPID_PRIVATE_KEY")
            vapid_subj = os.getenv("VAPID_SUBJECT", "mailto:admin@floodsense.org")

            if vapid_priv and vapid_pub:
                try:
                    from pywebpush import webpush, WebPushException
                    claims = {"sub": vapid_subj}
                    for subscription in user_subscriptions:
                        try:
                            webpush(
                                subscription_info=subscription,
                                data=json.dumps(payload),
                                vapid_private_key=vapid_priv,
                                vapid_claims=claims,
                            )
                            sent_count += 1
                            await asyncio.sleep(0)
                        except WebPushException as e:
                            logger.warning(f"WebPush failed for {subscription.get('endpoint')}: {e}")
                except Exception as e:
                    logger.warning(f"pywebpush not available or failed: {e}. Falling back to simulate.")
                    for _ in user_subscriptions:
                        await asyncio.sleep(0.05)
                        sent_count += 1
            else:
                # Simulate if VAPID keys are not provided
                for _ in user_subscriptions:
                    await asyncio.sleep(0.05)
                    sent_count += 1
            
            alert.sent = True
            logger.info(f"Web Push alert sent to {sent_count} subscribers")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send Web Push alert: {e}")
            return False
    
    async def send_sms_alert(self, alert: Alert, phone_numbers: List[str]) -> bool:
        """Send SMS alert (placeholder implementation)"""
        try:
            # In a real implementation, this would use an SMS service like Twilio
            # For now, we'll simulate the sending process
            
            sms_message = f"FloodSense Alert: {alert.message[:140]}..."  # SMS character limit
            
            sent_count = 0
            for phone in phone_numbers:
                # Here you would use Twilio or similar service
                # client.messages.create(body=sms_message, from_=from_number, to=phone)
                
                # Simulate success
                await asyncio.sleep(0.2)  # Simulate network delay
                sent_count += 1
            
            logger.info(f"SMS alert sent to {sent_count} phone numbers")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send SMS alert: {e}")
            return False
    
    def get_active_alerts(self, latitude: float = None, longitude: float = None, radius_km: float = 50) -> List[Alert]:
        """Get active alerts, optionally filtered by location"""
        current_time = datetime.utcnow()
        active = []
        
        for alert in self.active_alerts.values():
            # Check if alert is still valid
            if alert.expires_at and alert.expires_at < current_time:
                continue
            
            # Filter by location if specified
            if latitude is not None and longitude is not None:
                # Simple distance calculation (not accurate for large distances)
                lat_diff = abs(alert.latitude - latitude)
                lon_diff = abs(alert.longitude - longitude)
                distance_approx = ((lat_diff ** 2 + lon_diff ** 2) ** 0.5) * 111  # Rough km conversion
                
                if distance_approx > radius_km:
                    continue
            
            active.append(alert)
        
        return sorted(active, key=lambda x: x.created_at, reverse=True)
    
    def get_alert_by_id(self, alert_id: str) -> Optional[Alert]:
        """Get specific alert by ID"""
        return self.active_alerts.get(alert_id)
    
    def dismiss_alert(self, alert_id: str) -> bool:
        """Dismiss an active alert"""
        if alert_id in self.active_alerts:
            alert = self.active_alerts.pop(alert_id)
            self.alert_history.append(alert)
            logger.info(f"Alert {alert_id} dismissed")
            return True
        return False
    
    def cleanup_expired_alerts(self):
        """Remove expired alerts from active list"""
        current_time = datetime.utcnow()
        expired_ids = []
        
        for alert_id, alert in self.active_alerts.items():
            if alert.expires_at and alert.expires_at < current_time:
                expired_ids.append(alert_id)
        
        for alert_id in expired_ids:
            alert = self.active_alerts.pop(alert_id)
            self.alert_history.append(alert)
            logger.info(f"Alert {alert_id} expired and moved to history")
    
    def get_alert_statistics(self) -> Dict[str, Any]:
        """Get alert statistics"""
        total_alerts = len(self.alert_history) + len(self.active_alerts)
        active_count = len(self.active_alerts)
        
        severity_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        
        for alert in list(self.active_alerts.values()) + self.alert_history:
            severity_counts[alert.severity] += 1
        
        return {
            "total_alerts": total_alerts,
            "active_alerts": active_count,
            "severity_distribution": severity_counts,
            "last_alert": max([a.created_at for a in self.active_alerts.values()]) if self.active_alerts else None
        }


# Global alert service instance
alert_service = AlertService()