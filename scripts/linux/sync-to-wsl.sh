#!/usr/bin/env bash
# Copies the project from the Windows drive into the Linux filesystem (default ~/vestadz-marketing-analyst).
# Windows-only folders (node_modules, .venv, .next, logs) are skipped. The local database and .env are
# copied only if the destination does not have them yet, so Linux data is never overwritten.
#
# Usage (from any directory inside WSL):
#   bash /mnt/c/Vestadz/vestadz-marketing-analyst/scripts/linux/sync-to-wsl.sh [destination]
#
# Re-run it after editing code on the Windows side. Once Git is set up, cloning is the better option.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEST="${1:-$HOME/vestadz-marketing-analyst}"

command -v rsync >/dev/null || { echo "rsync missing: sudo apt install rsync" >&2; exit 1; }
[ "$SRC" != "$DEST" ] || { echo "Source and destination are the same: $SRC" >&2; exit 1; }
mkdir -p "$DEST"

echo "Copying $SRC -> $DEST"
rsync -a --delete \
  --exclude 'node_modules/' --exclude '.next/' --exclude 'logs/' \
  --exclude 'backend/.venv/' --exclude 'backend/.venv-linux/' \
  --exclude '__pycache__/' --exclude '.pytest_cache/' --exclude '*.tsbuildinfo' \
  --exclude 'backend/data/' --exclude '.env' \
  "$SRC/" "$DEST/"

# Keep Linux-side data and settings; seed them once from Windows if absent.
[ -f "$DEST/.env" ] || { [ -f "$SRC/.env" ] && cp "$SRC/.env" "$DEST/.env" && echo "Copied .env"; } || true

# Files created on Windows can carry CRLF line endings, which break bash scripts.
find "$DEST/scripts/linux" -name '*.sh' -exec sed -i 's/\r$//' {} + -exec chmod +x {} +

echo "Done. Next:"
echo "  cd $DEST"
echo "  bash scripts/linux/setup.sh --install-deps   # first time"
echo "  bash scripts/linux/start-all.sh"
