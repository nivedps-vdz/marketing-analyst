"""Application settings loaded from environment variables and the project-root .env file."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'data' / 'vestadz.db').as_posix()}"
    data_mode: Literal["demo", "live"] = "demo"
    frontend_origin: str = "http://localhost:3000"
    reporting_timezone: str = "Asia/Kolkata"

    min_spend: float = 2000.0
    min_impressions: int = 5000
    min_conversions: int = 5

    # Phase 2. Never returned by any endpoint and never logged.
    meta_app_id: str | None = None
    meta_app_secret: str | None = None
    meta_access_token: str | None = None
    meta_api_version: str | None = None

    def resolved_database_url(self) -> str:
        """Resolve relative SQLite paths against the backend directory, not the working directory."""
        prefix = "sqlite:///"
        if self.database_url.startswith(prefix):
            raw = self.database_url[len(prefix):]
            if raw and raw != ":memory:" and not Path(raw).is_absolute():
                return prefix + (BACKEND_DIR / raw).resolve().as_posix()
        return self.database_url


def ensure_sqlite_dir(url: str) -> None:
    prefix = "sqlite:///"
    if url.startswith(prefix) and ":memory:" not in url:
        Path(url[len(prefix):]).parent.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
