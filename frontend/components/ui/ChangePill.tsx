import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/cn";
import { formatChange } from "@/lib/format";
import type { MetricValue } from "@/lib/types";

/**
 * Previous-period change. Colour reflects whether the change is favourable for the metric
 * (a lower cost per lead is green). Direction is also shown with an arrow and sign, not colour alone.
 */
export function ChangePill({ metric, className }: { metric: MetricValue; className?: string }) {
  if (metric.change_pct === null || metric.change_pct === undefined) return null;
  const tone =
    metric.assessment === "good"
      ? "bg-positive-soft text-positive"
      : metric.assessment === "bad"
        ? "bg-negative-soft text-negative"
        : "bg-neutral-soft text-muted";
  const Icon = metric.direction === "up" ? ArrowUpRight : metric.direction === "down" ? ArrowDownRight : ArrowRight;
  const verdict =
    metric.assessment === "good" ? "favourable" : metric.assessment === "bad" ? "unfavourable" : "no judgement";
  return (
    <span
      className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", tone, className)}
      aria-label={`${formatChange(metric.change_pct)} versus previous period, ${verdict}`}
      data-assessment={metric.assessment ?? "none"}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {formatChange(metric.change_pct)}
    </span>
  );
}
