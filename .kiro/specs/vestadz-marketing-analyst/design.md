# Design: Vestadz AI Marketing Analyst

Status: Draft for review.

## 1. Architecture

```
Browser (Next.js UI, port 3000)
   │  fetch JSON via Next.js rewrite /api/* → http://127.0.0.1:8000/api/*
   ▼
FastAPI backend (port 8000, bound to 127.0.0.1)
   ├── api/            HTTP routes, request validation, client scoping
   ├── analytics/      pure functions: aggregation, ratios, comparisons, rankings
   ├── services/       orchestration: queries + analytics → response DTOs
   ├── db/ + models/   SQLAlchemy 2.0 models, Alembic migrations, SQLite file
   ├── integrations/   platform adapters (meta/ in Phase 2, google_ads/ later)
   ├── competitors/, intelligence/, reports/, scheduler/   (later phases)
   └── demo/           deterministic synthetic data generator
```

Principles:

- The analytics layer is pure Python with no database or HTTP dependency, so every formula is unit-testable.
- The frontend never computes business metrics. It formats values the backend returns. This keeps one source of truth for ratios and null handling.
- Platform adapters write into a normalized schema. Shared code depends on the normalized schema only.
- The backend binds to `127.0.0.1` so it is not reachable from the local network.

## 2. Technology choices

| Concern | Choice | Reason |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | Requested; file-based routing matches the page list |
| Styling | Tailwind CSS with CSS-variable design tokens | Requested; tokens defined once |
| Accessible primitives | Radix UI primitives (via shadcn/ui-style local components) | Free, accessible, components live in the repo |
| Icons | lucide-react | Simple, consistent line icons similar to the CRM |
| Charts | Recharts | Requested |
| Data fetching | TanStack Query | Caching, loading and error states, retries |
| Frontend tests | Vitest + Testing Library | Fast, works on Windows |
| Backend | FastAPI, Pydantic v2 | Requested |
| ORM / migrations | SQLAlchemy 2.0, Alembic | Requested |
| Backend tests | Pytest + FastAPI TestClient | Requested |
| Scheduler (Phase 4) | APScheduler inside a worker process, optionally launched by Windows Task Scheduler | Decided in Phase 4 |

Exact versions are pinned at install time and recorded in `docs/setup.md`.

## 3. Directory structure

```
vestadz-marketing-analyst/
├── frontend/
│   ├── app/
│   │   ├── layout.tsx                 shell: sidebar + header
│   │   ├── dashboard/page.tsx
│   │   ├── clients/page.tsx
│   │   ├── clients/[clientId]/page.tsx   tabs
│   │   ├── campaigns/  ads/  creative-intelligence/  competitors/
│   │   ├── reports/  automations/  settings/
│   ├── components/
│   │   ├── layout/    Sidebar, Header, DateRangePicker, PlatformSelect, DemoBadge
│   │   ├── ui/        Card, Button, Tabs, Select, Table, Badge, Skeleton, EmptyState, ErrorState
│   │   ├── charts/    TimeSeriesChart, DualAxisChart, BarComparison, Sparkline, ChartCard
│   │   └── analytics/ KpiCard, KpiGrid, ClientCard, CampaignTable, AdCard, AdGallery, AdDetail
│   ├── lib/           api client, types, formatters, date-range state, design tokens
│   └── public/brand/  logo (placeholder until supplied)
├── backend/
│   ├── app/
│   │   ├── main.py  config.py
│   │   ├── api/  models/  schemas/  db/  services/  analytics/
│   │   ├── integrations/meta/  integrations/google_ads/   (README stubs in Phase 1)
│   │   ├── competitors/  intelligence/  reports/  scheduler/  (stubs)
│   │   └── demo/
│   ├── alembic/  alembic.ini
│   ├── tests/
│   └── requirements.txt
├── docs/          setup.md, architecture.md, metrics.md, api-limitations.md, test-results.md
├── scripts/       setup.ps1, dev-backend.ps1, dev-frontend.ps1, seed-demo.ps1, test.ps1
├── .kiro/specs/  .kiro/steering/
├── .env.example  .gitignore  README.md
```

