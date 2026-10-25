import { Info } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { ChangePill } from "@/components/ui/ChangePill";
import { Skeleton } from "@/components/ui/States";
import { METRICS, formatMetric } from "@/lib/format";
import type { MetricKey, MetricValue } from "@/lib/types";

export function KpiCard({ metricKey, metric, currency, previousDays }: {
  metricKey: MetricKey;
  metric: MetricValue;
  currency: string | null;
  previousDays: number;
}) {
  const def = METRICS[metricKey];
  const help = [def.help, metric.note].filter(Boolean).join(" ");
  const unavailable = metric.value === null;
  return (
    <Card className="flex flex-col p-5" as="article">
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex items-center gap-1 text-[13px] font-semibold text-ink">
          {def.label}
          {help ? (
            <span title={help} className="text-subtle">
              <Info className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">{help}</span>
            </span>
          ) : null}
        </h3>
        {!unavailable ? <ChangePill metric={metric} /> : null}
      </div>
      {unavailable ? (
        <>
          <p className="mt-3 text-base font-semibold text-subtle">Not available</p>
          <p className="mt-1 text-[11px] leading-snug text-muted">{metric.unavailable_reason}</p>
        </>
      ) : (
        <>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-ink" data-testid={`kpi-${metricKey}`}>
            {formatMetric(metricKey, metric.value, currency, { compact: true })}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {metric.previous === null || metric.previous === undefined
              ? `No data for previous ${previousDays} days`
              : `vs ${formatMetric(metricKey, metric.previous, currency, { compact: true })} previous ${previousDays} days`}
          </p>
        </>
      )}
    </Card>
  );
}

export function KpiGrid({ keys, metrics, currency, previousDays, loading }: {
  keys: MetricKey[];
  metrics?: Record<MetricKey, MetricValue>;
  currency: string | null;
  previousDays: number;
  loading?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
      {keys.map((k) =>
        loading || !metrics ? (
          <Card key={k} className="p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-4 h-7 w-28" />
            <Skeleton className="mt-2 h-3 w-32" />
          </Card>
        ) : (
          <KpiCard key={k} metricKey={k} metric={metrics[k]} currency={currency} previousDays={previousDays} />
        ),
      )}
    </div>
  );
}

export const DELIVERY_KEYS: MetricKey[] = ["spend", "impressions", "reach", "clicks", "ctr", "cpc", "cpm"];
export const RESULT_KEYS: MetricKey[] = ["leads", "cost_per_lead", "purchases", "cost_per_purchase", "purchase_value", "roas"];
