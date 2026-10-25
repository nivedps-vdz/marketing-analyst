#!/usr/bin/env bash
# Runs backend (pytest) and frontend (type-check + vitest) tests.
# Usage: bash scripts/linux/test.sh [--backend-only | --frontend-only]
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
set +e

run_backend=1 run_frontend=1
case "${1:-}" in
  --backend-only) run_frontend=0 ;;
  --frontend-only) run_backend=0 ;;
  "") ;;
  *) die "Unknown option: $1" ;;
esac

failed=0
if [ "$run_backend" = 1 ]; then
  require_venv
  info "Backend tests (pytest)"
  (cd "$BACKEND" && "$PY" -m pytest -p no:cacheprovider) || failed=1
fi
if [ "$run_frontend" = 1 ]; then
  require_node_modules
  info "Frontend type-check"
  (cd "$FRONTEND" && npm run --silent typecheck) || failed=1
  info "Frontend tests (vitest)"
  (cd "$FRONTEND" && npm run --silent test) || failed=1
fi

if [ "$failed" = 0 ]; then echo "ALL TESTS PASSED"; else echo "TESTS FAILED"; exit 1; fi