## 4. Data model (normalized, platform-neutral)

All monetary amounts are stored as decimal strings/`Numeric(14,2)` with a currency code on the ad account. Every performance row carries `client_id` (denormalized) so client scoping is a single indexed filter.

| Table | Key columns | Constraints |
|---|---|---|
| `clients` | id, slug, name, category, industry, geography, is_demo | unique(slug) |
| `ad_accounts` | id, client_id, platform (`meta`/`google_ads`), external_id, name, currency, timezone, connection_status, last_synced_at | unique(platform, external_id) |
| `campaigns` | id, client_id, ad_account_id, external_id, name, objective, primary_conversion_type, status | unique(ad_account_id, external_id) |
| `ad_sets` | id, client_id, campaign_id, external_id, name, status, optimization_goal | unique(campaign_id, external_id) |
| `creatives` | id, client_id, ad_account_id, external_id, format (`image`/`video`/`carousel`/`other`/`unknown`), aspect_ratio, is_vertical_video, thumbnail_url, headline, body, call_to_action | unique(ad_account_id, external_id) |
| `ads` | id, client_id, ad_set_id, campaign_id, creative_id, external_id, name, status, placements (JSON list or null) | unique(ad_set_id, external_id) |
| `daily_ad_metrics` | client_id, ad_id, date, spend, impressions, reach, clicks, link_clicks | unique(ad_id, date) |
| `daily_ad_conversions` | client_id, ad_id, date, conversion_type, attribution_setting, count, value | unique(ad_id, date, conversion_type, attribution_setting) |
| `platform_fields` | entity, entity_id, platform, key, value (JSON) | preserves platform-specific fields |

Phase 2+ tables (`sync_runs`, `sync_errors`, `competitors`, `creative_observations`, `job_runs`, `activity_events`) are designed then.

`placements` is separate from `creatives.format`. Reels compatibility is derived from `is_vertical_video` plus placement data, never from format alone.

Upserts use SQLite `INSERT ... ON CONFLICT DO UPDATE` keyed on the unique constraints, making re-syncs idempotent.

## 5. Metric rules (implemented in `analytics/metrics.py`)

- Ratios are computed from summed base metrics for the requested grain. Daily ratios are never averaged.
- `safe_div(n, d)` returns `None` when `d` is 0 or either side is `None`.
- **Reach** cannot be summed across days or entities because Meta de-duplicates per query. In Phase 1, aggregate reach is returned with `reach_is_estimate: true` and labelled "Sum of daily reach (overcounts unique people)". In Phase 2, period-level reach is fetched with a period query and stored separately.
- **Conversions** are grouped by `conversion_type`. Each campaign has a `primary_conversion_type` derived from its objective (`OUTCOME_LEADS` → `lead`, `OUTCOME_SALES` → `purchase`, `OUTCOME_TRAFFIC`/`OUTCOME_AWARENESS`/`OUTCOME_ENGAGEMENT` → none).
  - "Results" for a campaign or ad = conversions of its campaign's primary type.
  - Dashboard CPA for type T = spend of campaigns whose primary type is T ÷ conversions of type T in those campaigns. The card label names the type.
  - ROAS = purchase conversion value ÷ spend of purchase-objective campaigns. Labelled accordingly.
- **Currency**: if a selection spans more than one currency, monetary totals return `null` with reason `mixed_currency`.
- **Previous period**: same number of days, ending the day before the selected start. Percent change is `null` when the previous value is `null` or 0.
- **Favourable direction** per metric: up is good for spend-neutral counts, CTR, conversions, value and ROAS; down is good for CPC, CPM and CPA. Spend change is shown neutral (grey).

