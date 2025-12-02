TEST_PASSWORD = "TestPassword123!"


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "FloodSense API" in response.json()["message"]


def test_health_check(client):
    response = client.get("/health")
    payload = response.json()
    assert response.status_code == 200
    assert payload["status"] == "healthy"


def test_api_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert "status" in response.json()


def test_user_registration(client, make_email):
    payload = {
        "email": make_email("register"),
        "password": TEST_PASSWORD,
        "full_name": "Test User",
        "role": "community_member",
        "language": "en",
    }

    response = client.post("/auth/register", json=payload)
    assert response.status_code in (200, 201)
    body = response.json()
    assert body["email"] == payload["email"]
    assert body["full_name"] == payload["full_name"]
    assert "id" in body


def test_user_login(client, register_user):
    user_payload, _ = register_user()
    response = client.post(
        "/auth/login",
        params={"email": user_payload["email"],
                "password": user_payload["password"]},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_prediction_without_auth(client, prediction_payload):
    response = client.post("/predictions", json=prediction_payload)
    assert response.status_code == 401


def test_prediction_with_auth(client, auth_headers, prediction_payload):
    response = client.post("/predictions",
                           json=prediction_payload, headers=auth_headers)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["model_type"] == prediction_payload["model_type"]
    assert payload["risk_level"] in {
        "low", "medium", "high", "critical", "uncertain"}


def test_invalid_coordinates(client, auth_headers, prediction_payload):
    invalid_payload = {**prediction_payload, "latitude": 95.0}
    response = client.post("/predictions",
                           json=invalid_payload, headers=auth_headers)
    assert response.status_code == 422


def test_get_user_info(client, register_user):
    user_payload, _ = register_user(email="me@example.com")
    login_response = client.post(
        "/auth/login",
        params={"email": user_payload["email"],
                "password": user_payload["password"]},
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/users/me", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == user_payload["email"]
    assert body["full_name"] == user_payload["full_name"]


def test_duplicate_user_registration(client):
    payload = {
        "email": "duplicate@example.com",
        "password": TEST_PASSWORD,
        "full_name": "Test User",
    }

    first = client.post("/auth/register", json=payload)
    assert first.status_code in (200, 201)

    duplicate = client.post("/auth/register", json=payload)
    assert duplicate.status_code == 400
    assert "already registered" in duplicate.json()["detail"]


def test_invalid_login(client):
    response = client.post(
        "/auth/login",
        params={"email": "nonexistent@example.com", "password": TEST_PASSWORD},
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]
