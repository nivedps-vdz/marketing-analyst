"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/ui/States";
import { formatByKind, type MetricKind } from "@/lib/format";

export interface BarDatum {
  id: string | number;
  name: string;
  value: number | null;
  sub?: string;
  /** Optional reason shown for excluded rows. */
  reason?: string | null;
}

/** Horizontal ranked bars. Rows without a value are listed below the chart, never drawn as zero. */
export function BarComparison({ data, kind, currency, label, color = "var(--color-chart-1)", onSelect, highlightId, ariaLabel }: {
  data: BarDatum[];
  kind: MetricKind;
  currency: string | null;
  label: string;
  color?: string;
  onSelect?: (id: string | number) => void;
  highlightId?: string | number | null;
  ariaLabel: string;
}) {
  const shown = data.filter((d) => d.value !== null);
  const missing = data.filter((d) => d.value === null);
  if (!shown.length) {
    return <EmptyState title="Nothing to compare" description={`${label} is not available for any item in this selection.`} />;
  }
  const height = Math.max(120, shown.length * 34 + 30);
  const fmt = (v: number) => formatByKind(kind, v, currency, { compact: true });

  return (
    <figure aria-label={ariaLabel} className="m-0">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={shown} layout="vertical" margin={{ top: 4, right: 56, left: 4, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke="var(--color-line)" />
            <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fontSize: 11, fill: "var(--color-ink)" }}
              tickFormatter={(n: string) => (n.length > 24 ? `${n.slice(0, 23)}…` : n)}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--color-brand-soft)", opacity: 0.5 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as BarDatum;
                return (
                  <div className="max-w-xs rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-ink">{d.name}</p>
                    {d.sub ? <p className="text-muted">{d.sub}</p> : null}
                    <p className="mt-1 text-ink">{label}: <span className="font-semibold">{formatByKind(kind, d.value, currency)}</span></p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="value"
              name={label}
              radius={[0, 6, 6, 0]}
              maxBarSize={20}
              isAnimationActive={false}
              cursor={onSelect ? "pointer" : undefined}
              onClick={onSelect ? (d) => onSelect((d as unknown as BarDatum).id) : undefined}
            >
              {shown.map((d) => (
                <Cell key={d.id} fill={highlightId === undefined || highlightId === null || highlightId === d.id ? color : "var(--color-line-strong)"} />
              ))}
              <LabelList dataKey="value" position="right" formatter={(v) => fmt(Number(v))} style={{ fontSize: 11, fill: "var(--color-ink)", fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {missing.length ? (
        <figcaption className="mt-1 px-2 text-[11px] text-muted">
          Not shown ({label.toLowerCase()} unavailable): {missing.map((m) => m.name).join(", ")}
        </figcaption>
      ) : null}
    </figure>
  );
}
