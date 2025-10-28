from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "South Sudan Flood Prediction API"

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Security Headers
    ALLOWED_HOSTS: list = ["localhost", "127.0.0.1"]
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
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '../../database/floodsense.db'))}")

    # Model paths
    RF_MODEL_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../models/random_forest.pkl'))
    TCN_MODEL_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../models/tcn_model.pt'))
    PROTOTYPICAL_MODEL_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../models/prototypical_model.pt'))

    # Data paths
    DATA_PATH: str = "data/south_sudan_flood_combined_data.csv"

    # GIS Settings
    DEFAULT_LATITUDE: float = 6.877  # South Sudan center
    DEFAULT_LONGITUDE: float = 31.307

    class Config:
        env_file = ".env"
        protected_namespaces = ()


settings = Settings()
