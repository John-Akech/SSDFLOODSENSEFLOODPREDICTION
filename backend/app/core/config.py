from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Any, Union
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.env")),
        env_file_encoding="utf-8",
        extra="ignore",
        protected_namespaces=(),
    )
    
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "South Sudan Flood Prediction API"

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Security Headers
    ALLOWED_HOSTS: list[str] = ["localhost", "127.0.0.1"]
    # Use Union to accept either string or list from environment
    CORS_ORIGINS: Union[str, list[str]] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:80",
        "http://127.0.0.1:80",
        "http://localhost",
        "https://floodsense.org",
        "https://www.floodsense.org"
    ]
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """Parse CORS_ORIGINS from string or list"""
        if isinstance(v, str):
            # Handle comma-separated string from environment variable
            if not v or v.strip() == "":
                return []
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        elif isinstance(v, list):
            return v
        return []
    
    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def ensure_cors_list(cls, v: Any) -> list[str]:
        """Ensure CORS_ORIGINS is always a list"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    MAX_LOGIN_ATTEMPTS: int = 5
    LOGIN_ATTEMPT_WINDOW: int = 900  # 15 minutes
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 3600  # 1 hour

    # Password Policy
    MIN_PASSWORD_LENGTH: int = 8
    REQUIRE_SPECIAL_CHAR: bool = True
    REQUIRE_UPPERCASE: bool = True
    REQUIRE_NUMBER: bool = True

    # Database
    DATABASE_URL: str

    # Web Push (VAPID) - Optional, with defaults
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_SUBJECT: str = "mailto:admin@floodsense.org"

    # Model paths
    RF_MODEL_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../models/random_forest.pkl'))
    TCN_MODEL_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../models/tcn_model.pt'))
    PROTOTYPICAL_MODEL_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../models/prototypical_model.pt'))

    # Data paths
    DATA_PATH: str = "data/south_sudan_flood_combined_data.csv"

    # GIS Defaults
    DEFAULT_LATITUDE: float = 6.877
    DEFAULT_LONGITUDE: float = 31.307


settings = Settings()
print("Loaded settings successfully!")
