#!/usr/bin/env bash
# Runs the Next.js dev server in the foreground on http://localhost:3000. Start the backend first.
# Usage: bash scripts/linux/dev-frontend.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
require_node_modules
cd "$FRONTEND"
exec npm run dev
