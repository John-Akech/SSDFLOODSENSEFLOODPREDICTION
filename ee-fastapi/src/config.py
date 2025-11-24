"""Configuration management for EE-FastAPI"""
import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Earth Engine
    GEE_PROJECT_ID: Optional[str] = None
    GEE_SERVICE_ACCOUNT: Optional[str] = None

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8080
    API_WORKERS: int = 4

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000"
    ]

    # Storage
    OUTPUT_DIR: str = "output"
    MAX_FILE_SIZE_MB: int = 100

    # Processing
    SMOOTHING_RADIUS: int = 50
    DEFAULT_THRESHOLD: float = 1.25
    MAX_BBOX_AREA_KM2: float = 10000

    # Public path for reverse proxy setups (e.g., /sar on DigitalOcean)
    PUBLIC_PATH: str = os.getenv("SAR_PUBLIC_PATH", "")

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
