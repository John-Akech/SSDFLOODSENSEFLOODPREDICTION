"""
Push Notification Service for FloodSense
Sends web push notifications to subscribed users when predictions or alerts are created
"""
import json
import logging
from typing import List, Dict, Any
from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class PushNotificationService:
    """Service for sending web push notifications to subscribed users"""

    def __init__(self, vapid_private_key: str, vapid_public_key: str, vapid_email: str):
        """
        Initialize the push notification service

        Args:
            vapid_private_key: VAPID private key for authentication
            vapid_public_key: VAPID public key
            vapid_email: Email for VAPID claims (mailto:)
        """
        self.vapid_private_key = vapid_private_key
        self.vapid_public_key = vapid_public_key
        self.vapid_email = vapid_email

    def send_notification(
        self,
        subscription: Dict[str, Any],
        title: str,
        body: str,
        url: str = "/map",
        icon: str = "/images/FloodSenseLogo.png",
        badge: str = "/images/FloodSenseLogo.png",
        data: Dict[str, Any] = None
    ) -> bool:
        """
        Send a push notification to a single subscriber

        Args:
            subscription: Push subscription object with endpoint and keys
            title: Notification title
            body: Notification body text
            url: URL to open when notification is clicked
            icon: Icon URL
            badge: Badge URL
            data: Additional data to send with notification

        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            payload = {
                "title": title,
                "body": body,
                "url": url,
                "icon": icon,
                "badge": badge,
                "data": data or {}
            }

            webpush(
                subscription_info={
                    "endpoint": subscription["endpoint"],
                    "keys": subscription["keys"]
                },
                data=json.dumps(payload),
                vapid_private_key=self.vapid_private_key,
                vapid_claims={"sub": f"mailto:{self.vapid_email}"}
            )

            logger.info(
                f"Push notification sent successfully to {subscription['endpoint'][:50]}...")
            return True

        except WebPushException as e:
            logger.error(f"WebPush failed: {e}")
            if e.response and e.response.status_code in [404, 410]:
                # Subscription is no longer valid
                logger.warning(
                    f"Subscription expired or invalid: {subscription['endpoint'][:50]}...")
            return False
        except Exception as e:
            logger.error(f"Failed to send push notification: {e}")
            return False

    def send_to_all_subscribers(
        self,
        db: Session,
        title: str,
        body: str,
        url: str = "/map",
        data: Dict[str, Any] = None
    ) -> Dict[str, int]:
        """
        Send push notification to all active subscribers

        Args:
            db: Database session
            title: Notification title
            body: Notification body text
            url: URL to open when notification is clicked
            data: Additional data to send

        Returns:
            Dict with success and failure counts
        """
        from app.models import DBPush

        subscriptions = db.query(DBPush).all()

        success_count = 0
        failure_count = 0
        expired_subscriptions = []

        for sub in subscriptions:
            subscription_dict = {
                "endpoint": sub.endpoint,
                "keys": {
                    "p256dh": sub.p256dh,
                    "auth": sub.auth
                }
            }

            success = self.send_notification(
                subscription=subscription_dict,
                title=title,
                body=body,
                url=url,
                data=data
            )

            if success:
                success_count += 1
            else:
                failure_count += 1
                # Check if subscription should be removed
                try:
                    # If endpoint is no longer valid, mark for removal
                    expired_subscriptions.append(sub)
                except:
                    pass

        # Clean up expired subscriptions
        for expired in expired_subscriptions:
            try:
                db.delete(expired)
            except:
                pass

        if expired_subscriptions:
            db.commit()
            logger.info(
                f"Removed {len(expired_subscriptions)} expired subscriptions")

        logger.info(
            f"Push notifications sent: {success_count} succeeded, {failure_count} failed"
        )

        return {
            "success": success_count,
            "failed": failure_count,
            "expired": len(expired_subscriptions)
        }

    def send_flood_alert(
        self,
        db: Session,
        severity: str,
        location: str,
        latitude: float,
        longitude: float,
        message: str = None
    ) -> Dict[str, int]:
        """
        Send a flood alert notification to all subscribers

        Args:
            db: Database session
            severity: Alert severity (low, moderate, high, critical)
            location: Location description
            latitude: Alert latitude
            longitude: Alert longitude
            message: Optional custom message

        Returns:
            Dict with success and failure counts
        """
        title = f"Flood Alert - {severity.upper()}"

        if message:
            body = message
        else:
            body = f"Flood alert issued for {location}. Check the map for details."

        return self.send_to_all_subscribers(
            db=db,
            title=title,
            body=body,
            url="/map",
            data={
                "type": "flood_alert",
                "severity": severity,
                "latitude": latitude,
                "longitude": longitude,
                "location": location
            }
        )

    def send_prediction_notification(
        self,
        db: Session,
        flood_risk: float,
        location: str,
        latitude: float,
        longitude: float,
        model_type: str = "random_forest"
    ) -> Dict[str, int]:
        """
        Send a notification about a new flood prediction

        Args:
            db: Database session
            flood_risk: Flood risk percentage (0-100)
            location: Location description
            latitude: Prediction latitude
            longitude: Prediction longitude
            model_type: Model used for prediction

        Returns:
            Dict with success and failure counts
        """
        # Determine severity based on risk
        if flood_risk >= 75:
            severity = "critical"
        elif flood_risk >= 50:
            severity = "high"
        elif flood_risk >= 25:
            severity = "moderate"
        else:
            severity = "low"

        title = f"New Flood Prediction - {int(flood_risk)}% Risk ({severity.upper()})"
        body = f"Flood risk detected at {location}. Tap to view details on map."

        return self.send_to_all_subscribers(
            db=db,
            title=title,
            body=body,
            url="/map",
            data={
                "type": "flood_prediction",
                "flood_risk": flood_risk,
                "severity": severity,
                "latitude": latitude,
                "longitude": longitude,
                "location": location,
                "model": model_type
            }
        )


# Global service instance (initialized in main.py)
push_service: PushNotificationService = None


def initialize_push_service(vapid_private_key: str, vapid_public_key: str, vapid_email: str):
    """Initialize the global push notification service"""
    global push_service
    push_service = PushNotificationService(
        vapid_private_key=vapid_private_key,
        vapid_public_key=vapid_public_key,
        vapid_email=vapid_email
    )
    logger.info("Push notification service initialized")


def get_push_service() -> PushNotificationService:
    """Get the global push notification service instance"""
    if push_service is None:
        raise RuntimeError(
            "Push notification service not initialized. Call initialize_push_service first.")
    return push_service
