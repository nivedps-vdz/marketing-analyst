"use client";

import { ArrowLeft, Bot, X } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { AdDetailDialog } from "@/components/analytics/AdDetailDialog";
import { AdGallery } from "@/components/analytics/AdGallery";
import { BarComparison } from "@/components/charts/BarComparison";
import { ChartCard } from "@/components/charts/ChartCard";
import { FormatChart } from "@/components/analytics/ComparisonCharts";
import { CreativePreview } from "@/components/analytics/CreativePreview";
import { EntityTable } from "@/components/analytics/EntityTable";
import { DELIVERY_KEYS, KpiGrid, RESULT_KEYS } from "@/components/analytics/KpiCard";
import { PerformanceCharts } from "@/components/analytics/PerformanceCharts";
import { PeriodComparison } from "@/components/analytics/PeriodComparison";
import { InsightList, RankingsGrid } from "@/components/analytics/Rankings";
import { Badge, ConnectionBadge, DeliveryBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState, QueryState, Skeleton } from "@/components/ui/States";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { ApiError } from "@/lib/api";
import { useFilters, useGlobalQuery, useSetParams } from "@/lib/filters";
import {
  costLabel,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  formatPlacement,
  formatRange,
  formatRoas,
  titleCase,
} from "@/lib/format";
import {
  useAds,
  useAdSets,
  useCampaigns,
  useClient,
  useFormats,
  useInsights,
  useRankings,
  useSummary,
  useTimeseries,
  type Scope,
} from "@/lib/queries";
import type { ClientProfile, CreativeFormat, ResultType, SortKey, Summary } from "@/lib/types";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "campaigns", label: "Campaigns" },
  { value: "adsets", label: "Ad Sets" },
  { value: "ads", label: "Ads" },
  { value: "creatives", label: "Creatives" },
  { value: "competitors", label: "Competitors" },
  { value: "recommendations", label: "Recommendations" },
];

const FORMATS: { value: CreativeFormat; label: string }[] = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "carousel", label: "Carousel" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
];

function useClientParams() {
  const sp = useSearchParams();
  const num = (k: string) => {
    const v = sp.get(k);
    return v && /^\d+$/.test(v) ? Number(v) : null;
  };
  return {
    tab: sp.get("tab") ?? "overview",
    campaign: num("campaign"),
    adset: num("adset"),
    ad: num("ad"),
    format: (sp.get("format") as CreativeFormat | null) ?? null,
    sort: (sp.get("sort") as SortKey | null) ?? "spend",
    order: (sp.get("order") as "asc" | "desc" | null) ?? "desc",
    rt: (sp.get("rt") as ResultType | null) ?? null,
  };
}

