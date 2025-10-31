from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from contextlib import asynccontextmanager
from sqlalchemy.exc import SQLAlchemyError

import sys
sys.path.insert(0, os.path.dirname(__file__))

from api.routes import router
from api.admin_routes import router as admin_router
from api.auth_routes import router as auth_router
from api.crud_routes import router as crud_router

from core.database import init_db, SessionLocal
from core.config import settings
from services.model_service import ModelService
from middleware.error_handler import database_error_handler
from middleware.rate_limiter import RateLimiter
from middleware.security_headers import SecurityHeadersMiddleware
from middleware.request_logger import RequestLoggerMiddleware
from middleware.ip_whitelist import IPWhitelistMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    await ModelService.load_models()
    yield


app = FastAPI(
    title="FloodSense API",
    description="Community-Based Predictive Flood Forecasting and Early Warning System for South Sudan",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None
)

# Security Middleware (order matters!)
# Middleware executes in REVERSE ORDER (last added = first to execute)
# So add them in the order you want them to execute

# Rate Limiter (most outer layer)
app.add_middleware(RateLimiter, requests=100, window=3600)

# Trusted Host Middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "localhost", "127.0.0.1", "*.floodsense.org", "testserver"
    ]
)

app.add_middleware(IPWhitelistMiddleware)
app.add_middleware(RequestLoggerMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# CORS must be LAST (most inner layer) to handle preflight OPTIONS requests
# Ensure frontend, admin dashboard, and all clients can communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if hasattr(settings, "CORS_ORIGINS") else [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:80",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:80",
        "http://localhost",
        "https://floodsense.org",
        "https://www.floodsense.org"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    max_age=3600
)

# app.add_exception_handler(SQLAlchemyError, database_error_handler)

# Include API routes
# Order matters - more specific routes should be included first
app.include_router(admin_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(router, prefix="/api/v1")
app.include_router(crud_router, prefix="/api/v1")  # CRUD routes last


@app.get("/")
async def root():
    return {
        "message": "FloodSense API",
        "version": "2.0.0",
        "project": "BSc. Software Engineering",
        "student": "John Akech",
        "supervisor": "Samiratu Ntohsi"
    }


# Simple audit log for write operations
@app.middleware("http")
async def audit_write_requests(request: Request, call_next):
    response = await call_next(request)
    try:
        if request.method in ("POST", "PUT", "DELETE", "PATCH"):
            from models.database_models import SystemLog
            db = SessionLocal()
            try:
                log = SystemLog(
                    log_level="INFO",
                    message=f"{request.method} {request.url.path}",
                    endpoint=request.url.path,
                    user_id=None,
                    ip_address=request.client.host if request.client else None,
                )
                db.add(log)
                db.commit()
            finally:
                db.close()
    except Exception:
        pass
    return response


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "FloodSense ML API",
        "models_loaded": ModelService.models_loaded,
        "version": "2.0.0"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if os.getenv("ENVIRONMENT") == "development" else False
    )