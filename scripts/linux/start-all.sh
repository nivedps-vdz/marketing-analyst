#!/usr/bin/env bash
# Starts backend and frontend in the background, detached from this terminal, logging to logs/.
# Usage: bash scripts/linux/start-all.sh [--prod]
#   --prod  build the frontend and serve the production build instead of the dev server.
# Stop with: bash scripts/linux/stop-all.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
require_venv
require_node_modules
mkdir -p "$LOGS"

mode=dev
[ "${1:-}" = "--prod" ] && mode=start

bash "$SCRIPT_DIR/stop-all.sh"

if [ "$mode" = start ]; then
  info "Building frontend for production"
  (cd "$FRONTEND" && npm run build) > "$LOGS/frontend-build.log" 2>&1 || die "Build failed; see logs/frontend-build.log"
fi

# setsid gives each server its own session and process group (PID = group ID), so it survives this
# terminal closing and stop-all.sh can stop npm and its node child together.
info "Starting backend on 127.0.0.1:$BACKEND_PORT"
cd "$BACKEND"
setsid nohup "$PY" -m uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" \
  > "$LOGS/backend.log" 2>&1 < /dev/null &
echo $! > "$LOGS/backend.pid"

info "Starting frontend ($mode) on port $FRONTEND_PORT"
cd "$FRONTEND"
setsid nohup npm run "$mode" > "$LOGS/frontend.log" 2>&1 < /dev/null &
echo $! > "$LOGS/frontend.pid"
cd "$ROOT"

status=0
for url in "http://127.0.0.1:$BACKEND_PORT/api/health" "http://127.0.0.1:$FRONTEND_PORT/api/health"; do
  if wait_for_url "$url" 120; then echo "UP   $url"; else echo "DOWN $url"; status=1; fi
done
[ "$status" = 0 ] || die "A server did not start. Check logs/backend.log and logs/frontend.log"
echo "Open http://localhost:$FRONTEND_PORT/dashboard in your Windows browser."
