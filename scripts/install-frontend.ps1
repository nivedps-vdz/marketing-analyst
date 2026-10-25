# Installs frontend dependencies (used once during project creation; afterwards use `npm install`).
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
$root = Split-Path -Parent $PSScriptRoot
Set-Location "$root\frontend"
npm install next react react-dom @tanstack/react-query recharts lucide-react radix-ui clsx
npm install -D typescript @types/react @types/react-dom @types/node tailwindcss @tailwindcss/postcss postcss vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom
