"use client";

import { Bar, BarChart, ResponsiveContainer } from "recharts";

/** Small daily-spend bars in the style of the CRM "Won Deals Revenue" card. Decorative; values are in the card. */
export function Sparkline({ data, label }: { data: { date: string; spend: number | null }[]; label: string }) {
  if (!data.length) return <div className="h-12" aria-hidden />;
  return (
    <div className="h-12" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <Bar dataKey="spend" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
