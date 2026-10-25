"""Run Alembic migrations programmatically."""

from alembic import command
from alembic.config import Config

from app.config import BACKEND_DIR, get_settings


def alembic_config(database_url: str | None = None) -> Config:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.set_main_option("sqlalchemy.url", database_url or get_settings().resolved_database_url())
    return cfg


def upgrade_to_head(database_url: str | None = None) -> None:
    command.upgrade(alembic_config(database_url), "head")
