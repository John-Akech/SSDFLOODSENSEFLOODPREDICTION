from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import time
import os

# Ensure logs directory exists
os.makedirs('logs', exist_ok=True)

# Configure logging
logging.basicConfig(
    filename='logs/security.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    """Log all requests for security monitoring"""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # Log request
        ip = request.client.host if request.client else "testclient"
        logger.info(
            f"Request: {request.method} {request.url.path} | "
            f"IP: {ip} | "
            f"User-Agent: {request.headers.get('user-agent', 'Unknown')}"
        )

        # Process request
        response = await call_next(request)

        # Log response
        process_time = time.time() - start_time
        logger.info(
            f"Response: {response.status_code} | "
            f"Time: {process_time:.3f}s | "
            f"Path: {request.url.path}"
        )

        # Log suspicious activity
        if response.status_code == 401:
            logger.warning(
                f"Unauthorized access attempt: {request.url.path} | "
                f"IP: {ip}"
            )
        elif response.status_code == 429:
            logger.warning(
                f"Rate limit exceeded: IP {ip}"
            )

        return response