Every metric in a response is `{ value, unavailable_reason }`, so the UI can display "Not available: no purchase campaigns" instead of 0.

## 6. Ranking and insights (`analytics/rankings.py`, `analytics/insights.py`)

Rankings (per client, per period):

| Ranking | Sort | Eligibility |
|---|---|---|
| Highest ROAS | ROAS desc | purchase-objective, spend ≥ min_spend, purchases ≥ min_conversions |
| Lowest CPA | CPA asc | has primary type, spend ≥ min_spend, results ≥ min_conversions |
| Most results | results desc | has primary type |
| Highest CTR | CTR desc | impressions ≥ min_impressions; labelled "engagement signal, not a performance verdict" |

Default thresholds (configurable in settings later): `min_spend = 2000 INR`, `min_impressions = 5000`, `min_conversions = 5`. Ads failing thresholds go into "Needs more data".

Insight rules (deterministic templates):

- **Budget without results**: campaign with primary type, spend ≥ 3 × min_spend, results < min_conversions.
- **Declining efficiency**: ad with sufficient data in both halves of the period where CPA rose ≥ 30% or ROAS fell ≥ 30%, and CTR also fell. Worded as "efficiency declined", never "fatigued".
- **Format worth testing**: format whose aggregate CPA is ≥ 20% better than the client's overall CPA with sufficient data, while holding < 30% of spend.
- **Top converters / efficient ads**: from the rankings above.

Each insight returns `kind`, `severity`, `entity`, `evidence` (numbers used) and `basis: "calculated"`.

## 7. API (Phase 1)

All endpoints are `GET`, accept `start` and `end` (ISO dates, validated, max 400 days, start ≤ end), and return `data_source`.

| Endpoint | Purpose |
|---|---|
| `/api/health` | liveness |
| `/api/meta` | data source, available conversion types, currencies, date bounds |
| `/api/search?q=` | clients, campaigns, ads by name or ID (min 2 chars) |
| `/api/overview/summary` | KPIs + previous period, optional `client_ids`, `platform` |
| `/api/overview/timeseries` | daily base metrics and ratios |
| `/api/overview/clients` | client cards with sparkline series |
| `/api/overview/campaign-ranking` | top campaigns across clients |
| `/api/overview/formats` | metrics by creative format |
| `/api/clients/{id}` | client profile and ad accounts |
| `/api/clients/{id}/summary`, `/timeseries`, `/formats` | as above, scoped; optional `campaign_id`, `format` |
| `/api/clients/{id}/campaigns`, `/adsets`, `/ads` | tables and gallery; `sort`, `order`, filters |
| `/api/clients/{id}/ads/{ad_id}` | ad detail + daily series |
| `/api/clients/{id}/rankings`, `/insights` | analysis outputs |

**Client scoping:** every `/api/clients/{id}/...` route depends on `get_scoped_client`, which loads the client and raises 404 if absent or not permitted. Child IDs (`campaign_id`, `ad_id`) are looked up with `client_id` in the filter, so an ad from another client returns 404. Phase 1 has a single local user with access to all clients. The dependency is the seam where per-user grants are added when hosting is considered.

## 8. Frontend design system

Tokens (CSS variables consumed by Tailwind):

```
--brand: #AE0079        --brand-soft: #FCE7F3 (selected nav bg)
--text: #26354D         --text-muted: #6B7A90
--bg: #F4F6FA           --card: #FFFFFF        --border: #E5E8EF
--positive: #16A34A     --negative: #DC2626    --neutral: #94A3B8
radius: 12px cards, 8px controls; shadow: 0 1px 2px rgba(16,24,40,.06)
font: Inter (self-hosted via next/font) fallback system-ui
```

These are approximations until the CRM screenshot is reviewed.

Chart palette: magenta first, then navy, teal, amber, slate. Dual-axis charts are used only for paired metrics (CTR % with CPC ₹; CPA ₹ with ROAS ×), with both axes labelled with units.