function ClientHeaderCard({ client, summary }: { client: ClientProfile; summary?: Summary }) {
  return (
    <Card className="mb-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-ink">{client.name}</h1>
            {client.is_demo ? <Badge tone="warning">Demo client</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted">{client.category}{client.geography ? ` · ${client.geography}` : ""}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-muted">Reporting period</dt>
            <dd className="font-semibold text-ink">{summary ? formatRange(summary.period.start, summary.period.end) : "…"}</dd>
          </div>
          <div>
            <dt className="text-muted">Last successful sync</dt>
            <dd className="font-semibold text-ink">
              {client.last_successful_sync ? formatDate(client.last_successful_sync) : client.is_demo ? "Never (demo data)" : "Never"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Currency</dt>
            <dd className="font-semibold text-ink">{summary?.currency ?? "—"}</dd>
          </div>
        </dl>
      </div>
      <div className="mt-4 border-t border-line pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">Connected ad accounts</p>
        {client.ad_accounts.length ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {client.ad_accounts.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs">
                <span className="font-semibold text-ink">{a.platform_label}</span>
                <span className="text-muted">{a.name} · {a.external_id}</span>
                <ConnectionBadge status={a.connection_status} />
                {a.data_through ? <span className="text-muted">data to {formatDate(a.data_through)}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted">No ad account connected. Performance data will appear once a Meta account is linked (Phase 2).</p>
        )}
      </div>
    </Card>
  );
}

function FilterBar({ clientId, baseScope, p, set }: {
  clientId: number;
  /** Scope without campaign or format filters, so every campaign stays selectable. */
  baseScope: Scope;
  p: ReturnType<typeof useClientParams>;
  set: ReturnType<typeof useSetParams>;
}) {
  const campaigns = useCampaigns(baseScope, clientId, "name", "asc");
  const active = p.campaign !== null || p.format !== null || p.adset !== null;
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <Select
        label="Campaign"
        className="min-w-[260px]"
        value={p.campaign ?? ""}
        onChange={(e) => set({ campaign: e.target.value || null, adset: null })}
      >
        <option value="">All campaigns</option>
        {campaigns.data?.campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Select label="Creative format" value={p.format ?? ""} onChange={(e) => set({ format: e.target.value || null })}>
        <option value="">All formats</option>
        {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
      </Select>
      {p.adset !== null ? (
        <Badge tone="brand" className="h-10 rounded-xl px-3 text-xs">
          Ad set filter active
          <button type="button" onClick={() => set({ adset: null })} aria-label="Clear ad set filter"><X className="h-3.5 w-3.5" aria-hidden /></button>
        </Badge>
      ) : null}
      {active ? <Button size="md" variant="ghost" onClick={() => set({ campaign: null, adset: null, format: null })}>Clear filters</Button> : null}
    </div>
  );
}

function OverviewTab({ clientId, scope, summary, onOpenAd }: {
  clientId: number;
  scope: Scope;
  summary: ReturnType<typeof useSummary>;
  onOpenAd: (id: number) => void;
}) {
  const ts = useTimeseries(scope, clientId);
  const formats = useFormats(scope, clientId);
  const campaigns = useCampaigns(scope, clientId, "spend", "desc");
  const rankings = useRankings(scope, clientId);
  const days = summary.data?.period.days ?? 0;
  const currency = summary.data?.currency ?? null;
  const topRanking = rankings.data?.rankings.find((r) => r.key.startsWith("most_")) ?? rankings.data?.rankings[0];

  return (
    <>
      {summary.isError ? <ErrorState error={summary.error} onRetry={() => summary.refetch()} /> : (
        <>
          <SectionTitle>Delivery</SectionTitle>
          <KpiGrid keys={DELIVERY_KEYS} metrics={summary.data?.metrics} currency={currency} previousDays={days} loading={summary.isPending} />
          <SectionTitle>Results</SectionTitle>
          <KpiGrid keys={RESULT_KEYS} metrics={summary.data?.metrics} currency={currency} previousDays={days} loading={summary.isPending} />
        </>
      )}
      <SectionTitle>Trends</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <PerformanceCharts ids={["spendResults", "ctrCpc", "cpaRoas"]} query={ts} />
        <ChartCard title="Previous-period comparison" subtitle={summary.data ? `vs ${formatRange(summary.data.previous_period.start, summary.data.previous_period.end)}` : undefined} isLoading={summary.isPending}>
          {summary.data ? <PeriodComparison summary={summary.data} keys={["spend", "clicks", "ctr", "leads", "cost_per_lead", "purchases", "roas"]} /> : null}
        </ChartCard>
      </div>
      <SectionTitle>Comparisons</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <FormatChart query={formats} title="Performance by creative format" />
        <ChartCard title="Campaign comparison" subtitle="Spend by campaign in this period" isLoading={campaigns.isPending} error={campaigns.error} onRetry={() => campaigns.refetch()}>
          {campaigns.data ? (
            <BarComparison
              ariaLabel="Campaign spend comparison"
              label="Spend"
              kind="money"
              currency={currency}
              data={campaigns.data.campaigns.map((c) => ({ id: c.id, name: c.name, sub: c.objective_label, value: c.metrics.has_data ? c.metrics.spend : null }))}
            />
          ) : null}
        </ChartCard>
        <ChartCard
          className="lg:col-span-2"
          title={topRanking ? `Ad ranking: ${topRanking.title.toLowerCase()}` : "Ad ranking"}
          subtitle={topRanking?.criteria}
          isLoading={rankings.isPending}
          error={rankings.error}
          onRetry={() => rankings.refetch()}
          footer="Full objective-specific rankings are on the Recommendations tab. Click a bar to open the ad."
        >
          {topRanking ? (
            <BarComparison
              ariaLabel="Top ads"
              label={topRanking.metric === "results" ? "Results" : topRanking.title}
              kind={topRanking.metric === "results" ? "count" : topRanking.metric === "roas" ? "ratio" : topRanking.metric === "ctr" ? "percent" : "money"}
              currency={currency}
              onSelect={(id) => onOpenAd(Number(id))}
              data={topRanking.entries.map((e) => ({ id: e.ad_id, name: e.name, sub: e.campaign_name, value: e.metric_value }))}
            />
          ) : rankings.data ? <EmptyState title="No ads to rank" /> : null}
        </ChartCard>
      </div>
    </>
  );
}

function CampaignsTab({ clientId, scope, p, set, currency }: {
  clientId: number; scope: Scope; p: ReturnType<typeof useClientParams>; set: ReturnType<typeof useSetParams>; currency: string | null;
}) {
  const q = useCampaigns({ ...scope, api: { ...scope.api, campaign_id: undefined } }, clientId, p.sort, p.order);
  return (
    <Card>
      <CardHeader title="Campaigns" subtitle="Click a column to sort. Drill down to see a campaign's ad sets and ads." />
      <CardBody className="px-2">
        <QueryState query={q} isEmpty={(d) => d.campaigns.length === 0} empty={<EmptyState title="No campaigns" description="This client has no campaigns for the selected platform." />}>
          {(d) => (
            <EntityTable
              caption="Campaigns for this client"
              rows={d.campaigns}
              currency={currency}
              sort={p.sort}
              order={p.order}
              selectedId={p.campaign}
              onSort={(k) => set({ sort: k, order: p.sort === k && p.order === "desc" ? "asc" : "desc" })}
              onSelect={(r) => set({ campaign: String(r.id), adset: null, tab: "adsets" })}
              selectLabel={(r) => `Drill down into ${r.name}`}
              leading={[
                { label: "Campaign", render: (r) => (<div className="min-w-[220px]"><p className="font-semibold text-ink">{r.name}</p><p className="text-[11px] text-subtle">ID {r.external_id}</p></div>) },
                { label: "Objective", render: (r) => <span className="whitespace-nowrap text-xs text-ink">{r.objective_label}<span className="block text-[10px] text-subtle">{r.objective}</span></span> },
                { label: "Status", render: (r) => <DeliveryBadge status={r.status} /> },
              ]}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
}

function AdSetsTab({ clientId, scope, p, set, currency }: {
  clientId: number; scope: Scope; p: ReturnType<typeof useClientParams>; set: ReturnType<typeof useSetParams>; currency: string | null;
}) {
  const q = useAdSets(scope, clientId, p.sort, p.order);
  return (
    <Card>
      <CardHeader title="Ad sets" subtitle={p.campaign ? "Filtered to the selected campaign" : "All campaigns. Choose a campaign above or drill down from Campaigns."} />
      <CardBody className="px-2">
        <QueryState query={q} isEmpty={(d) => d.ad_sets.length === 0} empty={<EmptyState title="No ad sets" />}>
          {(d) => (
            <EntityTable
              caption="Ad sets"
              rows={d.ad_sets}
              currency={currency}
              sort={p.sort}
              order={p.order}
              selectedId={p.adset}
              onSort={(k) => set({ sort: k, order: p.sort === k && p.order === "desc" ? "asc" : "desc" })}
              onSelect={(r) => set({ adset: String(r.id), campaign: String(r.campaign.id), tab: "ads" })}
              selectLabel={(r) => `View ads in ${r.name}`}
              leading={[
                { label: "Ad set", render: (r) => (<div className="min-w-[200px]"><p className="font-semibold text-ink">{r.name}</p><p className="text-[11px] text-subtle">ID {r.external_id}</p></div>) },
                { label: "Campaign", render: (r) => <span className="text-xs text-muted">{r.campaign.name}</span> },
                { label: "Status", render: (r) => <DeliveryBadge status={r.status} /> },
              ]}
            />
          )}
        </QueryState>
      </CardBody>
    </Card>
  );
}

function CreativesTab({ clientId, scope, currency }: { clientId: number; scope: Scope; currency: string | null }) {
  const formats = useFormats(scope, clientId);
  const ads = useAds(scope, clientId, "spend", "desc");
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Creative formats" subtitle="Format is the asset type. Placements are where it was shown." />
        <CardBody className="overflow-x-auto px-2">
          <QueryState query={formats} isEmpty={(d) => d.rows.length === 0} empty={<EmptyState title="No creative data" />}>
            {(d) => (
              <table className="w-full min-w-[720px] text-sm">
                <caption className="sr-only">Metrics by creative format</caption>
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-wide text-subtle">
                    {["Format", "Ads", "Spend share", "Spend", "CTR", "CPC", "Leads", "Cost per lead", "Purchases", "ROAS"].map((h, i) => (
                      <th key={h} scope="col" className={`px-3 py-3 ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.rows.map((r) => (
                    <tr key={r.format} className="border-b border-line last:border-0">
                      <th scope="row" className="px-3 py-3 text-left font-semibold text-ink">{r.label}</th>
                      <td className="px-3 py-3 text-right tabular-nums">{r.ad_count}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.spend_share === null ? "—" : `${(r.spend_share * 100).toFixed(0)}%`}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatMoney(r.metrics.spend, d.currency)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatPercent(r.metrics.ctr)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatMoney(r.metrics.cpc, d.currency, { decimals: 2 })}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatNumber(r.metrics.leads)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatMoney(r.metrics.cost_per_lead, d.currency, { decimals: 2 })}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatNumber(r.metrics.purchases)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatRoas(r.metrics.roas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </QueryState>
        </CardBody>
      </Card>
      <SectionTitle>Creative library (client-owned)</SectionTitle>
      <QueryState query={ads} isEmpty={(d) => d.ads.length === 0} empty={<EmptyState title="No creatives" />}>
        {(d) => (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {d.ads.map((a) => (
              <Card key={a.id} as="article" className="p-3">
                <CreativePreview creative={a.creative} />
                <div className="px-1 pt-3">
                  <p className="text-sm font-semibold text-ink">{a.creative.headline ?? <span className="text-subtle">No headline in metadata</span>}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{a.creative.body ?? "No body text in metadata."}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge tone="brand">{a.creative.format_label}{a.creative.aspect_ratio ? ` · ${a.creative.aspect_ratio}` : ""}</Badge>
                    {a.creative.call_to_action ? <Badge tone="outline">{titleCase(a.creative.call_to_action)}</Badge> : null}
                    {(a.placements ?? []).map((pl) => <Badge key={pl} tone="outline">{formatPlacement(pl)}</Badge>)}
                  </div>
                  <p className="mt-2 text-[11px] text-muted">
                    Used by {a.name} · spend {formatMoney(a.metrics.spend, currency, { compact: true })}
                    {a.metrics.result_type ? ` · ${costLabel(a.metrics.result_type).toLowerCase()} ${formatMoney(a.metrics.cpa, currency, { decimals: 2 })}` : ""}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}

function RecommendationsTab({ clientId, scope, currency, onOpenAd }: { clientId: number; scope: Scope; currency: string | null; onOpenAd: (id: number) => void }) {
  const insights = useInsights(scope, clientId);
  const rankings = useRankings(scope, clientId);
  return (
    <div className="space-y-4">
      <Card className="flex items-start gap-3 p-4">
        <Bot className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
        <p className="text-xs leading-relaxed text-muted">
          Everything below is <span className="font-semibold text-ink">calculated from stored metrics with fixed rules</span>.
          {rankings.data?.thresholds
            ? ` An ad is ranked only with spend ≥ ${formatMoney(rankings.data.thresholds.min_spend, currency)}, ≥ ${formatNumber(rankings.data.thresholds.min_impressions)} impressions and, for cost rankings, ≥ ${rankings.data.thresholds.min_conversions} results.`
            : ""}{" "}
          AI-written explanations and experiment ideas are planned for Phase 5 and will be labelled as hypotheses.
        </p>
      </Card>
      <SectionTitle>Insights</SectionTitle>
      <QueryState query={insights}>
        {(d) => (d.unavailable_reason ? <EmptyState title="Insights unavailable" description={d.unavailable_reason} /> : <InsightList insights={d.insights} onOpenAd={onOpenAd} />)}
      </QueryState>
      <SectionTitle>Ad rankings</SectionTitle>
      <QueryState query={rankings}>{(d) => <RankingsGrid data={d} currency={currency} onOpenAd={onOpenAd} />}</QueryState>
    </div>
  );
}

export default function ClientPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = Number(params.clientId);
  const f = useFilters();
  const p = useClientParams();
  const set = useSetParams();
  const gq = useGlobalQuery();

  const filterApi = { ...f.api, campaign_id: p.campaign ?? undefined, format: p.format ?? undefined };
  const scope: Scope = { ready: f.ready && Number.isFinite(clientId), api: filterApi };
  const client = useClient(clientId);
  const summary = useSummary(scope, clientId);
  const currency = summary.data?.currency ?? null;
  const ads = useAds({ ...scope, api: { ...filterApi, ad_set_id: p.adset ?? undefined, result_type: p.rt ?? undefined } }, clientId, p.sort, p.order);

  if (client.isError) {
    const notFound = client.error instanceof ApiError && client.error.status === 404;
    return notFound ? (
      <EmptyState title="Client not found" description="This client does not exist or you do not have access to it." action={<Link className="text-sm font-semibold text-brand" href={`/clients${gq}`}>Back to clients</Link>} />
    ) : (
      <ErrorState error={client.error} onRetry={() => client.refetch()} />
    );
  }

  return (
    <>
      <PageHeader
        title="Client analytics"
        actions={<Link href={`/clients${gq}`} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-brand"><ArrowLeft className="h-4 w-4" aria-hidden /> All clients</Link>}
      />
      {client.data ? <ClientHeaderCard client={client.data.client} summary={summary.data} /> : <Skeleton className="mb-5 h-40 rounded-2xl" />}
      <FilterBar clientId={clientId} baseScope={{ ready: scope.ready, api: f.api }} p={p} set={set} />

      <Tabs label="Client analytics sections" value={p.tab} onValueChange={(v) => set({ tab: v === "overview" ? null : v })} tabs={TABS}>
        <TabPanel value="overview"><OverviewTab clientId={clientId} scope={scope} summary={summary} onOpenAd={(id) => set({ ad: String(id) })} /></TabPanel>
        <TabPanel value="campaigns"><CampaignsTab clientId={clientId} scope={scope} p={p} set={set} currency={currency} /></TabPanel>
        <TabPanel value="adsets"><AdSetsTab clientId={clientId} scope={scope} p={p} set={set} currency={currency} /></TabPanel>
        <TabPanel value="ads"><AdGallery ads={ads} currency={currency} p={p} set={set} onOpen={(a) => set({ ad: String(a.id) })} /></TabPanel>
        <TabPanel value="creatives"><CreativesTab clientId={clientId} scope={scope} currency={currency} /></TabPanel>
        <TabPanel value="competitors">
          <Card>
            <EmptyState
              title="Competitor research starts in Phase 3"
              description={<>Competitor ads for {client.data?.client.name ?? "this client"} will be added through manual import (ad URLs, screenshots, copy) and permitted public sources. No competitor spend or results are shown, because they are not publicly available.</>}
              action={<Link href={`/creative-intelligence${gq}`} className="text-sm font-semibold text-brand hover:underline">Open Creative Intelligence</Link>}
            />
          </Card>
        </TabPanel>
        <TabPanel value="recommendations"><RecommendationsTab clientId={clientId} scope={scope} currency={currency} onOpenAd={(id) => set({ ad: String(id) })} /></TabPanel>
      </Tabs>

      <AdDetailDialog
        clientId={clientId}
        adId={p.ad}
        period={{ start: f.start, end: f.end }}
        currency={currency}
        onClose={() => set({ ad: null })}
      />
    </>
  );
}
