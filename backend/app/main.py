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

from core.database import init_db
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
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggerMiddleware)
app.add_middleware(IPWhitelistMiddleware)

# Trusted Host Middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.floodsense.org"]
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        "http://localhost"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    max_age=3600
)

# Rate Limiter
rate_limiter = RateLimiter(requests=100, window=3600)
app.middleware("http")(rate_limiter)

app.add_exception_handler(SQLAlchemyError, database_error_handler)

# Include API routes
app.include_router(auth_router, prefix="/api/v1")
app.include_router(crud_router, prefix="/api/v1")

app.include_router(router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "FloodSense API",
        "version": "2.0.0",
        "project": "BSc. Software Engineering",
        "student": "John Akech",
        "supervisor": "Samiratu Ntohsi"
    }


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