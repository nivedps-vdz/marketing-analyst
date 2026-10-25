"use client";

import { useRouter } from "next/navigation";

import { ClientCard } from "@/components/analytics/ClientCard";
import { CampaignRankingChart, ClientComparisonChart, FormatChart } from "@/components/analytics/ComparisonCharts";
import { DELIVERY_KEYS, KpiGrid, RESULT_KEYS } from "@/components/analytics/KpiCard";
import { PerformanceCharts } from "@/components/analytics/PerformanceCharts";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { useFilters, useGlobalQuery } from "@/lib/filters";
import { formatRange } from "@/lib/format";
import { useClientCards, useFormats, useSummary, useTimeseries } from "@/lib/queries";

export default function DashboardPage() {
  const f = useFilters();
  const scope = { ready: f.ready, api: f.api };
  const summary = useSummary(scope);
  const ts = useTimeseries(scope);
  const cards = useClientCards(scope);
  const formats = useFormats(scope);
  const gq = useGlobalQuery();
  const router = useRouter();
  const days = summary.data?.period.days ?? 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={
          f.ready
            ? `All clients · ${formatRange(f.start, f.end)} · compared with the previous ${days || "…"} days`
            : "Loading reporting period…"
        }
      />
      <DemoBanner />

      {summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
      ) : (
        <>
          <SectionTitle hint={summary.data?.currency ? `Currency: ${summary.data.currency}` : undefined}>Delivery</SectionTitle>
          <KpiGrid keys={DELIVERY_KEYS} metrics={summary.data?.metrics} currency={summary.data?.currency ?? null} previousDays={days} loading={summary.isPending} />
          <SectionTitle>Results</SectionTitle>
          <KpiGrid keys={RESULT_KEYS} metrics={summary.data?.metrics} currency={summary.data?.currency ?? null} previousDays={days} loading={summary.isPending} />
        </>
      )}

      <SectionTitle>Trends</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <PerformanceCharts ids={["spend", "delivery", "ctrCpc", "conversions", "costPerResult", "valueRoas"]} query={ts} />
      </div>

      <SectionTitle>Comparisons</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <ClientComparisonChart
          clients={cards.data?.clients}
          isPending={cards.isPending}
          error={cards.error}
          refetch={() => cards.refetch()}
          onSelect={(id) => router.push(`/clients/${id}${gq}`)}
        />
        <CampaignRankingChart scope={scope} currency={summary.data?.currency ?? null} />
        <div className="lg:col-span-2">
          <FormatChart query={formats} />
        </div>
      </div>

      <SectionTitle hint={cards.data ? `${cards.data.clients.length} clients` : undefined}>Clients</SectionTitle>
      {cards.isError ? (
        <ErrorState error={cards.error} onRetry={() => cards.refetch()} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.data
            ? cards.data.clients.map((c) => <ClientCard key={c.id} client={c} query={gq} />)
            : Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      )}
    </>
  );
}
