"""
API endpoints for SMS alert subscriptions and testing
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import re

from app.core.database import get_db
from app.models.database_models import DBUser
from app.services.sms_service import get_sms_service
from app.api.auth_routes import get_current_user

router = APIRouter(prefix="/sms", tags=["SMS Notifications"])


class SMSSubscriptionRequest(BaseModel):
    phone_number: str = Field(...,
                              description="Phone number in international format (+211...)")
    enable_alerts: bool = Field(True, description="Enable SMS alerts")


class SMSTestRequest(BaseModel):
    phone_number: str = Field(..., description="Phone number to send test SMS")


def validate_phone_number(phone: str) -> str:
    """Validate and format phone number for South Sudan"""
    # Remove spaces and dashes
    phone = re.sub(r'[\s-]', '', phone)

    # Add + if missing
    if not phone.startswith('+'):
        if phone.startswith('211'):
            phone = f'+{phone}'
        elif phone.startswith('0'):
            # Convert local format to international
            phone = f'+211{phone[1:]}'
        else:
            phone = f'+211{phone}'

    # Validate format
    if not re.match(r'^\+211\d{9}$', phone):
        raise HTTPException(
            status_code=400,
            detail="Invalid phone number format. Use international format: +211XXXXXXXXX"
        )

    return phone


@router.post("/subscribe")
async def subscribe_sms_alerts(
    request: SMSSubscriptionRequest,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Subscribe to SMS flood alerts

    Phone numbers must be in international format (+211 for South Sudan)
    """
    try:
        # Validate phone number
        validated_phone = validate_phone_number(request.phone_number)

        # Update user's phone number and SMS preferences
        current_user.phone_number = validated_phone
        current_user.sms_alerts_enabled = request.enable_alerts

        db.commit()

        sms_service = get_sms_service()

        return {
            "success": True,
            "message": f"SMS alerts {'enabled' if request.enable_alerts else 'disabled'}",
            "phone_number": validated_phone,
            "sms_service_available": sms_service.enabled,
            "provider": sms_service.provider if sms_service.enabled else None
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to update SMS subscription: {str(e)}")


@router.post("/unsubscribe")
async def unsubscribe_sms_alerts(
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unsubscribe from SMS flood alerts"""
    try:
        current_user.sms_alerts_enabled = False
        db.commit()

        return {
            "success": True,
            "message": "SMS alerts disabled"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to unsubscribe: {str(e)}")


@router.get("/status")
async def get_sms_status(
    current_user: DBUser = Depends(get_current_user)
):
    """Get SMS subscription status for current user"""
    sms_service = get_sms_service()

    return {
        "phone_number": current_user.phone_number,
        "sms_alerts_enabled": current_user.sms_alerts_enabled,
        "email_alerts_enabled": current_user.email_alerts_enabled,
        "sms_service_available": sms_service.enabled,
        "provider": sms_service.provider if sms_service.enabled else None
    }


@router.post("/test")
async def send_test_sms(
    request: SMSTestRequest,
    current_user: DBUser = Depends(get_current_user)
):
    """
    Send a test SMS (admin only or to own number)

    Requires SMS service to be configured (Twilio or Africa's Talking)
    """
    sms_service = get_sms_service()

    if not sms_service.enabled:
        raise HTTPException(
            status_code=503,
            detail="SMS service not configured. Set up Twilio or Africa's Talking credentials."
        )

    try:
        # Validate phone number
        validated_phone = validate_phone_number(request.phone_number)

        # Security: Only allow testing own number or admin
        if current_user.role != "admin" and current_user.phone_number != validated_phone:
            raise HTTPException(
                status_code=403,
                detail="You can only send test SMS to your own phone number"
            )

        # Send test SMS
        success = sms_service.send_test_sms(validated_phone)

        if success:
            return {
                "success": True,
                "message": f"Test SMS sent to {validated_phone}",
                "provider": sms_service.provider
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to send test SMS"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to send test SMS: {str(e)}")


@router.get("/service-info")
async def get_sms_service_info():
    """Get SMS service configuration info (public endpoint)"""
    sms_service = get_sms_service()

    return {
        "enabled": sms_service.enabled,
        "provider": sms_service.provider if sms_service.enabled else None,
        "supported_countries": ["South Sudan (+211)"],
        "setup_instructions": {
            "twilio": "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER",
            "africastalking": "Set AFRICASTALKING_USERNAME, AFRICASTALKING_API_KEY"
        } if not sms_service.enabled else None
    }
