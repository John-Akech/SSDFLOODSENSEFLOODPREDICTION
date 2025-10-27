import asyncio
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass
import uuid

logger = logging.getLogger(__name__)


@dataclass
class Alert:
    id: str
    latitude: float
    longitude: float
    message: str
    severity: str  # low, medium, high, critical
    created_at: datetime
    expires_at: Optional[datetime] = None
    sent: bool = False


class AlertService:
    """Service for managing flood alerts and notifications"""
    
    def __init__(self):
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.subscribers: List[Dict[str, Any]] = []
    
    def create_alert(
        self,
        latitude: float,
        longitude: float,
        flood_probability: float,
        model_type: str,
        lead_time_hours: int = 12
    ) -> Alert:
        """Create a flood alert based on prediction"""
        
        # Determine severity based on probability
        if flood_probability >= 0.8:
            severity = "critical"
            message = f"CRITICAL FLOOD WARNING: High flood risk ({flood_probability:.1%}) detected. Immediate evacuation recommended."
        elif flood_probability >= 0.6:
            severity = "high"
            message = f"HIGH FLOOD WARNING: Significant flood risk ({flood_probability:.1%}) detected. Prepare for evacuation."
        elif flood_probability >= 0.4:
            severity = "medium"
            message = f"MODERATE FLOOD ALERT: Elevated flood risk ({flood_probability:.1%}) detected. Monitor conditions closely."
        else:
            severity = "low"
            message = f"LOW FLOOD ALERT: Minor flood risk ({flood_probability:.1%}) detected. Stay informed."
        
        # Add location and timing information
        message += f" Location: {latitude:.3f}, {longitude:.3f}. "
        message += f"Predicted within {lead_time_hours} hours using {model_type.upper()} model."
        
        alert = Alert(
            id=str(uuid.uuid4()),
            latitude=latitude,
            longitude=longitude,
            message=message,
            severity=severity,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(hours=lead_time_hours + 6)  # Alert expires 6 hours after predicted event
        )
        
        self.active_alerts[alert.id] = alert
        logger.info(f"Created {severity} alert for location ({latitude}, {longitude})")
        
        return alert
    
    async def send_web_push_alert(self, alert: Alert, user_subscriptions: List[Dict[str, Any]]) -> bool:
        """Send Web Push notification (placeholder implementation)"""
        try:
            # In a real implementation, this would use a Web Push library like pywebpush
            # For now, we'll simulate the sending process
            
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
            
            # Simulate sending to each subscription
            sent_count = 0
            for subscription in user_subscriptions:
                # Here you would use pywebpush.webpush() with the subscription
                # webpush(subscription_info=subscription, data=json.dumps(payload), vapid_private_key=vapid_private_key, vapid_claims=vapid_claims)
                
                # Simulate success/failure
                await asyncio.sleep(0.1)  # Simulate network delay
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