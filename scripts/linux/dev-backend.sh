#!/usr/bin/env bash
# Runs the FastAPI backend in the foreground with auto-reload on http://127.0.0.1:8000.
# Usage: bash scripts/linux/dev-backend.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
require_venv
cd "$BACKEND"
exec "$PY" -m uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" --reload
