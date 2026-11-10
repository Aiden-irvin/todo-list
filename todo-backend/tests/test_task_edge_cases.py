from tests.helpers import create_task, signed_in


def test_missing_task_returns_404_for_every_verb(client):
    headers = signed_in(client)
    assert client.get("/api/v1/tasks/999", headers=headers).status_code == 404
    assert (
        client.patch("/api/v1/tasks/999", headers=headers, json={"title": "x"}).status_code == 404
    )
    assert client.delete("/api/v1/tasks/999", headers=headers).status_code == 404


def test_delete_returns_204_with_empty_body_then_404(client):
    headers = signed_in(client)
    task = create_task(client, headers)
    response = client.delete(f"/api/v1/tasks/{task['id']}", headers=headers)
    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/api/v1/tasks/{task['id']}", headers=headers).status_code == 404


def test_completed_filter(client):
    headers = signed_in(client)
    create_task(client, headers, title="open")
    done = create_task(client, headers, title="done")
    client.patch(f"/api/v1/tasks/{done['id']}", headers=headers, json={"completed": True})
    only_done = client.get("/api/v1/tasks?completed=true", headers=headers).json()
    only_open = client.get("/api/v1/tasks?completed=false", headers=headers).json()
    assert [task["title"] for task in only_done] == ["done"]
    assert [task["title"] for task in only_open] == ["open"]


def test_new_tasks_are_appended_in_order(client):
    headers = signed_in(client)
    for title in ("a", "b", "c"):
        create_task(client, headers, title=title)
    tasks = client.get("/api/v1/tasks", headers=headers).json()
    assert [(task["title"], task["position"]) for task in tasks] == [("a", 0), ("b", 1), ("c", 2)]


def test_search_treats_percent_and_underscore_literally(client):
    headers = signed_in(client)
    for title in ("50% done", "500 done", "a_b", "axb"):
        create_task(client, headers, title=title)

    def search(term):
        response = client.get("/api/v1/tasks", headers=headers, params={"search": term})
        return [task["title"] for task in response.json()]

    assert search("50%") == ["50% done"]
    assert search("a_b") == ["a_b"]


def test_search_is_case_insensitive_and_scoped_to_the_user(client):
    mine = signed_in(client, "mine@example.com")
    theirs = signed_in(client, "theirs@example.com")
    create_task(client, mine, title="Buy Milk")
    create_task(client, theirs, title="Buy milk too")
    results = client.get("/api/v1/tasks?search=MILK", headers=mine).json()
    assert [task["title"] for task in results] == ["Buy Milk"]


def test_reorder_rejects_duplicates_and_unknown_ids(client):
    headers = signed_in(client)
    first = create_task(client, headers)["id"]
    second = create_task(client, headers)["id"]

    def reorder(ids):
        return client.put("/api/v1/tasks/reorder", headers=headers, json={"task_ids": ids})

    assert reorder([first, first]).status_code == 400
    assert reorder([first, second, 9999]).status_code == 400
    assert reorder([second]).status_code == 400


def test_reorder_persists_the_new_order(client):
    headers = signed_in(client)
    ids = [create_task(client, headers, title=str(n))["id"] for n in range(3)]
    reordered = client.put(
        "/api/v1/tasks/reorder", headers=headers, json={"task_ids": ids[::-1]}
    ).json()
    assert [task["id"] for task in reordered] == ids[::-1]
    listed = client.get("/api/v1/tasks", headers=headers).json()
    assert [task["id"] for task in listed] == ids[::-1]


def test_validation_errors_return_400_with_field_details(client):
    headers = signed_in(client)
    for payload in ({"title": ""}, {"title": "   "}, {"title": "x" * 201}, {}):
        response = client.post("/api/v1/tasks", headers=headers, json=payload)
        assert response.status_code == 400, payload
        assert isinstance(response.json()["detail"], list)


def test_empty_update_is_rejected(client):
    headers = signed_in(client)
    task = create_task(client, headers)
    response = client.patch(f"/api/v1/tasks/{task['id']}", headers=headers, json={})
    assert response.status_code == 400


def test_due_date_can_be_set_and_cleared(client):
    headers = signed_in(client)
    task = create_task(client, headers)
    url = f"/api/v1/tasks/{task['id']}"
    set_date = client.patch(url, headers=headers, json={"due_date": "2026-03-05T00:00:00Z"})
    assert set_date.json()["due_date"].startswith("2026-03-05")
    cleared = client.patch(url, headers=headers, json={"due_date": None})
    assert cleared.json()["due_date"] is None


def test_pagination_is_optional_and_applies_to_the_ordered_list(client):
    headers = signed_in(client)
    for n in range(5):
        create_task(client, headers, title=str(n))
    assert len(client.get("/api/v1/tasks", headers=headers).json()) == 5
    page = client.get("/api/v1/tasks?limit=2&offset=1", headers=headers).json()
    assert [task["title"] for task in page] == ["1", "2"]
    assert client.get("/api/v1/tasks?limit=0", headers=headers).status_code == 400
    assert client.get("/api/v1/tasks?offset=-1", headers=headers).status_code == 400


def test_health_check(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_update_rejects_null_and_blank_values(client):
    headers = signed_in(client)
    url = f"/api/v1/tasks/{create_task(client, headers)['id']}"
    for payload in ({"title": None}, {"title": "  "}, {"description": None}, {"completed": None}):
        assert client.patch(url, headers=headers, json=payload).status_code == 400, payload
