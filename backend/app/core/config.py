from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "South Sudan Flood Prediction API"

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    
    # Security Headers
    ALLOWED_HOSTS: list[str] = ["localhost", "127.0.0.1"]
    CORS_ORIGINS: list[str] = [
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

    # Web Push (VAPID)
    VAPID_PUBLIC_KEY: str
    VAPID_PRIVATE_KEY: str
    VAPID_SUBJECT: str

    # Model paths
    RF_MODEL_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../models/random_forest.pkl'))
    TCN_MODEL_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../models/tcn_model.pt'))
    PROTOTYPICAL_MODEL_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../models/prototypical_model.pt'))

    # Data paths
    DATA_PATH: str = "data/south_sudan_flood_combined_data.csv"

    # GIS Defaults
    DEFAULT_LATITUDE: float = 6.877
    DEFAULT_LONGITUDE: float = 31.307

    class Config:
        env_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.env"))
        env_file_encoding = "utf-8"
        extra = "ignore"  #  Prevents "extra inputs are not permitted"
        protected_namespaces = ()


settings = Settings()
print("Loaded settings successfully!")
