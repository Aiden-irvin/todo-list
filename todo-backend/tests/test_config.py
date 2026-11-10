import pytest
from pydantic import ValidationError

from app.core.config import Settings

PLACEHOLDERS = [
    "development-only-change-me-32chars-minimum",
    "replace-this-with-a-long-random-secret-before-deploying",
]


@pytest.mark.parametrize("secret", PLACEHOLDERS)
def test_production_rejects_placeholder_secrets(secret):
    with pytest.raises(ValidationError, match="unique SECRET_KEY"):
        Settings(_env_file=None, environment="production", secret_key=secret)


def test_production_accepts_a_real_secret():
    settings = Settings(_env_file=None, environment="production", secret_key="x" * 48)
    assert settings.environment == "production"


@pytest.mark.parametrize("secret", PLACEHOLDERS)
def test_development_allows_placeholder_secrets(secret):
    assert Settings(_env_file=None, environment="development", secret_key=secret)


def test_short_secret_is_rejected():
    with pytest.raises(ValidationError, match="at least 32"):
        Settings(_env_file=None, secret_key="short")


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("http://localhost:5173", ["http://localhost:5173"]),
        ("http://a.test, http://b.test", ["http://a.test", "http://b.test"]),
        ('["http://a.test", "http://b.test"]', ["http://a.test", "http://b.test"]),
    ],
)
def test_cors_origins_accept_comma_separated_or_json(monkeypatch, raw, expected):
    monkeypatch.setenv("CORS_ORIGINS", raw)
    assert Settings(_env_file=None).cors_origins == expected


def test_env_example_is_loadable():
    assert Settings(_env_file=".env.example").cors_origins == ["http://localhost:5173"]
