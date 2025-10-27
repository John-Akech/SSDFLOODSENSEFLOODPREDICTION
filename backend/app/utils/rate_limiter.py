import time
from typing import Dict, Optional
from fastapi import HTTPException, Request, status
import asyncio
from collections import defaultdict, deque


class RateLimiter:
    """Simple in-memory rate limiter for API endpoints"""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, deque] = defaultdict(deque)
        self._lock = asyncio.Lock()
    
    async def is_allowed(self, identifier: str) -> bool:
        """Check if request is allowed for the given identifier"""
        async with self._lock:
            now = time.time()
            window_start = now - self.window_seconds
            
            # Clean old requests
            while self.requests[identifier] and self.requests[identifier][0] < window_start:
                self.requests[identifier].popleft()
            
            # Check if under limit
            if len(self.requests[identifier]) < self.max_requests:
                self.requests[identifier].append(now)
                return True
            
            return False
    
    async def get_reset_time(self, identifier: str) -> Optional[float]:
        """Get the time when the rate limit resets for the identifier"""
        if identifier not in self.requests or not self.requests[identifier]:
            return None
        
        oldest_request = self.requests[identifier][0]
        return oldest_request + self.window_seconds


# Global rate limiter instance
rate_limiter = RateLimiter()


async def rate_limit_dependency(request: Request):
    """FastAPI dependency for rate limiting"""
    # Use IP address as identifier (in production, use user ID if authenticated)
    client_ip = request.client.host
    
    if not await rate_limiter.is_allowed(client_ip):
        reset_time = await rate_limiter.get_reset_time(client_ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
            headers={"Retry-After": str(int(reset_time - time.time()))} if reset_time else {}
        )
    
    return True