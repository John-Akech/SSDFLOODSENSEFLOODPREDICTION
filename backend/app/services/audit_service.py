"""
Audit Logging Service
Central service for logging all system activities
"""

import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Request
from app.models.audit_log import AuditLog

# Configure Python logging as backup
logger = logging.getLogger(__name__)

class AuditService:
    """Service for recording audit logs"""
    
    @staticmethod
    def log(
        db: Session,
        action: str,
        resource: Optional[str] = None,
        resource_id: Optional[str] = None,
        user_id: Optional[int] = None,
        user_email: Optional[str] = None,
        status: str = "success",
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None
    ):
        """
        Log an audit event
        
        Args:
            db: Database session
            action: Action performed (login, prediction_created, alert_sent, etc.)
            resource: Resource type (users, predictions, alerts, etc.)
            resource_id: ID of affected resource
            user_id: User who performed the action (None for system)
            user_email: Email of user
            status: success, failed, error
            message: Human-readable message
            details: Additional structured data
            request: FastAPI request object (for IP, endpoint, etc.)
        """
        try:
            # Extract request info if available
            ip_address = None
            endpoint = None
            method = None
            user_agent = None
            
            if request:
                ip_address = request.client.host if request.client else None
                endpoint = str(request.url.path)
                method = request.method
                user_agent = request.headers.get("user-agent", None)
            
            # Create audit log entry
            audit_log = AuditLog(
                user_id=user_id,
                user_email=user_email,
                ip_address=ip_address,
                action=action,
                resource=resource,
                resource_id=resource_id,
                status=status,
                message=message,
                details=details,
                endpoint=endpoint,
                method=method,
                user_agent=user_agent
            )
            
            db.add(audit_log)
            db.commit()
            
            # Also log to Python logger for immediate visibility
            log_msg = f"[AUDIT] {action} - {message or ''} (user={user_email or 'system'}, status={status})"
            if status == "success":
                logger.info(log_msg)
            elif status == "failed":
                logger.warning(log_msg)
            else:  # error
                logger.error(log_msg)
                
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
            # Don't raise - audit logging should never break the main flow
    
    @staticmethod
    def log_login(db: Session, user_id: int, user_email: str, request: Request, success: bool = True):
        """Log user login attempt"""
        AuditService.log(
            db=db,
            action="login" if success else "login_failed",
            resource="users",
            resource_id=str(user_id) if success else None,
            user_id=user_id if success else None,
            user_email=user_email,
            status="success" if success else "failed",
            message=f"User {user_email} {'logged in' if success else 'failed to log in'}",
            request=request
        )
    
    @staticmethod
    def log_logout(db: Session, user_id: int, user_email: str, request: Request):
        """Log user logout"""
        AuditService.log(
            db=db,
            action="logout",
            resource="users",
            resource_id=str(user_id),
            user_id=user_id,
            user_email=user_email,
            status="success",
            message=f"User {user_email} logged out",
            request=request
        )
    
    @staticmethod
    def log_prediction(db: Session, prediction_id: int, user_id: Optional[int], 
                      user_email: Optional[str], latitude: float, longitude: float, 
                      flood_probability: float, request: Request):
        """Log flood prediction"""
        AuditService.log(
            db=db,
            action="prediction_created",
            resource="predictions",
            resource_id=str(prediction_id),
            user_id=user_id,
            user_email=user_email,
            status="success",
            message=f"Flood prediction created at ({latitude}, {longitude})",
            details={
                "latitude": latitude,
                "longitude": longitude,
                "flood_probability": flood_probability
            },
            request=request
        )
    
    @staticmethod
    def log_alert(db: Session, alert_id: int, recipient_count: int, 
                 user_id: Optional[int] = None, user_email: Optional[str] = None):
        """Log alert sent"""
        AuditService.log(
            db=db,
            action="alert_sent",
            resource="alerts",
            resource_id=str(alert_id),
            user_id=user_id,
            user_email=user_email or "system",
            status="success",
            message=f"Alert sent to {recipient_count} recipients",
            details={"recipient_count": recipient_count}
        )
    
    @staticmethod
    def log_data_cleared(db: Session, table_name: str, records_deleted: int, 
                        user_id: int, user_email: str, request: Request):
        """Log data clearing operation"""
        AuditService.log(
            db=db,
            action="data_cleared",
            resource=table_name,
            resource_id=None,
            user_id=user_id,
            user_email=user_email,
            status="success",
            message=f"Cleared {records_deleted} records from {table_name}",
            details={"records_deleted": records_deleted},
            request=request
        )
    
    @staticmethod
    def log_model_training(db: Session, model_name: str, accuracy: float, 
                          records_used: int, user_id: Optional[int] = None):
        """Log model training"""
        AuditService.log(
            db=db,
            action="model_trained",
            resource="models",
            resource_id=model_name,
            user_id=user_id,
            user_email="system" if user_id else None,
            status="success",
            message=f"Model {model_name} trained with {accuracy:.2%} accuracy",
            details={
                "model_name": model_name,
                "accuracy": accuracy,
                "records_used": records_used
            }
        )
    
    @staticmethod
    def log_system_error(db: Session, error_type: str, error_message: str, 
                        endpoint: Optional[str] = None, user_id: Optional[int] = None):
        """Log system error"""
        AuditService.log(
            db=db,
            action="system_error",
            resource="system",
            user_id=user_id,
            status="error",
            message=f"{error_type}: {error_message}",
            details={
                "error_type": error_type,
                "error_message": error_message,
                "endpoint": endpoint
            }
        )
