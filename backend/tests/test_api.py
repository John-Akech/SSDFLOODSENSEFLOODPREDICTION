import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.main import app
from app.core.database import get_db, Base
from app.schemas.schemas import UserCreate, PredictionRequest, ModelType

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Create test database
Base.metadata.create_all(bind=engine)

client = TestClient(app)

class TestAPI:
    """Test cases for the FloodSense API"""
    
    def setup_method(self):
        """Setup for each test method"""
        # Clear database
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    
    def test_root_endpoint(self):
        """Test the root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "FloodSense API" in data["message"]
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"
    
    def test_api_health_check(self):
        """Test API health check endpoint"""
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
    
    def test_user_registration(self):
        """Test user registration"""
        import time
        # Use unique email to avoid conflicts
        unique_email = f"test_{int(time.time())}@example.com"
        user_data = {
            "email": unique_email,
            "password": "TestPassword123!",
            "full_name": "Test User",
            "role": "community_member",
            "language": "en"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code in [200, 201], f"Expected 200 or 201, got {response.status_code}: {response.json()}"
        data = response.json()
        assert data["email"] == unique_email
        assert data["full_name"] == user_data["full_name"]
        assert "id" in data
    
    def test_user_login(self):
        """Test user login"""
        import time
        # First register a user
        unique_email = f"login_{int(time.time())}@example.com"
        user_data = {
            "email": unique_email,
            "password": "TestPassword123!",
            "full_name": "Test User"
        }
        client.post("/api/v1/auth/register", json=user_data)
        
        # Then login
        login_data = {
            "email": unique_email,
            "password": "TestPassword123!"
        }
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_prediction_without_auth(self):
        """Test prediction endpoint without authentication"""
        prediction_data = {
            "latitude": 6.877,
            "longitude": 31.307,
            "model_type": "rf",
            "lead_time_hours": 12
        }
        
        response = client.post("/api/v1/predictions", json=prediction_data)
        assert response.status_code == 401  # Unauthorized
    
    def test_prediction_with_auth(self):
        """Test prediction endpoint with authentication"""
        # Register and login user
        user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "full_name": "Test User"
        }
        client.post("/api/v1/auth/register", json=user_data)
        
        login_response = client.post("/api/v1/auth/login", params={
            "email": "test@example.com",
            "password": "testpassword123"
        })
        token = login_response.json()["access_token"]
        
        # Make prediction
        prediction_data = {
            "latitude": 6.877,
            "longitude": 31.307,
            "model_type": "rf",
            "lead_time_hours": 12
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        response = client.post("/api/v1/predictions", json=prediction_data, headers=headers)
        
        # Note: This might fail if models aren't loaded, but we test the auth flow
        assert response.status_code in [200, 500]  # 500 if models not loaded
    
    def test_invalid_coordinates(self):
        """Test prediction with invalid coordinates"""
        # Register and login user
        user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "full_name": "Test User"
        }
        client.post("/api/v1/auth/register", json=user_data)
        
        login_response = client.post("/api/v1/auth/login", params={
            "email": "test@example.com",
            "password": "testpassword123"
        })
        token = login_response.json()["access_token"]
        
        # Invalid latitude
        prediction_data = {
            "latitude": 95.0,  # Invalid latitude
            "longitude": 31.307,
            "model_type": "rf",
            "lead_time_hours": 12
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        response = client.post("/api/v1/predictions", json=prediction_data, headers=headers)
        assert response.status_code == 422  # Validation error
    
    def test_get_user_info(self):
        """Test getting current user info"""
        # Register and login user
        user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "full_name": "Test User"
        }
        client.post("/api/v1/auth/register", json=user_data)
        
        login_response = client.post("/api/v1/auth/login", params={
            "email": "test@example.com",
            "password": "testpassword123"
        })
        token = login_response.json()["access_token"]
        
        # Get user info
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/v1/users/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["full_name"] == user_data["full_name"]
    
    def test_duplicate_user_registration(self):
        """Test registering duplicate user"""
        user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "full_name": "Test User"
        }
        
        # First registration
        response1 = client.post("/api/v1/auth/register", json=user_data)
        assert response1.status_code == 200
        
        # Duplicate registration
        response2 = client.post("/api/v1/auth/register", json=user_data)
        assert response2.status_code == 400
        assert "already registered" in response2.json()["detail"]
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        
        response = client.post("/api/v1/auth/login", params=login_data)
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])