def register(client, email="person@example.com"):
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Test Person", "email": email, "password": "strong-password-123"},
    )
    assert response.status_code == 201
    return response.json()


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_register_login_and_me(client):
    result = register(client)
    headers = auth_headers(result["access_token"])
    assert client.get("/api/v1/auth/me", headers=headers).json()["email"] == "person@example.com"
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "person@example.com", "password": "strong-password-123"},
    )
    assert login.status_code == 200
    assert login.json()["token_type"] == "bearer"


def test_duplicate_registration_and_invalid_login(client):
    register(client)
    duplicate = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Another Person",
            "email": "person@example.com",
            "password": "strong-password-123",
        },
    )
    assert duplicate.status_code == 409
    invalid = client.post(
        "/api/v1/auth/login", json={"email": "person@example.com", "password": "wrong-password"}
    )
    assert invalid.status_code == 401


def test_task_crud_search_and_filter(client):
    token = register(client)["access_token"]
    headers = auth_headers(token)
    created = client.post(
        "/api/v1/tasks", headers=headers, json={"title": "Write tests", "description": "API tests"}
    )
    assert created.status_code == 201
    task_id = created.json()["id"]
    assert client.get("/api/v1/tasks?search=Write", headers=headers).json()[0]["id"] == task_id
    updated = client.patch(f"/api/v1/tasks/{task_id}", headers=headers, json={"completed": True})
    assert updated.status_code == 200
    assert updated.json()["completed"] is True
    assert client.get("/api/v1/tasks?completed=false", headers=headers).json() == []
    assert client.delete(f"/api/v1/tasks/{task_id}", headers=headers).status_code == 204
    assert client.get(f"/api/v1/tasks/{task_id}", headers=headers).status_code == 404


def test_tasks_are_private_between_users(client):
    first = auth_headers(register(client, "first@example.com")["access_token"])
    second = auth_headers(register(client, "second@example.com")["access_token"])
    created = client.post("/api/v1/tasks", headers=first, json={"title": "Private task"})
    task_id = created.json()["id"]
    assert client.get(f"/api/v1/tasks/{task_id}", headers=second).status_code == 404
    assert (
        client.patch(
            f"/api/v1/tasks/{task_id}", headers=second, json={"title": "Hijack"}
        ).status_code
        == 404
    )
    assert client.delete(f"/api/v1/tasks/{task_id}", headers=second).status_code == 404


def test_reorder_requires_exact_owned_task_set(client):
    headers = auth_headers(register(client)["access_token"])
    first = client.post("/api/v1/tasks", headers=headers, json={"title": "First"}).json()
    second = client.post("/api/v1/tasks", headers=headers, json={"title": "Second"}).json()
    reordered = client.put(
        "/api/v1/tasks/reorder", headers=headers, json={"task_ids": [second["id"], first["id"]]}
    )
    assert [task["id"] for task in reordered.json()] == [second["id"], first["id"]]
    invalid = client.put("/api/v1/tasks/reorder", headers=headers, json={"task_ids": [first["id"]]})
    assert invalid.status_code == 400


def test_authentication_is_required(client):
    assert client.get("/api/v1/tasks").status_code == 401


def test_task_validation_rejects_blank_and_null_required_fields(client):
    headers = auth_headers(register(client)["access_token"])
    blank = client.post("/api/v1/tasks", headers=headers, json={"title": "   "})
    assert blank.status_code == 400
    created = client.post("/api/v1/tasks", headers=headers, json={"title": "Valid task"})
    task_id = created.json()["id"]
    null_title = client.patch(f"/api/v1/tasks/{task_id}", headers=headers, json={"title": None})
    assert null_title.status_code == 400
