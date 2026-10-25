# Implementation Tasks

Phase 1 only is broken into tasks. Later phases get task lists when they start.

## Phase 0: Prerequisites (blocking)

- [ ] 0.1 Install toolchain: Node.js LTS, Python 3.12, Git (via winget, with user approval)
- [ ] 0.2 Confirm project location (OneDrive vs a non-synced folder such as `C:\dev`)
- [ ] 0.3 Receive the Vestadz CRM screenshot and logo asset; refine design tokens
- [ ] 0.4 `git init`, `.gitignore`, `.env.example`, README skeleton

## Phase 1: Branded UI and dashboard (synthetic data)

### Backend
- [ ] 1.1 Scaffold FastAPI app, config (pydantic-settings), CORS, `127.0.0.1` binding, `requirements.txt` _(R9)_
- [ ] 1.2 SQLAlchemy models and initial Alembic migration with unique constraints _(design §4)_
- [ ] 1.3 Analytics core: `safe_div`, ratios, aggregation, conversion-type handling, currency check, previous period, change direction + unit tests _(R5, R3.2–3.4)_
- [ ] 1.4 Deterministic demo data generator with edge cases + seed script + tests for determinism _(R2, design §9)_
- [ ] 1.5 Client scoping dependency and overview/client endpoints + API tests for isolation, date validation and filtering _(R4.1, R3, R4)_
- [ ] 1.6 Rankings and insights services + tests _(R6)_
- [ ] 1.7 Search endpoint _(R1.3)_

### Frontend
- [ ] 1.8 Scaffold Next.js + TypeScript + Tailwind; design tokens; font; API proxy rewrite _(R1.4)_
- [ ] 1.9 UI primitives: Card, Button, Badge, Tabs, Select, Table, Skeleton, EmptyState, ErrorState _(R8)_
- [ ] 1.10 App shell: Sidebar (active state, collapsible drawer), Header (search, date range, platform, activity, profile), Demo badge, logo placeholder _(R1, R2.1)_
- [ ] 1.11 Chart components: ChartCard, TimeSeries, DualAxis, BarComparison, Sparkline _(R3.6)_
- [ ] 1.12 Dashboard page: KPI grid, nine charts, client cards _(R3)_
- [ ] 1.13 Clients list page and client analytics page with seven tabs _(R4)_
- [ ] 1.14 Campaigns table with drill-down to ad sets and ads; ad gallery with sorting; ad detail drawer _(R4.4–4.7)_
- [ ] 1.15 Client charts with campaign and format filters _(R4.8–4.9)_
- [ ] 1.16 Top-level Campaigns and Ads pages (cross-client, client column) _(R1.1)_
- [ ] 1.17 Creative Intelligence layout; Competitors, Reports, Automations, Settings placeholders with phase labels _(R7, R1.7)_
- [ ] 1.18 Frontend tests: formatters, KpiCard, Sidebar _(design §12)_

### Verification
- [ ] 1.19 PowerShell scripts: setup, dev-backend, dev-frontend, seed-demo, test _(R9.1)_
- [ ] 1.20 Run all tests; run both servers; manually check each page at desktop and narrow widths
- [ ] 1.21 Write `docs/setup.md`, `docs/metrics.md`, `docs/api-limitations.md`, `docs/test-results.md` with actual results
