"""
FloodSense API - Main Application Entry Point

This is the main FastAPI application for the South Sudan Flood Prediction System.
It sets up all the routes, middleware, and handles the application lifecycle.

Author: John Akech
Last Updated: November 2025
"""

from .middleware.ip_whitelist import IPWhitelistMiddleware
from .middleware.request_logger import RequestLoggerMiddleware
from .middleware.security_headers import SecurityHeadersMiddleware
from .middleware.rate_limiter import RateLimiter
from .services.model_service import ModelService
from .core.config import settings
from .core.database import init_db, SessionLocal
from .api.audit_routes import router as audit_router
from .api.crud_routes import router as crud_router
from .api.auth_routes import router as auth_router
from .api.admin_routes import router as admin_router
from .api.routes import router
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html
import uvicorn
import os
from contextlib import asynccontextmanager

import sys
sys.path.insert(0, os.path.dirname(__file__))

# Import our custom routes

# Import core functionality

# Import our custom middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handle application startup and shutdown.
    This runs once when the app starts and once when it shuts down.
    """
    # Startup: Initialize database and load ML models
    print("Starting application initialization...")
    init_db()
    print("[OK] Database initialized")

    print("Loading ML models...")
    try:
        await ModelService.load_models()
        print(f"[OK] Models loaded: {ModelService.models_loaded}")
        print(f"  - Random Forest: {ModelService.rf_model is not None}")
        print(f"  - Gradient Boosting: {ModelService.gb_model is not None}")
        print(f"  - TCN: {ModelService.tcn_model is not None}")
        print(f"  - LSTM: {ModelService.lstm_model is not None}")
    except Exception as e:
        print(f"[ERROR] Error loading models: {e}")
        import traceback
        traceback.print_exc()

    # Initialize push notification service
    print("Initializing push notification service...")
    try:
        from app.services.push_notification_service import initialize_push_service
        if settings.VAPID_PRIVATE_KEY and settings.VAPID_PUBLIC_KEY:
            initialize_push_service(
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_public_key=settings.VAPID_PUBLIC_KEY,
                vapid_email=settings.VAPID_SUBJECT.replace("mailto:", "")
            )
            print("[OK] Push notification service initialized")
        else:
            print("[WARNING] VAPID keys not configured - push notifications disabled")
    except Exception as e:
        print(
            f"[WARNING] Push notification service initialization failed: {e}")

    yield
    # Shutdown: cleanup would go here if needed


# Create the main FastAPI application
app = FastAPI(
    title="FloodSense API",
    description="Community-Based Predictive Flood Forecasting and Early Warning System for South Sudan",
    version="2.0.0",
    lifespan=lifespan,
    openapi_version="3.1.0",
    docs_url=None,
    redoc_url=None
)

# Add middleware layers
# Important: Middleware executes in REVERSE ORDER (last added runs first)
# Think of it like wrapping layers - the outer layer runs first on the way in

# Optional HTTPS enforcement for production deployments
if settings.FORCE_HTTPS:
    app.add_middleware(HTTPSRedirectMiddleware)

# 1. Rate limiting (outer layer - runs first)
# Prevents abuse by limiting requests per hour
app.add_middleware(
    RateLimiter,
    requests=settings.RATE_LIMIT_REQUESTS,
    window=settings.RATE_LIMIT_WINDOW,
)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS or [
        "localhost", "127.0.0.1", "159.203.162.85", "backend", "*.floodsense.org", "testserver"
    ]
)

app.add_middleware(IPWhitelistMiddleware)
app.add_middleware(RequestLoggerMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# CORS must be LAST (most inner layer) to handle preflight OPTIONS requests
# Ensure frontend, admin dashboard, and all clients can communicate
cors_origins = settings.CORS_ORIGINS if hasattr(settings, "CORS_ORIGINS") else [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:80",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:80",
    "http://localhost",
    "https://floodsense.org",
    "https://www.floodsense.org"
]

# Handle wildcard CORS
allow_origins = ["*"] if "*" in cors_origins else cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False if "*" in cors_origins else True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    max_age=3600
)

# app.add_exception_handler(SQLAlchemyError, database_error_handler)

# Include API routes with /api/v1 prefix
# Order matters - more specific routes should be included first
app.include_router(admin_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")  # Audit logs
app.include_router(router, prefix="/api/v1")
app.include_router(crud_router, prefix="/api/v1")  # CRUD routes last


# Custom Swagger UI endpoints (must be after router includes)
@app.get("/api/v1/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """Custom Swagger UI with v5.x that fully supports OpenAPI 3.1.0"""
    return get_swagger_ui_html(
        openapi_url="/api/v1/openapi.json",
        title=f"{app.title} - Swagger UI",
        swagger_ui_parameters={"syntaxHighlight": {"theme": "monokai"}},
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui.css",
    )


@app.get("/api/v1/openapi.json", include_in_schema=False)
async def get_openapi_schema():
    """Serve OpenAPI schema at /api/v1/openapi.json"""
    from fastapi.openapi.utils import get_openapi
    return get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        openapi_version="3.1.0"
    )


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
            from .models.database_models import SystemLog
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
