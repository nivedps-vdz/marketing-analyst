#!/usr/bin/env bash
# Applies migrations and regenerates synthetic demo data ending yesterday (Asia/Kolkata).
# Only demo clients are replaced. Extra arguments are passed through, e.g. --end 2026-10-24
# Usage: bash scripts/linux/seed-demo.sh [--end YYYY-MM-DD] [--seed N]
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
require_venv
cd "$BACKEND"
exec "$PY" -m app.demo.seed "$@"
