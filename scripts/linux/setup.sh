#!/usr/bin/env bash
# One-time setup on Linux / WSL: backend virtualenv and packages, .env, migrations + demo data,
# and frontend packages.
#
# Usage (from the project root inside the Linux filesystem):
#   bash scripts/linux/setup.sh                 # project setup only
#   bash scripts/linux/setup.sh --install-deps  # also install system tools (apt, needs sudo)
#                                               # and Node.js LTS via nvm (per user, no sudo)
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

INSTALL_DEPS=0
for arg in "$@"; do
  case "$arg" in
    --install-deps) INSTALL_DEPS=1 ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    *) die "Unknown option: $arg" ;;
  esac
done

guard_windows_mount

if [ "$INSTALL_DEPS" = 1 ]; then
  info "Installing system packages (sudo apt)"
  sudo apt-get update
  sudo apt-get install -y python3 python3-venv python3-pip curl rsync iproute2 git ca-certificates

  load_node
  if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt "$MIN_NODE_MAJOR" ]; then
    if [ ! -s "$HOME/.nvm/nvm.sh" ]; then
      info "Installing nvm (Node version manager) into ~/.nvm"
      # Official installer from the nvm-sh project, pinned to a release tag.
      curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    fi
    load_node
    info "Installing Node.js LTS with nvm"
    nvm_run install --lts
    nvm_run alias default 'lts/*'
  fi
fi

bash "$SCRIPT_DIR/check-tools.sh" || die "Fix the missing tools above, or re-run with --install-deps."
load_node

info "Backend: virtualenv at backend/.venv-linux"
[ -x "$PY" ] || python3 -m venv "$VENV"
"$PY" -m pip install --upgrade pip
"$PY" -m pip install -r "$BACKEND/requirements.txt"

if [ ! -f "$ROOT/.env" ]; then
  info "Creating .env from .env.example (demo mode, no secrets)"
  cp "$ROOT/.env.example" "$ROOT/.env"
fi
# .env may have been created on Windows; strip CR characters so values parse cleanly.
sed -i 's/\r$//' "$ROOT/.env"

info "Backend: migrations and demo data"
(cd "$BACKEND" && "$PY" -m app.demo.seed)

info "Frontend: packages"
cd "$FRONTEND"
if [ -f package-lock.json ]; then
  npm ci || { warn "npm ci failed; falling back to npm install"; npm install; }
else
  npm install
fi

info "Setup complete."
echo "Start both servers:   bash scripts/linux/start-all.sh"
echo "Or in two terminals:  bash scripts/linux/dev-backend.sh   and   bash scripts/linux/dev-frontend.sh"
echo "Then open http://localhost:$FRONTEND_PORT/dashboard in your Windows browser."