Global filter state (date range, platform) lives in URL search params so pages are linkable and the header controls drive every page.

## 9. Demo data

`backend/app/demo/generator.py` builds about five fictional Kerala businesses (e.g. real estate, Ayurveda clinic, jewellery, coaching institute, restaurant) with names clearly fictional, 120 days of daily metrics, mixed objectives and formats, using `random.Random(seed)`. It deliberately includes edge cases: a client with no connected account, an account with `connection_status = "expired"`, ads with unknown format, ads without thumbnails, zero-click days, and a traffic campaign with no conversions. All clients have `is_demo = true`. Thumbnails are rendered client-side as format-labelled placeholders, so no external images are fetched.

## 10. Google Ads extension points

- `ad_accounts.platform` and the platform selector already include `google_ads` (disabled in UI).
- `integrations/base.py` defines a `PlatformAdapter` protocol: `discover_accounts`, `fetch_entities`, `fetch_daily_insights`, `fetch_creatives`. Meta implements it in Phase 2.
- Objective → primary conversion type mapping is per platform.
- Platform-only fields go to `platform_fields`, not new columns in shared tables.

## 11. External API findings and risks

**Meta Marketing API (Phase 2)**
- Reading insights requires the `ads_read` permission on the ad accounts the token can access ([Meta: ads_read](https://developers.facebook.com/docs/permissions/reference/ads_read/), [Insights API](https://developers.facebook.com/docs/marketing-api/insights)).
- Tokens expire; Meta does not issue permanent API keys. A System User token from Vestadz's Business Manager is the likely choice for agency-owned access. To confirm in Phase 2.
- Requirements from Vestadz: a Meta developer app, Business Manager access to each client ad account, and possibly App Review / business verification depending on access tier. To verify against current docs at the start of Phase 2.
- Not all breakdowns can be combined, and some metrics are unavailable with certain breakdowns ([Meta: breakdowns](https://developers.facebook.com/docs/marketing-api/insights/breakdowns)).

**Meta Ad Library API (Phase 3)**
- The `ads_archive` endpoint only returns ads that reached the EU/UK, or ads about social issues, elections or politics ([Meta: ads_archive reference](https://developers.facebook.com/docs/graph-api/reference/ads_archive/)). Ordinary commercial ads shown only in India are **not** queryable through the API. The public Ad Library website shows them, but automated scraping would breach Meta's terms, so Phase 3 relies on manual import (URL, screenshot, copy) for Indian competitors.

**Google Ads Transparency Center (Phase 3)**
- I did not find an official public API for commercial ad data. Third-party paid scrapers exist (e.g. SerpApi), which would conflict with the free-tools preference and carry terms-of-service risk. Default plan: manual import plus stored links.

**Security risks**
- Token leakage: tokens only in backend `.env`, never returned by any endpoint, redacted in logs.
- OneDrive sync: the project currently sits in OneDrive. `.env` and the SQLite file would be synced to the cloud, and `node_modules` sync causes slowness and file-lock errors. See the open questions in the plan.
- Local network exposure: backend bound to `127.0.0.1`; CORS restricted to `http://localhost:3000`.

## 12. Testing strategy (Phase 1)

- Backend unit tests: `safe_div`, every ratio, aggregation from base metrics (including a case where averaging ratios gives a different answer), mixed currency, conversion-type separation, previous-period windows, percent change nulls, rankings eligibility, insight rules.
- Backend API tests: client isolation (cross-client campaign/ad IDs return 404; summary for client A excludes client B rows), date validation, date filtering boundaries (inclusive), timeseries fills missing days with zero spend but `null` ratios, demo labelling.
- Frontend tests: formatters (currency, null display), KpiCard unavailable and change-direction rendering, sidebar active state.
- Manual verification: run both servers, check every page, resize to small width, record results in `docs/test-results.md`.
