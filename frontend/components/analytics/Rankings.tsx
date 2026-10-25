import { AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { formatMoney, formatNumber, formatPercent, formatRoas } from "@/lib/format";
import type { Insight, Ranking, RankingEntry, Rankings } from "@/lib/types";

function metricText(r: Ranking, e: RankingEntry, currency: string | null): string {
  switch (r.metric) {
    case "roas":
      return formatRoas(e.metric_value);
    case "ctr":
      return formatPercent(e.metric_value);
    case "results":
      return formatNumber(e.metric_value);
    default:
      return formatMoney(e.metric_value, currency, { decimals: 2 });
  }
}

export function RankingCard({ ranking, currency, onOpenAd }: { ranking: Ranking; currency: string | null; onOpenAd?: (id: number) => void }) {
  return (
    <Card>
      <CardHeader title={ranking.title} subtitle={`${ranking.eligible} of ${ranking.considered} ads eligible`} />
      <CardBody>
        <p className="text-[11px] leading-relaxed text-muted">{ranking.criteria}</p>
        {ranking.caveat ? <p className="mt-2 rounded-lg bg-warning-soft px-3 py-2 text-[11px] text-warning">{ranking.caveat}</p> : null}
        {ranking.entries.length ? (
          <ol className="mt-3 space-y-1.5">
            {ranking.entries.map((e, i) => (
              <li key={e.ad_id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-page">
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", i === 0 ? "bg-brand text-white" : "bg-neutral-soft text-muted")}>{i + 1}</span>
                <button type="button" onClick={() => onOpenAd?.(e.ad_id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-xs font-semibold text-ink hover:text-brand">{e.name}</span>
                  <span className="block truncate text-[11px] text-muted">{e.campaign_name} · spend {formatMoney(e.spend, currency, { compact: true })}</span>
                </button>
                <span className="text-sm font-semibold tabular-nums text-ink">{metricText(ranking, e, currency)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-xs text-muted">No ad meets the criteria in this period.</p>
        )}
      </CardBody>
    </Card>
  );
}

export function RankingsGrid({ data, currency, onOpenAd }: { data: Rankings; currency: string | null; onOpenAd?: (id: number) => void }) {
  if (data.unavailable_reason) return <EmptyState title="Rankings not available" description={data.unavailable_reason} />;
  if (!data.rankings.length) return <EmptyState title="No ads to rank" description="There is no delivery data for this selection." />;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.rankings.map((r) => <RankingCard key={r.key} ranking={r} currency={currency} onOpenAd={onOpenAd} />)}
      </div>
      {data.needs_more_data.entries.length ? (
        <Card>
          <CardHeader title="Needs more data" subtitle={`${data.needs_more_data.entries.length} ads excluded from rankings`} />
          <CardBody>
            <p className="text-[11px] text-muted">{data.needs_more_data.criteria}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {data.needs_more_data.entries.map((e) => (
                <li key={e.ad_id}>
                  <button type="button" onClick={() => onOpenAd?.(e.ad_id)} className="rounded-full border border-line px-3 py-1 text-xs text-ink hover:border-brand hover:text-brand">
                    {e.name} · {formatMoney(e.spend, currency, { compact: true })}
                  </button>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

const SEVERITY = {
  warning: { icon: AlertTriangle, cls: "bg-warning-soft text-warning", label: "Investigate" },
  positive: { icon: CheckCircle2, cls: "bg-positive-soft text-positive", label: "Opportunity" },
  info: { icon: Info, cls: "bg-neutral-soft text-muted", label: "Note" },
};

export function InsightList({ insights, onOpenAd }: { insights: Insight[]; onOpenAd?: (id: number) => void }) {
  if (!insights.length) {
    return <EmptyState icon={<Lightbulb className="h-5 w-5" aria-hidden />} title="No insights for this period" description="No rule was triggered with the current data and thresholds." />;
  }
  return (
    <ul className="space-y-3">
      {insights.map((i, idx) => {
        const s = SEVERITY[i.severity];
        const Icon = s.icon;
        return (
          <li key={`${i.kind}-${idx}`} className="flex gap-3 rounded-2xl border border-line bg-card p-4">
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", s.cls)}><Icon className="h-4 w-4" aria-hidden /></span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-ink">{i.title}</p>
                <Badge tone={i.severity === "warning" ? "warning" : i.severity === "positive" ? "positive" : "neutral"}>{s.label}</Badge>
                <Badge tone="outline">Calculated</Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{i.detail}</p>
              {i.entity.type === "ad" && typeof i.entity.id === "number" && onOpenAd ? (
                <button type="button" onClick={() => onOpenAd(i.entity.id as number)} className="mt-2 text-xs font-semibold text-brand hover:underline">
                  View ad
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
