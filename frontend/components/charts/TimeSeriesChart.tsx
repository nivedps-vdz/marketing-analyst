"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/ui/States";
import { formatByKind, formatDate, type MetricKind } from "@/lib/format";
import type { MetricKey, Point } from "@/lib/types";

export interface SeriesDef {
  key: MetricKey;
  label: string;
  type: "bar" | "line";
  axis: "left" | "right";
  color: string;
  dashed?: boolean;
}

export interface AxisDef {
  label: string;
  kind: MetricKind;
}

const AXIS_STYLE = { fontSize: 11, fill: "var(--color-muted)" };

function ChartTooltip({ active, payload, label, series, left, right, currency }: {
  active?: boolean;
  payload?: { payload: Point }[];
  label?: string;
  series: SeriesDef[];
  left: AxisDef;
  right?: AxisDef;
  currency: string | null;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">{formatDate(label)}</p>
      {!p.has_data ? <p className="text-muted">No synced data for this day</p> : null}
      {p.has_data
        ? series.map((s) => {
            const kind = s.axis === "left" ? left.kind : right!.kind;
            return (
              <p key={s.key} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
                  {s.label}
                </span>
                <span className="font-semibold text-ink">
                  {p[s.key] === null ? "Undefined" : formatByKind(kind, p[s.key], currency)}
                </span>
              </p>
            );
          })
        : null}
    </div>
  );
}

/**
 * Daily time series. Metrics with different units must use separate, labelled axes (left/right).
 * Days without synced data are null and appear as gaps, not zeros.
 */
export function TimeSeriesChart({ points, series, left, right, currency, height = 240, ariaLabel }: {
  points: Point[];
  series: SeriesDef[];
  left: AxisDef;
  right?: AxisDef;
  currency: string | null;
  height?: number;
  ariaLabel: string;
}) {
  const hasValues = points.some((p) => series.some((s) => p[s.key] !== null && p[s.key] !== undefined));
  if (!hasValues) {
    return (
      <EmptyState
        title="No data for this period"
        description="None of these metrics are available for the selected filters and dates."
      />
    );
  }
  const gaps = points.filter((p) => !p.has_data).length;
  const tick = (kind: MetricKind) => (v: number) => formatByKind(kind, v, currency, { compact: true });

  return (
    <figure aria-label={ariaLabel} className="m-0">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: right ? 4 : 12, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => formatDate(d, { year: false })}
              tick={AXIS_STYLE}
              axisLine={false}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              yAxisId="left"
              tick={AXIS_STYLE}
              tickFormatter={tick(left.kind)}
              axisLine={false}
              tickLine={false}
              width={58}
              label={{ value: left.label, angle: -90, position: "insideLeft", offset: 6, style: { ...AXIS_STYLE, textAnchor: "middle" } }}
            />
            {right ? (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={AXIS_STYLE}
                tickFormatter={tick(right.kind)}
                axisLine={false}
                tickLine={false}
                width={58}
                label={{ value: right.label, angle: 90, position: "insideRight", offset: 6, style: { ...AXIS_STYLE, textAnchor: "middle" } }}
              />
            ) : null}
            <Tooltip
              cursor={{ fill: "var(--color-brand-soft)", opacity: 0.5 }}
              content={(props) => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload as unknown as { payload: Point }[]}
                  label={props.label as string}
                  series={series}
                  left={left}
                  right={right}
                  currency={currency}
                />
              )}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--color-muted)", paddingTop: 8 }} />
            {series.map((s) =>
              s.type === "bar" ? (
                <Bar key={s.key} yAxisId={s.axis} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
              ) : (
                <Line
                  key={s.key}
                  yAxisId={s.axis}
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeDasharray={s.dashed ? "5 4" : undefined}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ),
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {gaps > 0 ? (
        <figcaption className="mt-1 px-2 text-[11px] text-muted">
          {gaps} day{gaps === 1 ? "" : "s"} without synced data shown as gaps.
        </figcaption>
      ) : null}
    </figure>
  );
}
