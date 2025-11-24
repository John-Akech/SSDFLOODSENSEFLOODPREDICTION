import pytest


def _require_prediction_id(response):
    assert response.status_code == 200, response.text
    body = response.json()
    assert "id" in body
    return body["id"]


def test_flood_event_crud(client, auth_headers):
    event_data = {
        "date_time": "2024-01-15T10:30:00Z",
        "latitude": 6.877,
        "longitude": 31.307,
        "severity": 0.8,
        "state": "Jonglei",
        "location_name": "Test Location",
    }

    create_response = client.post(
        "/flood-events", json=event_data, headers=auth_headers)
    assert create_response.status_code in (200, 201)
    event_id = create_response.json()["id"]

    get_response = client.get(
        f"/flood-events/{event_id}", headers=auth_headers)
    assert get_response.status_code == 200
    assert get_response.json()["severity"] == pytest.approx(0.8)

    update_response = client.put(
        f"/flood-events/{event_id}",
        json={"severity": 0.9, "location_name": "Updated Location"},
        headers=auth_headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["severity"] == pytest.approx(0.9)

    list_response = client.get("/flood-events", headers=auth_headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) >= 1


def test_prediction_crud(client, auth_headers, prediction_payload):
    create_response = client.post(
        "/predictions", json=prediction_payload, headers=auth_headers)
    prediction_id = _require_prediction_id(create_response)

    get_response = client.get(
        f"/predictions/{prediction_id}", headers=auth_headers)
    assert get_response.status_code == 200

    delete_response = client.delete(
        f"/predictions/{prediction_id}", headers=auth_headers)
    assert delete_response.status_code == 200


def test_recommendation_crud(client, auth_headers, prediction_payload):
    prediction_response = client.post(
        "/predictions", json=prediction_payload, headers=auth_headers
    )
    prediction_id = _require_prediction_id(prediction_response)

    rec_payload = {
        "prediction_id": prediction_id,
        "recommendation_type": "dyke_placement",
        "latitude": 6.887,
        "longitude": 31.307,
        "description": "Test dyke recommendation",
        "priority": "high",
    }

    create_response = client.post(
        "/recommendations", json=rec_payload, headers=auth_headers)
    assert create_response.status_code in (200, 201)
    rec_id = create_response.json()["id"]

    get_response = client.get(
        f"/recommendations/{rec_id}", headers=auth_headers)
    assert get_response.status_code == 200

    update_payload = {"priority": "critical",
                      "description": "Updated description"}
    update_response = client.put(
        f"/recommendations/{rec_id}", json=update_payload, headers=auth_headers
    )
    assert update_response.status_code == 200
    assert update_response.json()["priority"] == "critical"

    list_response = client.get("/recommendations", headers=auth_headers)
    assert list_response.status_code == 200

    delete_response = client.delete(
        f"/recommendations/{rec_id}", headers=auth_headers)
    assert delete_response.status_code == 200


def test_feedback_crud(client, auth_headers):
    feedback_payload = {
        "feedback_type": "accuracy",
        "rating": 4,
        "comments": "Good prediction",
        "flood_occurred": True,
        "actual_severity": 0.7,
    }

    create_response = client.post(
        "/feedback", json=feedback_payload, headers=auth_headers)
    assert create_response.status_code in (200, 201)
    feedback_id = create_response.json()["id"]

    get_response = client.get(
        f"/feedback/{feedback_id}", headers=auth_headers)
    assert get_response.status_code == 200
    assert get_response.json()["rating"] == 4

    update_response = client.put(
        f"/feedback/{feedback_id}",
        json={"rating": 5, "comments": "Excellent prediction"},
        headers=auth_headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["rating"] == 5

    list_response = client.get("/feedback", headers=auth_headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) >= 1

    delete_response = client.delete(
        f"/feedback/{feedback_id}", headers=auth_headers)
    assert delete_response.status_code == 200


def test_unauthorized_access(client):
    assert client.get("/flood-events").status_code == 401
    assert client.post("/flood-events", json={}).status_code == 401


def test_not_found_errors(client, auth_headers):
    assert client.get("/flood-events/99999",
                      headers=auth_headers).status_code == 404
    assert client.get("/recommendations/99999",
                      headers=auth_headers).status_code == 404
    assert client.get("/feedback/99999",
                      headers=auth_headers).status_code == 404
