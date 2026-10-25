"use client";

import { useState } from "react";

import { BarComparison } from "@/components/charts/BarComparison";
import { ChartCard } from "@/components/charts/ChartCard";
import { Select } from "@/components/ui/Select";
import { METRICS, costLabel, resultLabel, type MetricKind } from "@/lib/format";
import { useCampaignRanking, type Scope } from "@/lib/queries";
import type { CampaignRow, ClientCardData, Formats, MetricKey, ResultType, SortKey } from "@/lib/types";

const CLIENT_METRICS: MetricKey[] = ["spend", "leads", "cost_per_lead", "purchases", "cost_per_purchase", "roas"];

export function ClientComparisonChart({ clients, isPending, error, refetch, onSelect }: {
  clients?: ClientCardData[];
  isPending: boolean;
  error: unknown;
  refetch: () => unknown;
  onSelect?: (id: number) => void;
}) {
  const [metric, setMetric] = useState<MetricKey>("spend");
  const currencies = new Set((clients ?? []).map((c) => c.currency).filter(Boolean));
  const currency = currencies.size === 1 ? [...currencies][0]! : null;
  return (
    <ChartCard
      title="Client comparison"
      subtitle="Selected period · click a bar to open the client"
      isLoading={isPending}
      error={error}
      onRetry={refetch}
      action={
        <Select label="Metric" hideLabel value={metric} onChange={(e) => setMetric(e.target.value as MetricKey)}>
          {CLIENT_METRICS.map((k) => <option key={k} value={k}>{METRICS[k].label}</option>)}
        </Select>
      }
    >
      {clients ? (
        <BarComparison
          ariaLabel={`Clients compared by ${METRICS[metric].label}`}
          label={METRICS[metric].label}
          kind={METRICS[metric].kind}
          currency={currency}
          onSelect={onSelect ? (id) => onSelect(Number(id)) : undefined}
          data={clients
            .map((c) => ({
              id: c.id,
              name: c.name,
              sub: c.category,
              value: c.metrics[metric as keyof ClientCardData["metrics"]].value,
            }))
            .sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity))}
        />
      ) : null}
    </ChartCard>
  );
}

const RANK_OPTIONS: { value: string; label: string; sort: SortKey; order: "asc" | "desc"; rt: ResultType | null; kind: MetricKind }[] = [
  { value: "spend", label: "Spend", sort: "spend", order: "desc", rt: null, kind: "money" },
  { value: "leads", label: "Most leads", sort: "results", order: "desc", rt: "lead", kind: "count" },
  { value: "cpl", label: "Lowest cost per lead", sort: "cpa", order: "asc", rt: "lead", kind: "money" },
  { value: "purchases", label: "Most purchases", sort: "results", order: "desc", rt: "purchase", kind: "count" },
  { value: "roas", label: "Highest ROAS", sort: "roas", order: "desc", rt: "purchase", kind: "ratio" },
  { value: "ctr", label: "Highest CTR", sort: "ctr", order: "desc", rt: null, kind: "percent" },
];

function campaignValue(c: CampaignRow, sort: SortKey): number | null {
  const m = c.metrics;
  return (m as unknown as Record<string, number | null>)[sort] ?? null;
}

export function CampaignRankingChart({ scope, currency }: { scope: Scope; currency: string | null }) {
  const [choice, setChoice] = useState("spend");
  const opt = RANK_OPTIONS.find((o) => o.value === choice)!;
  const q = useCampaignRanking(scope, opt.sort, opt.order, opt.rt);
  return (
    <ChartCard
      title="Campaign ranking"
      subtitle={opt.rt ? `Top 10 · only campaigns optimising for ${resultLabel(opt.rt).toLowerCase()}` : "Top 10 campaigns across clients"}
      isLoading={q.isPending}
      error={q.error}
      onRetry={() => q.refetch()}
      footer={opt.value === "ctr" ? "CTR is an engagement signal. It does not show which campaign is most profitable." : undefined}
      action={
        <Select label="Rank by" hideLabel value={choice} onChange={(e) => setChoice(e.target.value)}>
          {RANK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      }
    >
      {q.data ? (
        <BarComparison
          ariaLabel={`Campaigns ranked by ${opt.label}`}
          label={opt.rt && opt.sort === "cpa" ? costLabel(opt.rt) : opt.label.replace(/^(Most|Highest|Lowest) /, "")}
          kind={opt.kind}
          currency={currency}
          data={q.data.campaigns.map((c) => ({ id: c.id, name: c.name, sub: c.client_name ?? undefined, value: campaignValue(c, opt.sort) }))}
        />
      ) : null}
    </ChartCard>
  );
}

const FORMAT_METRICS: MetricKey[] = ["spend", "ctr", "cpc", "cost_per_lead", "cost_per_purchase", "roas"];

export function FormatChart({ query, title = "Ad format performance" }: {
  query: { data?: Formats; isPending: boolean; error: unknown; refetch: () => unknown };
  title?: string;
}) {
  const [metric, setMetric] = useState<MetricKey>("spend");
  return (
    <ChartCard
      title={title}
      subtitle="By creative format (asset type), not placement"
      isLoading={query.isPending}
      error={query.error}
      onRetry={() => query.refetch()}
      footer={query.data ? `${query.data.note} “Unknown” means the creative metadata did not identify a format.` : undefined}
      action={
        <Select label="Metric" hideLabel value={metric} onChange={(e) => setMetric(e.target.value as MetricKey)}>
          {FORMAT_METRICS.map((k) => <option key={k} value={k}>{METRICS[k].label}</option>)}
        </Select>
      }
    >
      {query.data ? (
        <BarComparison
          ariaLabel={`Creative formats compared by ${METRICS[metric].label}`}
          label={METRICS[metric].label}
          kind={METRICS[metric].kind}
          currency={query.data.currency}
          data={query.data.rows.map((r) => ({
            id: r.format,
            name: `${r.label} (${r.ad_count} ad${r.ad_count === 1 ? "" : "s"})`,
            sub: r.spend_share === null ? undefined : `${(r.spend_share * 100).toFixed(0)}% of spend`,
            value: r.metrics[metric],
          }))}
        />
      ) : null}
    </ChartCard>
  );
}
