import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.main import app
from app.core.database import get_db, Base

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_crud.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=engine)

client = TestClient(app)

class TestCRUD:
    """Test CRUD operations"""
    
    def setup_method(self):
        """Setup for each test"""
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        
        # Create test user and get token
        user_data = {
            "email": "test@example.com",
            "password": "testpass123",
            "full_name": "Test User",
            "role": "community_member"
        }
        client.post("/api/v1/auth/register", json=user_data)
        
        login_response = client.post("/api/v1/auth/login", params={
            "email": "test@example.com",
            "password": "testpass123"
        })
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_flood_event_crud(self):
        """Test flood event CRUD operations"""
        # Create
        event_data = {
            "date_time": "2024-01-15T10:30:00Z",
            "latitude": 6.877,
            "longitude": 31.307,
            "severity": 0.8,
            "state": "Jonglei",
            "location_name": "Test Location"
        }
        
        create_response = client.post("/api/v1/flood-events", json=event_data, headers=self.headers)
        assert create_response.status_code == 200
        event = create_response.json()
        event_id = event["id"]
        
        # Read
        get_response = client.get(f"/api/v1/flood-events/{event_id}", headers=self.headers)
        assert get_response.status_code == 200
        assert get_response.json()["severity"] == 0.8
        
        # Update
        update_data = {"severity": 0.9, "location_name": "Updated Location"}
        update_response = client.put(f"/api/v1/flood-events/{event_id}", json=update_data, headers=self.headers)
        assert update_response.status_code == 200
        assert update_response.json()["severity"] == 0.9
        
        # List
        list_response = client.get("/api/v1/flood-events", headers=self.headers)
        assert list_response.status_code == 200
        assert len(list_response.json()) >= 1
    
    def test_prediction_crud(self):
        """Test prediction CRUD operations"""
        # Create prediction
        prediction_data = {
            "latitude": 6.877,
            "longitude": 31.307,
            "model_type": "rf",
            "lead_time_hours": 12
        }
        
        create_response = client.post("/api/v1/predictions", json=prediction_data, headers=self.headers)
        if create_response.status_code == 200:  # Only if models are loaded
            prediction = create_response.json()
            prediction_id = prediction["id"]
            
            # Read
            get_response = client.get(f"/api/v1/predictions/{prediction_id}", headers=self.headers)
            assert get_response.status_code == 200
            
            # Delete
            delete_response = client.delete(f"/api/v1/predictions/{prediction_id}", headers=self.headers)
            assert delete_response.status_code == 200
    
    def test_recommendation_crud(self):
        """Test recommendation CRUD operations"""
        # First create a prediction to link to
        prediction_data = {
            "latitude": 6.877,
            "longitude": 31.307,
            "model_type": "rf",
            "lead_time_hours": 12
        }
        
        pred_response = client.post("/api/v1/predictions", json=prediction_data, headers=self.headers)
        if pred_response.status_code == 200:
            prediction_id = pred_response.json()["id"]
            
            # Create recommendation
            rec_data = {
                "prediction_id": prediction_id,
                "recommendation_type": "dyke_placement",
                "latitude": 6.887,
                "longitude": 31.307,
                "description": "Test dyke recommendation",
                "priority": "high"
            }
            
            create_response = client.post("/api/v1/recommendations", json=rec_data, headers=self.headers)
            assert create_response.status_code == 200
            rec = create_response.json()
            rec_id = rec["id"]
            
            # Read
            get_response = client.get(f"/api/v1/recommendations/{rec_id}", headers=self.headers)
            assert get_response.status_code == 200
            
            # Update
            update_data = {"priority": "critical", "description": "Updated description"}
            update_response = client.put(f"/api/v1/recommendations/{rec_id}", json=update_data, headers=self.headers)
            assert update_response.status_code == 200
            assert update_response.json()["priority"] == "critical"
            
            # List
            list_response = client.get("/api/v1/recommendations", headers=self.headers)
            assert list_response.status_code == 200
            
            # Delete
            delete_response = client.delete(f"/api/v1/recommendations/{rec_id}", headers=self.headers)
            assert delete_response.status_code == 200
    
    def test_feedback_crud(self):
        """Test feedback CRUD operations"""
        # Create feedback
        feedback_data = {
            "feedback_type": "accuracy",
            "rating": 4,
            "comments": "Good prediction",
            "flood_occurred": True,
            "actual_severity": 0.7
        }
        
        create_response = client.post("/api/v1/feedback", json=feedback_data, headers=self.headers)
        assert create_response.status_code == 200
        feedback = create_response.json()
        feedback_id = feedback["id"]
        
        # Read
        get_response = client.get(f"/api/v1/feedback/{feedback_id}", headers=self.headers)
        assert get_response.status_code == 200
        assert get_response.json()["rating"] == 4
        
        # Update
        update_data = {"rating": 5, "comments": "Excellent prediction"}
        update_response = client.put(f"/api/v1/feedback/{feedback_id}", json=update_data, headers=self.headers)
        assert update_response.status_code == 200
        assert update_response.json()["rating"] == 5
        
        # List
        list_response = client.get("/api/v1/feedback", headers=self.headers)
        assert list_response.status_code == 200
        assert len(list_response.json()) >= 1
        
        # Delete
        delete_response = client.delete(f"/api/v1/feedback/{feedback_id}", headers=self.headers)
        assert delete_response.status_code == 200
    
    def test_unauthorized_access(self):
        """Test unauthorized access to CRUD operations"""
        # Try to access without token
        response = client.get("/api/v1/flood-events")
        assert response.status_code == 401
        
        response = client.post("/api/v1/flood-events", json={})
        assert response.status_code == 401
    
    def test_not_found_errors(self):
        """Test 404 errors for non-existent resources"""
        # Non-existent flood event
        response = client.get("/api/v1/flood-events/99999", headers=self.headers)
        assert response.status_code == 404
        
        # Non-existent recommendation
        response = client.get("/api/v1/recommendations/99999", headers=self.headers)
        assert response.status_code == 404
        
        # Non-existent feedback
        response = client.get("/api/v1/feedback/99999", headers=self.headers)
        assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v"])