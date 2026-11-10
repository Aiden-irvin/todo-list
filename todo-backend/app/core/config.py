import json
from functools import lru_cache
from typing import Annotated

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

PLACEHOLDER_SECRETS = {
    "development-only-change-me-32chars-minimum",
    "replace-this-with-a-long-random-secret-before-deploying",
}


class Settings(BaseSettings):
    app_name: str = "Todo API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    secret_key: str = "development-only-change-me-32chars-minimum"
    access_token_expire_minutes: int = 30
    database_url: str = "sqlite:///./todo.db"
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.environment == "production" and self.secret_key in PLACEHOLDER_SECRETS:
            raise ValueError("Set a unique SECRET_KEY before running in production")
        return self

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        if value.strip().startswith("["):
            return json.loads(value)
        return [origin.strip() for origin in value.split(",") if origin.strip()]

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("SECRET_KEY must contain at least 32 characters")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
