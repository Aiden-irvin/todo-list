from datetime import UTC, datetime, timedelta

import jwt

from app.core.config import settings
from app.core.security import ALGORITHM
from tests.helpers import auth_headers, register, signed_in


def token_for(subject, *, secret=None, expires_in=timedelta(minutes=5)):
    payload = {"sub": subject, "exp": datetime.now(UTC) + expires_in}
    return jwt.encode(payload, secret or settings.secret_key, algorithm=ALGORITHM)


def test_expired_token_is_rejected(client):
    token = token_for("1", expires_in=timedelta(minutes=-1))
    assert client.get("/api/v1/tasks", headers=auth_headers(token)).status_code == 401


def test_malformed_token_is_rejected(client):
    assert client.get("/api/v1/tasks", headers=auth_headers("not-a-jwt")).status_code == 401


def test_token_signed_with_another_secret_is_rejected(client):
    register(client)
    token = token_for("1", secret="a-different-secret-that-is-long-enough-32")
    assert client.get("/api/v1/tasks", headers=auth_headers(token)).status_code == 401


def test_token_with_non_numeric_subject_is_rejected(client):
    assert client.get("/api/v1/tasks", headers=auth_headers(token_for("abc"))).status_code == 401


def test_token_for_deleted_user_is_rejected(client):
    assert client.get("/api/v1/tasks", headers=auth_headers(token_for("999"))).status_code == 401


def test_registration_validation_returns_400(client):
    response = client.post(
        "/api/v1/auth/register", json={"name": "A", "email": "not-an-email", "password": "short"}
    )
    assert response.status_code == 400
    assert {error["loc"][-1] for error in response.json()["detail"]} == {
        "name",
        "email",
        "password",
    }


def test_emails_are_case_insensitive(client):
    register(client, "Person@Example.com")
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "PERSON@example.COM", "password": "strong-password-123"},
    )
    assert login.status_code == 200


def test_login_for_unknown_email_still_verifies_a_password(client, monkeypatch):
    calls = []
    monkeypatch.setattr(
        "app.services.auth.verify_password", lambda *args: calls.append(args) or False
    )
    response = client.post(
        "/api/v1/auth/login", json={"email": "nobody@example.com", "password": "whatever-123"}
    )
    assert response.status_code == 401
    assert calls, "unknown emails must cost the same hashing time as wrong passwords"


def test_me_requires_a_valid_token(client):
    headers = signed_in(client)
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 401
