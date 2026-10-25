# Requirements: Vestadz AI Marketing Analyst

Status: Draft for review. Phase 1 requirements are detailed; later phases are summarized and will be refined before each phase starts.

## Context

Vestadz is a digital marketing agency in Kerala, India. The application is a local-first, multi-client marketing analytics tool that runs on a Windows 11 laptop. Meta Ads is the only advertising platform integrated in the first release. Google Ads must be addable later without redesign.

The visual reference is the Vestadz CRM dashboard (`crm.vestadz.com/dashboard`). **Open item:** the screenshot has not yet been supplied to the workspace, so design tokens below are the approximations from the project brief.

## Glossary

- **Client**: A Vestadz customer business. All performance data belongs to exactly one client.
- **Ad account**: An advertising account on a platform (`meta`, later `google_ads`), linked to one client.
- **Reporting period**: An inclusive start and end date, interpreted in Asia/Kolkata.
- **Creative format**: The asset type (image, video, carousel, etc.). Independent of placement.
- **Placement**: Where an ad is shown (Feed, Stories, Reels, etc.).
- **Conversion type**: A named result (e.g. `lead`, `purchase`) with its attribution setting. Different types are never summed together.
- **Demo mode**: Operation with synthetic data, used when no credentials are configured.

---

## Phase 1: Branded UI and dashboard (synthetic data)

### R1. Application shell and branding

1.1 The application SHALL render a persistent left sidebar with: Dashboard, Clients, Campaigns, Ads, Creative Intelligence, Competitors, Reports, Automations, Settings.
1.2 WHEN a navigation item matches the current route, THE sidebar SHALL show it with a pale pink background and magenta (`#AE0079`) text and icon.
1.3 The application SHALL render a top header with: global search (clients, campaigns, ads), reporting date-range selector, platform selector, activity indicator, and profile menu.
1.4 The application SHALL use shared design tokens: primary `#AE0079`, text `#26354D`, page background `#F4F6FA`, card `#FFFFFF`, muted blue-grey secondary text, green positive, red negative, light grey borders.
1.5 IF a Vestadz logo asset exists in the repository, THEN THE sidebar SHALL display it; OTHERWISE THE sidebar SHALL display a clearly labelled logo placeholder.
1.6 WHEN the viewport is narrower than the large breakpoint, THE sidebar SHALL collapse into a toggleable drawer.
1.7 Pages for Competitors, Reports, Automations and Settings SHALL exist with a layout and an explicit "planned for Phase N" empty state rather than fake functionality.

### R2. Demo mode labelling

2.1 WHILE the application serves synthetic data, THE header SHALL display a persistent "Demo data, synthetic" badge.
2.2 Every API response SHALL include a `data_source` field (`demo` or `live`).
2.3 Synthetic records SHALL be generated deterministically from a fixed seed so tests and screenshots are reproducible.

### R3. All-client dashboard

3.1 THE dashboard SHALL show KPI cards for: spend, impressions, reach, clicks, CTR, CPC, CPM, conversions, cost per conversion, conversion value, ROAS.
3.2 WHEN a previous period of equal length has data, EACH KPI card SHALL show the percentage change, coloured by whether the change is favourable for that metric (e.g. a CPA decrease is green).
3.3 IF a metric is unavailable for the selection, THEN THE card SHALL display "Not available" with a reason, and SHALL NOT display zero.
3.4 Reach SHALL NOT be summed across clients or days, because reach is de-duplicated per query. Aggregate reach across multiple clients SHALL be shown as unavailable or labelled as "sum of account reach (may overcount)".
3.5 THE dashboard SHALL show charts for: daily spend; impressions, reach and clicks over time; CTR and CPC trends; conversions; cost per conversion; conversion value and ROAS; client comparison; campaign ranking; ad-format comparison.
3.6 Each chart SHALL have axis labels, a legend, tooltips with formatted values, and SHALL NOT place metrics with different units on one axis unless a second labelled axis is used.
3.7 THE dashboard SHALL show a card per client with: name, category, ad-account connection status, spend, conversions, CPA and ROAS where available, a sparkline, and an action that opens client analytics.

### R4. Client analytics page

