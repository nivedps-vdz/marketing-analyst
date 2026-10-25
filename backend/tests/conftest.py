import shutil
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings, get_settings
from app.db.migrate import upgrade_to_head
from app.db.session import get_db, make_engine
from app.main import app

TEST_SETTINGS = Settings(
    _env_file=None,
    data_mode="demo",
    min_spend=2000,
    min_impressions=5000,
    min_conversions=5,
)


@pytest.fixture(scope="session")
def migrated_template(tmp_path_factory) -> str:
    """A database file migrated once with Alembic and copied for each test."""
    path = tmp_path_factory.mktemp("template") / "template.db"
    upgrade_to_head(f"sqlite:///{path.as_posix()}")
    return str(path)


@pytest.fixture
def db(tmp_path, migrated_template) -> Iterator[Session]:
    path = tmp_path / "test.db"
    shutil.copy(migrated_template, path)
    engine = make_engine(f"sqlite:///{path.as_posix()}")
    session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def api(db) -> Iterator[TestClient]:
    def _db():
        yield db

    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_settings] = lambda: TEST_SETTINGS
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
