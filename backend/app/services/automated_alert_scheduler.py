"""
Automated Alert Scheduler for FloodSense
Runs predictions on schedule and automatically sends multi-channel alerts
"""
import asyncio
import logging
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.services.model_service import ModelService
from app.services.alert_service import alert_service
from app.services.sms_service import get_sms_service
from app.utils.email_service import EmailService

logger = logging.getLogger(__name__)


class AutomatedAlertScheduler:
    """Scheduler for automated flood predictions and multi-channel alerts"""

    # High-risk locations for automated monitoring (South Sudan flood-prone areas)
    MONITORED_LOCATIONS = [
        {"name": "Bor", "lat": 6.2073, "lon": 31.5589, "district": "Jonglei"},
        {"name": "Bentiu", "lat": 9.2333, "lon": 29.7833, "district": "Unity"},
        {"name": "Malakal", "lat": 9.5334, "lon": 31.6500, "district": "Upper Nile"},
        {"name": "Pibor", "lat": 6.8000, "lon": 33.1333, "district": "Jonglei"},
        {"name": "Aweil", "lat": 8.7667, "lon": 27.4000,
            "district": "Northern Bahr el Ghazal"},
        {"name": "Yirol", "lat": 6.5542, "lon": 30.5050, "district": "Lakes"},
        {"name": "Rumbek", "lat": 6.8000, "lon": 29.6833, "district": "Lakes"},
        {"name": "Wau", "lat": 7.7028, "lon": 27.9950,
            "district": "Western Bahr el Ghazal"},
    ]

    def __init__(self):
        self.running = False
        self.check_interval_hours = 6  # Check every 6 hours
        self.sms_service = get_sms_service()

    async def run_scheduled_predictions(self):
        """Run predictions for all monitored locations"""
        logger.info("Starting automated prediction cycle...")

        db = SessionLocal()
        try:
            results = []
            for location in self.MONITORED_LOCATIONS:
                try:
                    result = await self._predict_and_alert(
                        db=db,
                        latitude=location["lat"],
                        longitude=location["lon"],
                        location_name=location["name"],
                        district=location["district"]
                    )
                    results.append(result)
                    # Small delay to avoid overwhelming services
                    await asyncio.sleep(2)
                except Exception as e:
                    logger.error(f"Failed to process {location['name']}: {e}")
                    results.append({
                        "location": location["name"],
                        "success": False,
                        "error": str(e)
                    })

            # Log summary
            successful = sum(1 for r in results if r.get("success"))
            logger.info(
                f"Automated prediction cycle complete: "
                f"{successful}/{len(results)} locations processed successfully"
            )

            return results

        finally:
            db.close()

    async def _predict_and_alert(
        self,
        db: Session,
        latitude: float,
        longitude: float,
        location_name: str,
        district: str
    ) -> Dict[str, Any]:
        """Run prediction for a location and send alerts if needed"""

        try:
            # Get GEE features for this location
            features = ModelService.generate_features_from_location(
                latitude, longitude)

            # Run ensemble prediction
            probability, confidence, model_probs, inference_time = ModelService.predict_ensemble(
                features)

            # Determine if alert should be sent (threshold: 40% probability)
            should_alert = probability >= 0.40

            if should_alert:
                # Create alert
                alert = alert_service.create_alert(
                    latitude=latitude,
                    longitude=longitude,
                    flood_probability=probability,
                    model_type="ensemble",
                    lead_time_hours=48,
                    district=district
                )

                # Send multi-channel notifications
                notification_results = await self._send_multi_channel_alert(
                    db=db,
                    alert=alert,
                    location_name=location_name,
                    probability=probability
                )

                logger.info(
                    f"Alert created for {location_name}: "
                    f"{probability:.1%} risk, {alert.severity} severity"
                )

                return {
                    "location": location_name,
                    "success": True,
                    "probability": probability,
                    "severity": alert.severity,
                    "notifications": notification_results
                }
            else:
                logger.info(
                    f"No alert needed for {location_name}: "
                    f"{probability:.1%} risk (below threshold)"
                )

                return {
                    "location": location_name,
                    "success": True,
                    "probability": probability,
                    "alert_sent": False
                }

        except Exception as e:
            logger.error(f"Prediction failed for {location_name}: {e}")
            return {
                "location": location_name,
                "success": False,
                "error": str(e)
            }

    async def _send_multi_channel_alert(
        self,
        db: Session,
        alert: Any,
        location_name: str,
        probability: float
    ) -> Dict[str, Any]:
        """Send alert through all available channels"""

        results = {}

        # 1. Web Push Notifications (for users with internet)
        try:
            from app.models.database_models import DBPush
            subscriptions = db.query(DBPush).all()

            if subscriptions:
                push_result = await alert_service.send_web_push_alert(
                    alert=alert,
                    user_subscriptions=[
                        {
                            "endpoint": sub.endpoint,
                            "keys": {"p256dh": sub.p256dh, "auth": sub.auth}
                        }
                        for sub in subscriptions
                    ]
                )
                results["push"] = {
                    "sent": push_result,
                    "count": len(subscriptions)
                }
        except Exception as e:
            logger.error(f"Push notification failed: {e}")
            results["push"] = {"sent": False, "error": str(e)}

        # 2. SMS Notifications (for low-resource areas)
        try:
            # Get phone numbers from subscribed users
            from app.models.database_models import User
            users_with_phones = db.query(User).filter(
                User.phone_number.isnot(None),
                User.sms_alerts_enabled
            ).all()

            if users_with_phones and self.sms_service.enabled:
                phone_numbers = [
                    user.phone_number for user in users_with_phones]
                sms_result = self.sms_service.send_sms(
                    phone_numbers=phone_numbers,
                    message=alert.message,
                    severity=alert.severity,
                    location=location_name
                )
                results["sms"] = sms_result
            else:
                results["sms"] = {
                    "sent": False,
                    "reason": "No SMS-enabled users or SMS service not configured"
                }
        except Exception as e:
            logger.error(f"SMS notification failed: {e}")
            results["sms"] = {"sent": False, "error": str(e)}

        # 3. Email Notifications (for users with email)
        try:
            from app.models.database_models import User
            users_with_email = db.query(User).filter(
                User.email.isnot(None),
                User.email_alerts_enabled
            ).all()

            if users_with_email:
                emails = [user.email for user in users_with_email]
                subject = f"Flood Alert - {alert.severity.upper()} Risk in {location_name}"
                email_sent = await EmailService.send_alert_email(
                    recipients=emails,
                    subject=subject,
                    body=alert.message
                )
                results["email"] = {
                    "sent": email_sent,
                    "count": len(emails)
                }
            else:
                results["email"] = {
                    "sent": False,
                    "reason": "No email-enabled users"
                }
        except Exception as e:
            logger.error(f"Email notification failed: {e}")
            results["email"] = {"sent": False, "error": str(e)}

        return results

    async def start_scheduler(self):
        """Start the automated alert scheduler"""
        self.running = True
        logger.info(
            f"Automated alert scheduler started. "
            f"Monitoring {len(self.MONITORED_LOCATIONS)} locations every {self.check_interval_hours} hours"
        )

        while self.running:
            try:
                await self.run_scheduled_predictions()

                # Wait for next cycle
                await asyncio.sleep(self.check_interval_hours * 3600)

            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                # Wait a bit before retrying on error
                await asyncio.sleep(300)  # 5 minutes

    def stop_scheduler(self):
        """Stop the automated alert scheduler"""
        self.running = False
        logger.info("Automated alert scheduler stopped")


# Global scheduler instance
automated_scheduler = AutomatedAlertScheduler()


def get_automated_scheduler() -> AutomatedAlertScheduler:
    """Get the global automated scheduler instance"""
    return automated_scheduler
