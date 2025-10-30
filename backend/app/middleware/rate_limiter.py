from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict

class RateLimiter(BaseHTTPMiddleware):
    def __init__(self, app, requests: int = 100, window: int = 3600):
        super().__init__(app)
        self.requests = requests
        self.window = window
        self.clients: Dict[str, list] = defaultdict(list)
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks and development
        if request.url.path in ["/health", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)
            
        # Use 'testclient' as fallback when request.client is None (e.g. in test)
        client_ip = request.client.host if request.client else "testclient"
        now = datetime.now()
        
        # Clean old requests
        self.clients[client_ip] = [
            req_time for req_time in self.clients[client_ip]
            if now - req_time < timedelta(seconds=self.window)
        ]
        
        # Rate limiting disabled for development
        # Uncomment for production:
        # if len(self.clients[client_ip]) >= self.requests:
        #     raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
        self.clients[client_ip].append(now)
        return await call_next(request)
