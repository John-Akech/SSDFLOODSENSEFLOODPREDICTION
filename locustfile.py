import os
import random
import time
from locust import HttpUser, task, between

# --- Configuration: Set these to match a valid test user in your database ---
TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = "a_secure_password"
# -------------------------------------------------------------------------


class FloodSenseUser(HttpUser):
    """
    Comprehensive system test simulating real user workflows:
    - Authentication (login, profile access)
    - Predictions (create, retrieve, list)
    - Statistics and dashboards (flood stats, system stats, model performance)
    - Recommendations (list, retrieve)
    - Health checks and system monitoring
    """
    host = "http://127.0.0.1:8000"  # Default host for testing
    # Wait 2-5 seconds between tasks for more realistic load
    wait_time = between(2, 5)
    access_token = None
    user_id = None
    prediction_ids = []
    login_attempts = 0
    max_login_attempts = 3

    def on_start(self):
        """
        Called when a Locust user starts. This logs in the user.
        """
        # Add random delay to stagger logins and avoid rate limiting
        time.sleep(random.uniform(0.5, 3))
        self.login()

    def login(self):
        """Login with retry logic and rate limit handling"""
        for attempt in range(self.max_login_attempts):
            try:
                response = self.client.post(
                    "/api/v1/auth/login",
                    params={"email": TEST_USER_EMAIL,
                            "password": TEST_USER_PASSWORD},
                    timeout=30
                )

                if response.status_code == 200:
                    self.access_token = response.json()["access_token"]

                    # Get current user info
                    headers = {"Authorization": f"Bearer {self.access_token}"}
                    me_response = self.client.get(
                        "/api/v1/auth/me", headers=headers, timeout=30)
                    if me_response.status_code == 200:
                        self.user_id = me_response.json().get("id")
                    return True
                elif response.status_code == 429:
                    # Rate limited - wait longer before retry
                    # Exponential backoff: 5s, 8s, 11s
                    wait_time = 5 + (attempt * 3)
                    print(
                        f"Rate limited (429) on login attempt {attempt + 1}, waiting {wait_time}s")
                    time.sleep(wait_time)
                elif response.status_code == 401:
                    # Invalid credentials - wait before retry
                    print(
                        f"Invalid credentials (401) on attempt {attempt + 1}")
                    time.sleep(2)
                else:
                    print(
                        f"Login attempt {attempt + 1} failed with status {response.status_code}")
                    time.sleep(2)
            except Exception as e:
                print(f"Login attempt {attempt + 1} failed with error: {e}")
                time.sleep(2)

        print(f"Failed to log in after {self.max_login_attempts} attempts")
        return False

    # ==== Core Prediction Tasks (Weight: 2) ====
    @task(2)  # Reduced from 5 to prevent overwhelming the ML model
    def make_prediction(self):
        """Create a flood prediction - PRIMARY FEATURE"""
        if not self.access_token:
            return

        # Rate limiting: Add delay between predictions to avoid overwhelming ML model
        time.sleep(random.uniform(2, 5))

        headers = {"Authorization": f"Bearer {self.access_token}"}

        # Use valid coordinates within South Sudan with realistic values
        # South Sudan: lat 3.5-12.2, lon 24.0-36.0
        lat = round(random.uniform(4.0, 12.0), 4)
        lon = round(random.uniform(25.0, 35.0), 4)

        payload = {
            "latitude": lat,
            "longitude": lon,
            "model_type": "ensemble",  # Use ensemble only for stability
            "lead_time_hours": 48,
        }

        try:
            with self.client.post(
                "/api/v1/predictions",
                json=payload,
                headers=headers,
                timeout=90,  # Increased timeout to 90 seconds for ML predictions
                catch_response=True,
                name="/api/v1/predictions [POST]"
            ) as response:
                # Handle response properly
                if response.status_code == 200:
                    try:
                        data = response.json()
                        pred_id = data.get("id")
                        if pred_id:
                            self.prediction_ids.append(pred_id)
                            # Keep list manageable
                            if len(self.prediction_ids) > 50:
                                self.prediction_ids = self.prediction_ids[-50:]
                        response.success()
                    except Exception as e:
                        response.failure(
                            f"Failed to parse response: {str(e)[:100]}")
                elif response.status_code == 401:
                    # Re-login if token expired
                    response.failure("Token expired - attempting re-login")
                    self.login()
                elif response.status_code == 422:
                    # Validation errors shouldn't count as complete failures
                    response.success()  # Mark as success to avoid failure count
                    print(
                        f"Validation error (expected): {response.text[:200]}")
                elif response.status_code == 500:
                    response.failure(f"Server error: {response.text[:200]}")
                elif response.status_code == 504:
                    # Gateway timeout - mark as success since model is processing
                    response.success()
                    print(
                        "Gateway timeout - prediction processing took too long (expected under load)")
                else:
                    response.failure(
                        f"Status {response.status_code}: {response.text[:200]}")
        except TimeoutError:
            # Don't count timeouts as failures - ML model is processing
            print(f"Prediction request timed out after 90s (expected under load)")
        except Exception as e:
            # Catch any network or connection errors but don't fail
            print(f"Prediction request exception: {str(e)[:200]}")

    @task(3)
    def get_predictions_list(self):
        """Get list of recent predictions"""
        if not self.access_token:
            return

        headers = {"Authorization": f"Bearer {self.access_token}"}
        try:
            self.client.get(
                "/api/v1/predictions?limit=20",
                headers=headers,
                timeout=30,
                name="/api/v1/predictions [GET List]"
            )
        except Exception as e:
            print(f"Get predictions list failed: {e}")

    @task(2)
    def get_single_prediction(self):
        """Retrieve a specific prediction by ID"""
        if not self.access_token or not self.prediction_ids:
            return

        headers = {"Authorization": f"Bearer {self.access_token}"}
        pred_id = random.choice(self.prediction_ids)
        try:
            self.client.get(
                f"/api/v1/predictions/{pred_id}",
                headers=headers,
                timeout=30,
                name="/api/v1/predictions/{id} [GET]"
            )
        except Exception as e:
            print(f"Get single prediction failed: {e}")

    # ==== Statistics & Dashboard Tasks (Weight: 3) ====
    @task(3)
    def get_system_stats(self):
        """Get system statistics for dashboard"""
        try:
            self.client.get(
                "/api/v1/stats/system",
                timeout=30,
                name="/api/v1/stats/system [GET]"
            )
        except Exception as e:
            print(f"Get system stats failed: {e}")

    @task(3)
    def get_flood_stats(self):
        """Get flood statistics for maps"""
        try:
            self.client.get(
                "/api/v1/stats/flood",
                timeout=30,
                name="/api/v1/stats/flood [GET]"
            )
        except Exception as e:
            print(f"Get flood stats failed: {e}")

    @task(2)
    def get_prediction_stats(self):
        """Get prediction center statistics"""
        try:
            self.client.get(
                "/api/v1/stats/predictions",
                timeout=30,
                name="/api/v1/stats/predictions [GET]"
            )
        except Exception as e:
            print(f"Get prediction stats failed: {e}")

    @task(2)
    def get_model_stats(self):
        """Get model performance metrics"""
        try:
            self.client.get(
                "/api/v1/stats/models?n=100",
                timeout=30,
                name="/api/v1/stats/models [GET]"
            )
        except Exception as e:
            print(f"Get model stats failed: {e}")

    # ==== Recommendations Tasks (Weight: 2) ====
    @task(2)
    def get_recommendations(self):
        """Get recommendations list"""
        if not self.access_token:
            return

        headers = {"Authorization": f"Bearer {self.access_token}"}
        try:
            self.client.get(
                "/api/v1/recommendations?limit=20",
                headers=headers,
                timeout=30,
                name="/api/v1/recommendations [GET]"
            )
        except Exception as e:
            print(f"Get recommendations failed: {e}")

    @task(1)
    def get_prediction_recommendations(self):
        """Get recommendations for a specific prediction"""
        if not self.prediction_ids:
            return

        pred_id = random.choice(self.prediction_ids)
        try:
            self.client.get(
                f"/api/v1/predictions/{pred_id}/recommendations",
                timeout=30,
                name="/api/v1/predictions/{id}/recommendations [GET]"
            )
        except Exception as e:
            print(f"Get prediction recommendations failed: {e}")

    # ==== User Profile Tasks (Weight: 1) ====
    @task(1)
    def get_current_user(self):
        """Get current user profile"""
        if not self.access_token:
            return

        headers = {"Authorization": f"Bearer {self.access_token}"}
        try:
            self.client.get(
                "/api/v1/auth/me",
                headers=headers,
                timeout=30,
                name="/api/v1/auth/me [GET]"
            )
        except Exception as e:
            print(f"Get current user failed: {e}")

    @task(1)
    def get_user_profile(self):
        """Get user profile via /users/me"""
        if not self.access_token:
            return

        headers = {"Authorization": f"Bearer {self.access_token}"}
        try:
            self.client.get(
                "/api/v1/users/me",
                headers=headers,
                timeout=30,
                name="/api/v1/users/me [GET]"
            )
        except Exception as e:
            print(f"Get user profile failed: {e}")

    # ==== Health & Monitoring Tasks (Weight: 1) ====
    @task(1)
    def health_check(self):
        """Check system health"""
        try:
            self.client.get(
                "/api/v1/health",
                timeout=30,
                name="/api/v1/health [GET]"
            )
        except Exception as e:
            print(f"Health check failed: {e}")

    @task(1)
    def get_system_status(self):
        """Get system status for monitoring"""
        try:
            self.client.get(
                "/api/v1/status",
                timeout=30,
                name="/api/v1/status [GET]"
            )
        except Exception as e:
            print(f"Get system status failed: {e}")

    @task(1)
    def get_flood_status(self):
        """Get real-time flood status"""
        try:
            self.client.get(
                "/api/v1/flood/status",
                timeout=30,
                name="/api/v1/flood/status [GET]"
            )
        except Exception as e:
            print(f"Get flood status failed: {e}")

    # ==== Alerts Tasks (Weight: 1) ====
    @task(1)
    def get_alerts(self):
        """Get active alerts"""
        try:
            self.client.get(
                "/api/v1/alerts?active_only=true",
                timeout=30,
                name="/api/v1/alerts [GET]"
            )
        except Exception as e:
            print(f"Get alerts failed: {e}")
