"""
Audit Log Model
Tracks all important system activities for security and debugging
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from sqlalchemy.sql import func
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Who did it
    user_id = Column(Integer, nullable=True, index=True)  # NULL for system actions
    user_email = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    
    # What happened
    action = Column(String, nullable=False, index=True)  # login, prediction, alert_sent, data_cleared, etc.
    resource = Column(String, nullable=True, index=True)  # users, predictions, alerts, etc.
    resource_id = Column(String, nullable=True)  # ID of affected resource
    
    # Details
    status = Column(String, nullable=False, default='success')  # success, failed, error
    message = Column(Text, nullable=True)  # Human-readable description
    details = Column(JSON, nullable=True)  # Additional structured data
    
    # Request context
    endpoint = Column(String, nullable=True)  # API endpoint called
    method = Column(String, nullable=True)  # GET, POST, DELETE, etc.
    user_agent = Column(String, nullable=True)  # Browser/client info
    
    def __repr__(self):
        return f"<AuditLog {self.timestamp} - {self.action} by {self.user_email or 'system'}>"
