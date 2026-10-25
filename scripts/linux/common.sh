#!/usr/bin/env bash
# Shared helpers for the Linux / WSL scripts. Sourced by the other scripts, not run directly.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
LOGS="$ROOT/logs"
# Separate from the Windows virtualenv (backend/.venv) so both can live in one checkout if needed.
VENV="$BACKEND/.venv-linux"
PY="$VENV/bin/python"

BACKEND_PORT=8000
FRONTEND_PORT=3000
MIN_PYTHON="3.10"
MIN_NODE_MAJOR=20

info() { printf '\033[1;35m==\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mWARN\033[0m %s\n' "$*" >&2; }
die() { printf '\033[1;31mERROR\033[0m %s\n' "$*" >&2; exit 1; }

# nvm installs Node per user and is only loaded by interactive shells; load it here too.
load_node() {
  if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    # nvm is not compatible with `set -eu`; relax it while nvm runs.
    set +eu
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh" >/dev/null
    set -eu
  fi
}

# Run an nvm command with `set -eu` relaxed.
nvm_run() {
  set +eu
  nvm "$@"
  local rc=$?
  set -eu
  return $rc
}

# True if the process's working directory is inside this project (used before stopping anything).
belongs_to_project() {
  local cwd
  cwd=$(readlink "/proc/$1/cwd" 2>/dev/null) || return 1
  case "$cwd" in "$ROOT"|"$ROOT"/*) return 0 ;; *) return 1 ;; esac
}

on_windows_mount() {
  case "$ROOT" in /mnt/[a-z]/*) return 0 ;; *) return 1 ;; esac
}

# Windows and Linux need different node_modules (native binaries). Installing Linux packages into the
# Windows checkout would break the Windows setup, and /mnt/c is also much slower under WSL.
guard_windows_mount() {
  if on_windows_mount && [ "${ALLOW_WINDOWS_MOUNT:-0}" != "1" ]; then
    die "This checkout is on the Windows drive ($ROOT).
Copy it into the Linux filesystem first:
  bash \"$SCRIPT_DIR/sync-to-wsl.sh\"
then run the script from ~/vestadz-marketing-analyst.
(Set ALLOW_WINDOWS_MOUNT=1 to override; this replaces the Windows node_modules.)"
  fi
}

require_venv() {
  [ -x "$PY" ] || die "Backend environment missing. Run: bash scripts/linux/setup.sh"
}

require_node_modules() {
  load_node
  command -v npm >/dev/null 2>&1 || die "npm not found. Run: bash scripts/linux/setup.sh --install-deps"
  [ -d "$FRONTEND/node_modules" ] || die "Frontend packages missing. Run: bash scripts/linux/setup.sh"
}

# PIDs listening on a TCP port (needs ss from iproute2; present on Ubuntu).
port_pids() {
  ss -ltnpH "sport = :$1" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u || true
}

wait_for_url() {
  local url="$1" tries="${2:-90}"
  for _ in $(seq "$tries"); do
    if curl -fsS -o /dev/null --max-time 3 "$url"; then return 0; fi
    sleep 1
  done
  return 1
}
