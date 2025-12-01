"""
SMS Notification Service for FloodSense
Sends SMS alerts via Twilio API for low-resource areas with limited internet
Fallback to Africa's Talking for better regional coverage
"""
import logging
from typing import List, Optional
import os

logger = logging.getLogger(__name__)


class SMSService:
    """Service for sending SMS alerts via Twilio or Africa's Talking"""

    def __init__(self):
        # Twilio configuration (primary)
        self.twilio_account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.twilio_phone_number = os.getenv("TWILIO_PHONE_NUMBER")

        # Africa's Talking configuration (fallback for better African coverage)
        self.africastalking_username = os.getenv("AFRICASTALKING_USERNAME")
        self.africastalking_api_key = os.getenv("AFRICASTALKING_API_KEY")
        self.africastalking_sender_id = os.getenv(
            "AFRICASTALKING_SENDER_ID", "FloodSense")

        self.enabled = False
        self.provider = None

        # Initialize provider
        if self.twilio_account_sid and self.twilio_auth_token and self.twilio_phone_number:
            try:
                from twilio.rest import Client
                self.twilio_client = Client(
                    self.twilio_account_sid, self.twilio_auth_token)
                self.enabled = True
                self.provider = "twilio"
                logger.info("SMS service initialized with Twilio")
            except ImportError:
                logger.warning(
                    "Twilio library not installed. Install with: pip install twilio")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")

        elif self.africastalking_username and self.africastalking_api_key:
            try:
                import africastalking
                africastalking.initialize(
                    self.africastalking_username, self.africastalking_api_key)
                self.africastalking_sms = africastalking.SMS
                self.enabled = True
                self.provider = "africastalking"
                logger.info("SMS service initialized with Africa's Talking")
            except ImportError:
                logger.warning(
                    "Africa's Talking library not installed. Install with: pip install africastalking")
            except Exception as e:
                logger.error(
                    f"Failed to initialize Africa's Talking client: {e}")
        else:
            logger.warning(
                "SMS service not configured. Set either Twilio or Africa's Talking credentials:\n"
                "Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER\n"
                "Africa's Talking: AFRICASTALKING_USERNAME, AFRICASTALKING_API_KEY"
            )

    def format_sms_message(self, message: str, severity: str, location: str) -> str:
        """Format message for SMS (160 character limit for single SMS)"""
        # Emojis for severity (low bandwidth, universally understood)
        severity_icons = {
            "emergency": "🚨",
            "critical": "⚠️",
            "high": "⚠",
            "medium": "ℹ️",
            "low": "ℹ"
        }

        icon = severity_icons.get(severity, "ℹ️")

        # Compress message to fit SMS limit
        # Format: [Icon] SEVERITY: Location - Brief action
        if len(message) <= 140:
            return f"{icon} {message}"

        # Extract key information for ultra-short message
        if severity in ["emergency", "critical"]:
            return f"{icon} FLOOD {severity.upper()}: {location}. EVACUATE NOW. Check FloodSense app for details."
        elif severity == "high":
            return f"{icon} FLOOD WARNING: {location}. Prepare evacuation. Monitor updates."
        else:
            return f"{icon} FLOOD {severity.upper()}: {location}. Stay alert. Visit FloodSense."

    def send_sms(
        self,
        phone_numbers: List[str],
        message: str,
        severity: str = "medium",
        location: str = "South Sudan"
    ) -> dict:
        """
        Send SMS to multiple recipients

        Args:
            phone_numbers: List of phone numbers (international format: +211...)
            message: Alert message
            severity: Alert severity level
            location: Location name for context

        Returns:
            dict with success/failure counts and details
        """
        if not self.enabled:
            logger.warning(
                f"SMS service not enabled. Would send to {len(phone_numbers)} recipients")
            return {
                "success": 0,
                "failed": len(phone_numbers),
                "error": "SMS service not configured"
            }

        # Format message for SMS
        sms_message = self.format_sms_message(message, severity, location)

        success_count = 0
        failed_count = 0
        errors = []

        if self.provider == "twilio":
            return self._send_via_twilio(phone_numbers, sms_message, success_count, failed_count, errors)
        elif self.provider == "africastalking":
            return self._send_via_africastalking(phone_numbers, sms_message, success_count, failed_count, errors)

        return {
            "success": success_count,
            "failed": failed_count,
            "errors": errors
        }

    def _send_via_twilio(self, phone_numbers: List[str], message: str, success: int, failed: int, errors: list) -> dict:
        """Send SMS via Twilio"""
        for phone in phone_numbers:
            try:
                # Validate phone number format
                if not phone.startswith('+'):
                    phone = f"+{phone}"

                result = self.twilio_client.messages.create(
                    body=message,
                    from_=self.twilio_phone_number,
                    to=phone
                )

                if result.sid:
                    success += 1
                    logger.info(
                        f"SMS sent to {phone} (Twilio SID: {result.sid})")
                else:
                    failed += 1
                    errors.append(f"{phone}: Unknown error")

            except Exception as e:
                failed += 1
                errors.append(f"{phone}: {str(e)}")
                logger.error(f"Failed to send SMS to {phone}: {e}")

        return {
            "success": success,
            "failed": failed,
            "errors": errors,
            "provider": "twilio"
        }

    def _send_via_africastalking(self, phone_numbers: List[str], message: str, success: int, failed: int, errors: list) -> dict:
        """Send SMS via Africa's Talking (better coverage in Africa)"""
        try:
            # Africa's Talking can send to multiple numbers at once
            result = self.africastalking_sms.send(
                message=message,
                recipients=phone_numbers,
                sender_id=self.africastalking_sender_id
            )

            # Parse results
            if 'SMSMessageData' in result and 'Recipients' in result['SMSMessageData']:
                for recipient in result['SMSMessageData']['Recipients']:
                    if recipient.get('status') == 'Success':
                        success += 1
                        logger.info(
                            f"SMS sent to {recipient.get('number')} via Africa's Talking")
                    else:
                        failed += 1
                        errors.append(
                            f"{recipient.get('number')}: {recipient.get('status')}")
                        logger.error(
                            f"Failed to send SMS to {recipient.get('number')}: {recipient.get('status')}")

            return {
                "success": success,
                "failed": failed,
                "errors": errors,
                "provider": "africastalking"
            }

        except Exception as e:
            logger.error(f"Africa's Talking bulk SMS failed: {e}")
            return {
                "success": 0,
                "failed": len(phone_numbers),
                "errors": [str(e)],
                "provider": "africastalking"
            }

    def send_test_sms(self, phone_number: str) -> bool:
        """Send a test SMS to verify configuration"""
        if not self.enabled:
            logger.error("SMS service not configured")
            return False

        test_message = "🌊 FloodSense SMS Alert Test: This is a test message. You are subscribed to flood alerts for South Sudan."

        result = self.send_sms(
            phone_numbers=[phone_number],
            message=test_message,
            severity="low",
            location="Test"
        )

        return result["success"] > 0


# Global SMS service instance
sms_service = SMSService()


def get_sms_service() -> SMSService:
    """Get the global SMS service instance"""
    return sms_service
