"use client";

import { ChartCard } from "@/components/charts/ChartCard";
import { TimeSeriesChart, type AxisDef, type SeriesDef } from "@/components/charts/TimeSeriesChart";
import type { Timeseries } from "@/lib/types";

interface ChartDef {
  id: string;
  title: string;
  subtitle: string;
  left: AxisDef;
  right?: AxisDef;
  series: SeriesDef[];
  footer?: string;
}

const C1 = "var(--color-chart-1)";
const C2 = "var(--color-chart-2)";
const C3 = "var(--color-chart-3)";
const C4 = "var(--color-chart-4)";

export const CHARTS: Record<string, ChartDef> = {
  spend: {
    id: "spend",
    title: "Daily advertising spend",
    subtitle: "Amount spent per day",
    left: { label: "Spend", kind: "money" },
    series: [{ key: "spend", label: "Spend", type: "bar", axis: "left", color: C1 }],
  },
  delivery: {
    id: "delivery",
    title: "Impressions, reach and clicks",
    subtitle: "Left axis: impressions and reach · right axis: clicks",
    left: { label: "Impressions / reach", kind: "count" },
    right: { label: "Clicks", kind: "count" },
    series: [
      { key: "impressions", label: "Impressions", type: "line", axis: "left", color: C2 },
      { key: "reach", label: "Reach (daily)", type: "line", axis: "left", color: C3, dashed: true },
      { key: "clicks", label: "Clicks", type: "line", axis: "right", color: C1 },
    ],
    footer: "Daily reach is de-duplicated within each day only.",
  },
  ctrCpc: {
    id: "ctrCpc",
    title: "CTR and CPC",
    subtitle: "Left axis: CTR (%) · right axis: CPC (currency)",
    left: { label: "CTR %", kind: "percent" },
    right: { label: "CPC", kind: "money" },
    series: [
      { key: "ctr", label: "CTR", type: "line", axis: "left", color: C1 },
      { key: "cpc", label: "CPC", type: "line", axis: "right", color: C2, dashed: true },
    ],
  },
  conversions: {
    id: "conversions",
    title: "Leads and purchases",
    subtitle: "Results from lead-objective and sales-objective campaigns, shown separately",
    left: { label: "Count", kind: "count" },
    series: [
      { key: "leads", label: "Leads", type: "bar", axis: "left", color: C1 },
      { key: "purchases", label: "Purchases", type: "bar", axis: "left", color: C3 },
    ],
    footer: "Leads and purchases are different conversion types and are never added together.",
  },
  costPerResult: {
    id: "costPerResult",
    title: "Cost per conversion",
    subtitle: "Cost per lead and cost per purchase",
    left: { label: "Cost", kind: "money" },
    series: [
      { key: "cost_per_lead", label: "Cost per lead", type: "line", axis: "left", color: C1 },
      { key: "cost_per_purchase", label: "Cost per purchase", type: "line", axis: "left", color: C4 },
    ],
    footer: "Each cost uses only the spend of campaigns optimising for that result. Days with no results are gaps.",
  },
  valueRoas: {
    id: "valueRoas",
    title: "Conversion value and ROAS",
    subtitle: "Left axis: purchase value · right axis: ROAS (×)",
    left: { label: "Purchase value", kind: "money" },
    right: { label: "ROAS", kind: "ratio" },
    series: [
      { key: "purchase_value", label: "Purchase value", type: "bar", axis: "left", color: C3 },
      { key: "roas", label: "ROAS", type: "line", axis: "right", color: C1 },
    ],
    footer: "ROAS = attributed purchase value ÷ spend on sales-objective campaigns.",
  },
  spendResults: {
    id: "spendResults",
    title: "Spend and conversions",
    subtitle: "Left axis: spend · right axis: leads and purchases",
    left: { label: "Spend", kind: "money" },
    right: { label: "Count", kind: "count" },
    series: [
      { key: "spend", label: "Spend", type: "bar", axis: "left", color: C1 },
      { key: "leads", label: "Leads", type: "line", axis: "right", color: C2 },
      { key: "purchases", label: "Purchases", type: "line", axis: "right", color: C3 },
    ],
  },
  cpaRoas: {
    id: "cpaRoas",
    title: "CPA and ROAS",
    subtitle: "Left axis: cost per result · right axis: ROAS (×)",
    left: { label: "Cost", kind: "money" },
    right: { label: "ROAS", kind: "ratio" },
    series: [
      { key: "cost_per_lead", label: "Cost per lead", type: "line", axis: "left", color: C2 },
      { key: "cost_per_purchase", label: "Cost per purchase", type: "line", axis: "left", color: C4 },
      { key: "roas", label: "ROAS", type: "line", axis: "right", color: C1 },
    ],
  },
};

/** Hide series whose metric is unavailable for the whole period (e.g. ROAS for a lead-only client). */
function available(def: ChartDef, ts: Timeseries): ChartDef | null {
  const series = def.series.filter((s) => ts.points.some((p) => p[s.key] !== null));
  if (!series.length) return { ...def, series: def.series };
  const usesRight = series.some((s) => s.axis === "right");
  const usesLeft = series.some((s) => s.axis === "left");
  if (!usesLeft) {
    // Promote the right axis to the left so the chart keeps a labelled axis.
    return { ...def, left: def.right!, right: undefined, series: series.map((s) => ({ ...s, axis: "left" })) };
  }
  return { ...def, right: usesRight ? def.right : undefined, series };
}

export function PerformanceCharts({ ids, query }: {
  ids: (keyof typeof CHARTS)[];
  query: { data?: Timeseries; isPending: boolean; error: unknown; refetch: () => unknown };
}) {
  return (
    <>
      {ids.map((id) => {
        const base = CHARTS[id];
        const def = query.data ? available(base, query.data) : base;
        return (
          <ChartCard
            key={id}
            title={base.title}
            subtitle={def?.subtitle ?? base.subtitle}
            footer={base.footer}
            isLoading={query.isPending}
            error={query.error}
            onRetry={() => query.refetch()}
          >
            {query.data && def ? (
              <TimeSeriesChart
                ariaLabel={base.title}
                points={query.data.points}
                series={def.series}
                left={def.left}
                right={def.right}
                currency={query.data.currency}
              />
            ) : null}
          </ChartCard>
        );
      })}
    </>
  );
}
