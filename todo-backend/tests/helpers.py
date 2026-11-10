def register(client, email="person@example.com"):
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Test Person", "email": email, "password": "strong-password-123"},
    )
    assert response.status_code == 201
    return response.json()


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def signed_in(client, email="person@example.com"):
    return auth_headers(register(client, email)["access_token"])


def create_task(client, headers, **payload):
    payload.setdefault("title", "Task")
    response = client.post("/api/v1/tasks", headers=headers, json=payload)
    assert response.status_code == 201
    return response.json()
