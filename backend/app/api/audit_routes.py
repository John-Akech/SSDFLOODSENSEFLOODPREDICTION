"""
Audit Log API Routes
Endpoints for viewing and managing audit logs
"""

from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_

from app.core.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.audit_log import AuditLog
from pydantic import BaseModel

# Don't import User to avoid circular dependency/double table definition
# Use TYPE_CHECKING for type hints only
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.database_models import User

router = APIRouter()

# Response models
class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    user_id: Optional[int]
    user_email: Optional[str]
    ip_address: Optional[str]
    action: str
    resource: Optional[str]
    resource_id: Optional[str]
    status: str
    message: Optional[str]
    details: Optional[dict]
    endpoint: Optional[str]
    method: Optional[str]
    
    class Config:
        from_attributes = True

class AuditStatsResponse(BaseModel):
    total_logs: int
    successful_actions: int
    failed_actions: int
    errors: int
    unique_users: int
    most_common_action: Optional[str]
    logs_last_24h: int
    logs_last_7d: int

@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action"),
    resource: Optional[str] = Query(None, description="Filter by resource"),
    user_email: Optional[str] = Query(None, description="Filter by user email"),
    status: Optional[str] = Query(None, description="Filter by status"),
    days: int = Query(7, description="Number of days to look back"),
    limit: int = Query(100, description="Max records to return"),
    offset: int = Query(0, description="Pagination offset"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get audit logs (admin only)
    
    Filters:
    - action: login, prediction_created, alert_sent, data_cleared, etc.
    - resource: users, predictions, alerts, etc.
    - user_email: specific user
    - status: success, failed, error
    - days: how many days back to look
    """
    # Only admins can view audit logs
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build query
    query = db.query(AuditLog)
    
    # Date filter
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    query = query.filter(AuditLog.timestamp >= cutoff_date)
    
    # Apply filters
    if action:
        query = query.filter(AuditLog.action == action)
    if resource:
        query = query.filter(AuditLog.resource == resource)
    if user_email:
        query = query.filter(AuditLog.user_email == user_email)
    if status:
        query = query.filter(AuditLog.status == status)
    
    # Order by timestamp descending (newest first)
    query = query.order_by(desc(AuditLog.timestamp))
    
    # Pagination
    total = query.count()
    logs = query.offset(offset).limit(limit).all()
    
    return logs

@router.get("/audit-logs/stats", response_model=AuditStatsResponse)
async def get_audit_stats(
    days: int = Query(30, description="Number of days for statistics"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get audit log statistics (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Total logs
    total_logs = db.query(AuditLog).filter(AuditLog.timestamp >= cutoff_date).count()
    
    # Success/failed/error counts
    successful = db.query(AuditLog).filter(
        and_(AuditLog.timestamp >= cutoff_date, AuditLog.status == "success")
    ).count()
    
    failed = db.query(AuditLog).filter(
        and_(AuditLog.timestamp >= cutoff_date, AuditLog.status == "failed")
    ).count()
    
    errors = db.query(AuditLog).filter(
        and_(AuditLog.timestamp >= cutoff_date, AuditLog.status == "error")
    ).count()
    
    # Unique users
    unique_users = db.query(AuditLog.user_email).filter(
        and_(AuditLog.timestamp >= cutoff_date, AuditLog.user_email.isnot(None))
    ).distinct().count()
    
    # Most common action
    most_common = db.query(AuditLog.action).filter(
        AuditLog.timestamp >= cutoff_date
    ).group_by(AuditLog.action).order_by(desc(AuditLog.action)).first()
    
    # Logs in last 24 hours
    last_24h = datetime.utcnow() - timedelta(hours=24)
    logs_24h = db.query(AuditLog).filter(AuditLog.timestamp >= last_24h).count()
    
    # Logs in last 7 days
    last_7d = datetime.utcnow() - timedelta(days=7)
    logs_7d = db.query(AuditLog).filter(AuditLog.timestamp >= last_7d).count()
    
    return AuditStatsResponse(
        total_logs=total_logs,
        successful_actions=successful,
        failed_actions=failed,
        errors=errors,
        unique_users=unique_users,
        most_common_action=most_common[0] if most_common else None,
        logs_last_24h=logs_24h,
        logs_last_7d=logs_7d
    )

@router.get("/audit-logs/user/{user_email}")
async def get_user_audit_logs(
    user_email: str,
    days: int = Query(30, description="Number of days to look back"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get audit logs for specific user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    logs = db.query(AuditLog).filter(
        and_(
            AuditLog.user_email == user_email,
            AuditLog.timestamp >= cutoff_date
        )
    ).order_by(desc(AuditLog.timestamp)).all()
    
    return logs

@router.delete("/audit-logs/cleanup")
async def cleanup_old_logs(
    days: int = Query(90, description="Delete logs older than this many days"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete old audit logs (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    deleted = db.query(AuditLog).filter(
        AuditLog.timestamp < cutoff_date
    ).delete()
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Deleted {deleted} audit logs older than {days} days",
        "deleted_count": deleted
    }

@router.post("/audit-logs/export")
async def export_audit_logs(
    days: int = Query(30, description="Export logs from last N days"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Export audit logs to CSV (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from io import StringIO
    import csv
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    logs = db.query(AuditLog).filter(
        AuditLog.timestamp >= cutoff_date
    ).order_by(AuditLog.timestamp).all()
    
    # Create CSV
    output = StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        'Timestamp', 'User Email', 'IP Address', 'Action', 'Resource',
        'Resource ID', 'Status', 'Message', 'Endpoint', 'Method'
    ])
    
    # Data
    for log in logs:
        writer.writerow([
            log.timestamp.isoformat(),
            log.user_email or '',
            log.ip_address or '',
            log.action,
            log.resource or '',
            log.resource_id or '',
            log.status,
            log.message or '',
            log.endpoint or '',
            log.method or ''
        ])
    
    csv_content = output.getvalue()
    
    from fastapi.responses import Response
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=audit_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )
