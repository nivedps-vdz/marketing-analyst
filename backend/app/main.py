"""FastAPI application entry point.

Run locally (from backend/):  .venv\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Vestadz Marketing Analyst API",
        version="0.1.0",
        description="Read-only analytics API. Phase 1 serves synthetic demo data.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_methods=["GET"],
        allow_headers=["*"],
    )
    app.include_router(router)
    return app


app = create_app()
