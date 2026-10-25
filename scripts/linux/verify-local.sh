#!/usr/bin/env bash
# Checks that every page route and key API endpoints respond through the frontend proxy.
# Usage (servers running): bash scripts/linux/verify-local.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
set +e

base="http://127.0.0.1:$FRONTEND_PORT"
ok=1
check() {
  local path="$1" expected="$2" code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$base$path")
  if [ "$code" = "$expected" ]; then echo "OK   $code $path"; else echo "FAIL $code $path (expected $expected)"; ok=0; fi
}

for r in /dashboard /clients /clients/1 /campaigns /ads /creative-intelligence /competitors /reports /automations /settings; do
  check "$r" 200
done
for r in /api/health /api/meta /api/overview/summary /api/overview/clients /api/clients/1/ads; do
  check "$r" 200
done
check /api/clients/999/summary 404   # unknown client must not leak data

if [ "$ok" = 1 ]; then echo "ALL ROUTES OK"; else echo "SOME ROUTES FAILED"; exit 1; fi