4.1 WHEN a client is selected, THE page SHALL display only that client's data. The backend SHALL enforce this by filtering on `client_id` in every query, and SHALL return 404 for unknown clients.
4.2 THE page SHALL have tabs: Overview, Campaigns, Ad Sets, Ads, Creatives, Competitors, Recommendations.
4.3 Overview SHALL show: name, connected ad accounts, reporting period, last successful sync (or "never synced" in demo mode), spend, impressions, clicks, CTR, CPC, conversions, CPA, conversion value, ROAS.
4.4 Campaigns SHALL list name, ID, objective, delivery status, spend, impressions, clicks, CTR, CPC, conversions, CPA, conversion value, ROAS. Selecting a campaign SHALL filter Ad Sets and Ads to that campaign.
4.5 Ads SHALL show a gallery of cards with thumbnail or preview placeholder, name, ID, campaign, ad set, creative format, placements where known, and the metric set from 4.4 plus reach and CPM.
4.6 THE gallery SHALL support sorting by spend, CTR, CPC, conversions, CPA and ROAS. Ads with undefined CPA or ROAS SHALL sort last regardless of direction.
4.7 WHEN an ad is selected, THE application SHALL show a detail view with creative, daily performance chart and campaign context.
4.8 Charts on the client page SHALL include: spend and conversion trend, CTR and CPC trend, CPA and ROAS trend, performance by creative format, campaign comparison, ad ranking, and previous-period comparison.
4.9 WHEN the reporting period, campaign filter or format filter changes, ALL charts and tables on the page SHALL refresh from the backend.
4.10 Creative format and placement SHALL be stored and displayed separately. An ad with unknown format SHALL show "Unknown", not a guessed value.
4.11 The Competitors and Recommendations tabs SHALL show layout and empty states in Phase 1.

### R5. Metric calculation rules

5.1 CTR = clicks / impressions × 100. CPC = spend / clicks. CPM = spend / impressions × 1000. CPA = spend / conversions. ROAS = conversion value / spend.
5.2 IF a denominator is zero or missing, THEN the ratio SHALL be `null`, never zero or infinity.
5.3 Aggregated ratios SHALL be computed from summed base metrics, never by averaging daily or per-ad ratios.
5.4 Conversions SHALL be aggregated per conversion type. CPA and ROAS SHALL use the conversion type that matches the campaign objective, or a type the user selects.
5.5 Monetary values SHALL carry a currency code. Amounts in different currencies SHALL NOT be summed; mixed-currency totals SHALL be reported as unavailable.

### R6. Ad performance analysis (deterministic)

6.1 THE analytics service SHALL rank ads by: highest ROAS, lowest CPA, highest conversion volume, highest CTR, and objective-appropriate result.
6.2 Each ranking SHALL state its criteria, period and minimum-data thresholds.
6.3 An ad SHALL NOT be ranked as a top performer on CTR alone. Ads below the data-sufficiency thresholds (configurable, e.g. minimum spend and impressions) SHALL be listed as "needs more data".
6.4 THE service SHALL flag campaigns whose spend exceeds a threshold with zero or few results, and ads whose recent-window efficiency declined against their earlier window. Decline flags SHALL use more than CTR and SHALL NOT be labelled "fatigue".
6.5 Insight text SHALL be template-based and reproducible. AI-generated text is out of scope for Phase 1.

### R7. Creative Intelligence page layout

7.1 THE page SHALL show the research configuration fields (industry, geography, competitors, competitor URLs, products, keywords and offers, formats of interest) and a creative library layout.
7.2 In Phase 1 the page SHALL clearly state that automated discovery is not active and SHALL NOT display synthetic competitor spend, CPA, conversions or ROAS.

### R8. UX states and accessibility

8.1 Every data view SHALL have loading, empty and error states. Error states SHALL describe the problem and offer a retry.
8.2 Interactive controls SHALL be keyboard-accessible with visible focus and accessible names. Colour SHALL NOT be the only indicator of change direction (use arrow icons and signs).

### R9. Local operation

9.1 THE application SHALL run on Windows 11 with documented PowerShell commands for setup, backend, frontend, seeding and tests.
9.2 Secrets SHALL live in `.env` (git-ignored). `.env.example` SHALL contain placeholders only.

---

## Later phases (summary, refined before each phase)

- **Phase 2, Meta integration**: read-only Marketing API access with `ads_read`; account discovery; campaigns, ad sets, ads, creatives, daily insights; pagination, rate-limit back-off, retries, token-expiry detection; sync history; idempotent upserts; validation against Ads Manager.
- **Phase 3, Creative Intelligence**: competitor management, manual import (URL, screenshot, media, copy, notes), source reliability, de-duplication with history, separate explainable scores (client performance, competitor activity, relevance, confidence).
- **Phase 4, Automation**: configurable daily job (default 08:00 Asia/Kolkata), run history with real status, retries, activity feed, next/last run display.
- **Phase 5, AI and reports**: optional model behind a provider interface; outputs labelled as hypotheses; client reports.
- **Phase 6, Expansion**: Google Ads integration, optional hosting.
