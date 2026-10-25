import { ChangePill } from "@/components/ui/ChangePill";
import { METRICS, formatMetric } from "@/lib/format";
import type { MetricKey, Summary } from "@/lib/types";

/**
 * Current vs previous period for several metrics. Each metric has its own scale (bar length relative to the
 * larger of the two values), so different units are never plotted on a shared axis.
 */
export function PeriodComparison({ summary, keys }: { summary: Summary; keys: MetricKey[] }) {
  const rows = keys.filter((k) => summary.metrics[k].value !== null || summary.metrics[k].previous !== null);
  if (!rows.length) return <p className="py-8 text-center text-xs text-muted">No comparable metrics.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((k) => {
        const m = summary.metrics[k];
        const cur = m.value ?? 0;
        const prev = m.previous ?? 0;
        const max = Math.max(Math.abs(cur), Math.abs(prev)) || 1;
        return (
          <li key={k}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-ink">{METRICS[k].label}</span>
              <ChangePill metric={m} />
            </div>
            <div className="mt-1.5 grid grid-cols-[64px_1fr_88px] items-center gap-2 text-[11px]">
              <span className="text-muted">Current</span>
              <span className="h-2.5 rounded-full bg-neutral-soft">
                <span className="block h-full rounded-full bg-brand" style={{ width: m.value === null ? 0 : `${(Math.abs(cur) / max) * 100}%` }} />
              </span>
              <span className="text-right font-semibold tabular-nums text-ink">{formatMetric(k, m.value, summary.currency, { compact: true })}</span>
              <span className="text-muted">Previous</span>
              <span className="h-2.5 rounded-full bg-neutral-soft">
                <span className="block h-full rounded-full bg-ink/40" style={{ width: m.previous === null ? 0 : `${(Math.abs(prev) / max) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums text-muted">{m.previous === null ? "No data" : formatMetric(k, m.previous, summary.currency, { compact: true })}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
