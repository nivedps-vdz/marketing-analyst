#!/usr/bin/env bash
# Stops this project's backend and frontend servers. A process is stopped only if its working directory
# is inside this project, so stale PID files or other programs on ports 8000/3000 are never touched.
# Usage: bash scripts/linux/stop-all.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
set +e

group_alive() { kill -0 -- "-$1" 2>/dev/null || kill -0 "$1" 2>/dev/null; }

stop_pid() {
  local pid="$1" label="$2"
  [ -n "$pid" ] || return 0
  kill -0 "$pid" 2>/dev/null || return 0
  if ! belongs_to_project "$pid"; then
    echo "Skipping PID $pid ($label): not a process of this project."
    return 0
  fi
  echo "Stopping $label (PID $pid)"
  # start-all.sh uses setsid, so the PID leads its own process group (npm -> node); stop the group.
  kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
  for _ in 1 2 3 4 5 6 7 8; do group_alive "$pid" || return 0; sleep 1; done
  kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null
}

for name in backend frontend; do
  f="$LOGS/$name.pid"
  if [ -f "$f" ]; then stop_pid "$(cat "$f")" "$name"; rm -f "$f"; fi
done

# Leftovers (e.g. servers started with dev-*.sh, or a node child that outlived npm).
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  for pid in $(port_pids "$port"); do
    if belongs_to_project "$pid"; then
      stop_pid "$pid" "process on port $port"
    else
      echo "Port $port is used by another program (PID $pid); not stopping it."
    fi
  done
done
exit 0
