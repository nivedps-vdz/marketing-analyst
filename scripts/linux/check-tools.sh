#!/usr/bin/env bash
# Reports which tools are available and whether their versions are new enough.
# Usage: bash scripts/linux/check-tools.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
set +e
load_node

ok=1
report() { printf '%-8s %s\n' "$1" "$2"; }

if command -v python3 >/dev/null; then
  v=$(python3 -c 'import sys; print("%d.%d.%d" % sys.version_info[:3])')
  if python3 -c "import sys; sys.exit(0 if sys.version_info >= tuple(map(int, '$MIN_PYTHON'.split('.'))) else 1)"; then
    report python3 "$v"
  else
    report python3 "$v (need >= $MIN_PYTHON)"; ok=0
  fi
  if python3 -c 'import venv, ensurepip' 2>/dev/null; then report venv "ok"; else report venv "MISSING (sudo apt install python3-venv)"; ok=0; fi
else
  report python3 MISSING; ok=0
fi

if command -v node >/dev/null; then
  v=$(node --version)
  major=${v#v}; major=${major%%.*}
  if [ "$major" -ge "$MIN_NODE_MAJOR" ]; then report node "$v"; else report node "$v (need >= v$MIN_NODE_MAJOR)"; ok=0; fi
  report npm "$(npm --version)"
else
  report node "MISSING"; ok=0
fi

for c in curl ss rsync git; do
  if command -v "$c" >/dev/null; then report "$c" ok; else report "$c" MISSING; [ "$c" = git ] || ok=0; fi
done

echo "project: $ROOT"
on_windows_mount && warn "Project is on the Windows drive; copy it with scripts/linux/sync-to-wsl.sh"

if [ "$ok" = 1 ]; then echo "TOOLS OK"; else echo "TOOLS MISSING. Run: bash scripts/linux/setup.sh --install-deps"; exit 1; fi
