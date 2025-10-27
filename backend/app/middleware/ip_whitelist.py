from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
import os


class IPWhitelistMiddleware(BaseHTTPMiddleware):
    """Optional IP whitelist for admin endpoints"""
    
    def __init__(self, app, whitelist: list = None):
        super().__init__(app)
        self.whitelist = whitelist or []
        # Add localhost by default
        self.whitelist.extend(["127.0.0.1", "::1", "localhost"])
        
        # Load from environment
        env_whitelist = os.getenv("IP_WHITELIST", "")
        if env_whitelist:
            self.whitelist.extend(env_whitelist.split(","))
    
    async def dispatch(self, request: Request, call_next):
        # Only check admin endpoints
        if request.url.path.startswith("/api/v1/admin"):
            client_ip = request.client.host
            
            if client_ip not in self.whitelist:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: IP not whitelisted"
                )
        
        return await call_next(request)
