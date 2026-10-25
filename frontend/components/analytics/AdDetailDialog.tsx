"use client";

import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";

import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { Badge, DeliveryBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { QueryState } from "@/components/ui/States";
import { apiGet } from "@/lib/api";
import {
  costLabel,
  formatMoney,
  formatNumber,
  formatPercent,
  formatPlacement,
  formatRange,
  formatRoas,
  resultLabel,
  titleCase,
} from "@/lib/format";
import type { AdDetail, EntityMetrics } from "@/lib/types";

import { CreativePreview } from "./CreativePreview";

function rows(m: EntityMetrics, currency: string | null) {
  const rt = m.result_type;
  const out: [string, string][] = [
    ["Spend", formatMoney(m.spend, currency)],
    ["Impressions", formatNumber(m.impressions)],
    ["Reach (sum of daily)", formatNumber(m.reach)],
    ["Clicks", formatNumber(m.clicks)],
    ["CTR", formatPercent(m.ctr)],
    ["CPC", formatMoney(m.cpc, currency, { decimals: 2 })],
    ["CPM", formatMoney(m.cpm, currency, { decimals: 2 })],
  ];
  if (rt) {
    out.push([resultLabel(rt), formatNumber(m.results)], [costLabel(rt), formatMoney(m.cpa, currency, { decimals: 2 })]);
  }
  if (rt === "purchase") out.push(["Purchase value", formatMoney(m.result_value, currency)], ["ROAS", formatRoas(m.roas)]);
  return out;
}

export function AdDetailDialog({ clientId, adId, period, currency, onClose }: {
  clientId: number;
  adId: number | null;
  period: { start: string; end: string };
  currency: string | null;
  onClose: () => void;
}) {
  const q = useQuery({
    queryKey: ["ad", clientId, adId, period],
    queryFn: ({ signal }) => apiGet<{ ad: AdDetail }>(`/clients/${clientId}/ads/${adId}`, period, signal),
    enabled: adId !== null,
  });

  return (
    <Dialog.Root open={adId !== null} onOpenChange={(o) => (o ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl overflow-y-auto bg-page shadow-xl focus:outline-none">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-card px-6 py-4">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-base font-semibold text-ink">{q.data?.ad.name ?? "Ad details"}</Dialog.Title>
              <Dialog.Description className="text-xs text-muted">
                {formatRange(period.start, period.end)}
                {q.data ? ` · ID ${q.data.ad.external_id}` : ""}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close ad details"><X className="h-5 w-5" aria-hidden /></Button>
            </Dialog.Close>
          </div>

          <div className="space-y-5 p-6">
            <QueryState query={q}>
              {({ ad }) => {
                const prev = rows(ad.previous_metrics, currency);
                const ctx = ad.campaign_context;
                const rt = ad.metrics.result_type;
                return (
                  <>
                    <div className="grid gap-5 md:grid-cols-[260px_1fr]">
                      <div className="rounded-2xl border border-line bg-card p-3">
                        <CreativePreview creative={ad.creative} large />
                        <div className="mt-3 space-y-1 px-1 text-xs">
                          <p className="font-semibold text-ink">{ad.creative.headline ?? <span className="text-subtle">No headline in metadata</span>}</p>
                          {ad.creative.body ? <p className="text-muted">{ad.creative.body}</p> : null}
                          {ad.creative.call_to_action ? <Badge tone="outline">{titleCase(ad.creative.call_to_action)}</Badge> : null}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-line bg-card p-5 text-sm">
                        <div className="flex flex-wrap gap-1.5">
                          <DeliveryBadge status={ad.status} />
                          <Badge tone="brand">{ad.creative.format_label}{ad.creative.aspect_ratio ? ` · ${ad.creative.aspect_ratio}` : ""}</Badge>
                          {ad.creative.is_vertical_video ? <Badge tone="outline">Vertical video (Reels/Stories compatible)</Badge> : null}
                        </div>
                        <dl className="mt-4 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-xs">
                          <dt className="text-muted">Campaign</dt><dd className="text-ink">{ad.campaign.name}</dd>
                          <dt className="text-muted">Objective</dt><dd className="text-ink">{ad.campaign.objective_label} <span className="text-subtle">({ad.campaign.objective})</span></dd>
                          <dt className="text-muted">Ad set</dt><dd className="text-ink">{ad.ad_set.name}</dd>
                          <dt className="text-muted">Placements</dt>
                          <dd className="text-ink">{ad.placements ? ad.placements.map(formatPlacement).join(", ") : "Unknown"}</dd>
                          <dt className="text-muted">Campaign ID</dt><dd className="text-ink">{ad.campaign.external_id}</dd>
                        </dl>
                        <div className="mt-4 rounded-xl bg-page p-3 text-xs text-muted">
                          <p className="font-semibold text-ink">Campaign context</p>
                          <p className="mt-1">
                            {ctx.spend_share === null ? "Campaign had no spend in this period." : `${(ctx.spend_share * 100).toFixed(0)}% of campaign spend.`}{" "}
                            {ctx.rank_in_campaign
                              ? `Ranked ${ctx.rank_in_campaign} of ${ctx.ads_in_campaign} ads by ${ctx.rank_basis === "results" ? resultLabel(rt).toLowerCase() : "spend"}.`
                              : null}
                          </p>
                          {rt ? (
                            <p className="mt-1">
                              Campaign {costLabel(rt).toLowerCase()}: <span className="font-semibold text-ink">{formatMoney(ctx.metrics.cpa, currency, { decimals: 2 })}</span>
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-line bg-card p-5">
                      <p className="text-[15px] font-semibold text-ink">Spend and {resultLabel(rt).toLowerCase()} by day</p>
                      <div className="mt-3">
                        <TimeSeriesChart
                          ariaLabel="Daily spend and results for this ad"
                          points={ad.timeseries}
                          currency={currency}
                          left={{ label: "Spend", kind: "money" }}
                          right={rt ? { label: resultLabel(rt), kind: "count" } : undefined}
                          series={[
                            { key: "spend", label: "Spend", type: "bar", axis: "left", color: "var(--color-chart-1)" },
                            ...(rt ? [{ key: rt === "lead" ? "leads" : "purchases", label: resultLabel(rt), type: "line", axis: "right", color: "var(--color-chart-2)" } as const] : []),
                          ]}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-line bg-card p-5">
                      <p className="text-[15px] font-semibold text-ink">CTR and CPC by day</p>
                      <div className="mt-3">
                        <TimeSeriesChart
                          ariaLabel="Daily CTR and CPC for this ad"
                          points={ad.timeseries}
                          currency={currency}
                          left={{ label: "CTR %", kind: "percent" }}
                          right={{ label: "CPC", kind: "money" }}
                          series={[
                            { key: "ctr", label: "CTR", type: "line", axis: "left", color: "var(--color-chart-1)" },
                            { key: "cpc", label: "CPC", type: "line", axis: "right", color: "var(--color-chart-2)", dashed: true },
                          ]}
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
                      <table className="w-full text-sm">
                        <caption className="px-5 pt-5 text-left text-[15px] font-semibold text-ink">Period totals</caption>
                        <thead>
                          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-subtle">
                            <th scope="col" className="px-5 py-3 text-left">Metric</th>
                            <th scope="col" className="px-5 py-3 text-right">This period</th>
                            <th scope="col" className="px-5 py-3 text-right">Previous ({formatRange(ad.previous_period.start, ad.previous_period.end)})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows(ad.metrics, currency).map(([label, value], i) => (
                            <tr key={label} className="border-b border-line last:border-0">
                              <th scope="row" className="px-5 py-2 text-left font-medium text-muted">{label}</th>
                              <td className="px-5 py-2 text-right font-semibold tabular-nums text-ink">{value}</td>
                              <td className="px-5 py-2 text-right tabular-nums text-muted">{ad.previous_metrics.has_data ? prev[i]?.[1] : "No data"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              }}
            </QueryState>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
