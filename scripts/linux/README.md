# Running on Ubuntu (WSL2)

These scripts do the same jobs as the PowerShell scripts in `scripts/`.

| Linux (bash) | Windows (PowerShell) | Purpose |
|---|---|---|
| `sync-to-wsl.sh` | none | Copy the project from `C:\` into the Linux filesystem |
| `check-tools.sh` | `check-tools.ps1` | Check Python, Node and other tools |
| `setup.sh [--install-deps]` | `setup.ps1` | Virtualenv, packages, `.env`, migrations, demo data |
| `dev-backend.sh` | `dev-backend.ps1` | Backend with auto-reload (foreground) |
| `dev-frontend.sh` | `dev-frontend.ps1` | Frontend dev server (foreground) |
| `start-all.sh [--prod]` | `start-all.ps1` | Both servers in the background, logs in `logs/` |
| `stop-all.sh` | `stop-all.ps1` | Stop both servers |
| `seed-demo.sh` | `seed-demo.ps1` | Regenerate demo data ending yesterday |
| `test.sh` | `test.ps1` | Backend and frontend tests |
| `verify-local.sh` | `verify-local.ps1` | Check every page and key API routes |

## First run

Open the Ubuntu terminal:

```bash
bash /mnt/c/Vestadz/vestadz-marketing-analyst/scripts/linux/sync-to-wsl.sh
cd ~/vestadz-marketing-analyst
bash scripts/linux/setup.sh --install-deps
bash scripts/linux/start-all.sh
```

Then open http://localhost:3000/dashboard in your Windows browser. WSL2 forwards `localhost` to Ubuntu.

## Notes

- **Why copy the project instead of running from `/mnt/c`:** Linux and Windows need different
  `node_modules` (native binaries), and file access on `/mnt/c` is much slower under WSL. The scripts
  refuse to install into the Windows checkout unless you set `ALLOW_WINDOWS_MOUNT=1`.
- **Separate environments:** the Linux copy uses `backend/.venv-linux`, its own `node_modules`, and its
  own database at `backend/data/vestadz.db`. Windows and Ubuntu do not share data.
- **Editing code:** if you edit on the Windows side, re-run `sync-to-wsl.sh` to copy the changes over.
  It never overwrites the Linux `.env` or database. Once the project is in Git, clone it inside Ubuntu instead.
- **One side at a time:** don't run the Windows and Ubuntu servers together. Both use ports 3000 and 8000.
  Run `scripts\stop-all.ps1` on Windows first.
- **What `--install-deps` changes:** it installs `python3-venv`, `pip`, `curl`, `rsync`, `iproute2` and
  `git` with `sudo apt`, and Node.js LTS via nvm in `~/.nvm` (no sudo). Ubuntu's own Node package is too
  old for Next.js 16.
