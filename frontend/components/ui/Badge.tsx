import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type Tone = "brand" | "positive" | "negative" | "neutral" | "warning" | "outline";

const TONES: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand",
  positive: "bg-positive-soft text-positive",
  negative: "bg-negative-soft text-negative",
  neutral: "bg-neutral-soft text-muted",
  warning: "bg-warning-soft text-warning",
  outline: "border border-line text-muted bg-card",
};

export function Badge({ tone = "neutral", children, className, title }: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS: Record<string, { tone: Tone; label: string }> = {
  connected: { tone: "positive", label: "Connected" },
  demo: { tone: "brand", label: "Demo account" },
  expired: { tone: "negative", label: "Token expired" },
  error: { tone: "negative", label: "Sync error" },
  not_connected: { tone: "neutral", label: "Not connected" },
};

export function ConnectionBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { tone: "neutral" as Tone, label: status };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function DeliveryBadge({ status }: { status: string }) {
  const active = status.toUpperCase() === "ACTIVE";
  return <Badge tone={active ? "positive" : "neutral"}>{active ? "Active" : status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}
