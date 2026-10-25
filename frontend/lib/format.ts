// Display formatting only. Business metrics are calculated by the backend; nothing here derives ratios.
import type { MetricKey, ResultType } from "./types";

export const EMPTY = "—";

const CURRENCY_SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£", AED: "AED " };

export function currencySymbol(currency: string | null | undefined): string {
  if (!currency) return "";
  return CURRENCY_SYMBOLS[currency] ?? `${currency} `;
}

/** Indian-style compact numbers: 1.2K, 5.04L (lakh), 1.25Cr (crore). */
export function compactNumber(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const fmt = (v: number) => v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2).replace(/\.?0+$/, "");
  if (abs >= 1e7) return `${sign}${fmt(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${sign}${fmt(abs / 1e5)}L`;
  if (abs >= 1e3) return `${sign}${fmt(abs / 1e3)}K`;
  return `${sign}${fmt(abs)}`;
}

export function formatNumber(n: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (n === null || n === undefined || Number.isNaN(n)) return EMPTY;
  if (opts.compact && Math.abs(n) >= 1e4) return compactNumber(n);
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

export function formatMoney(
  n: number | null | undefined,
  currency: string | null | undefined,
  opts: { compact?: boolean; decimals?: number } = {},
): string {
  if (n === null || n === undefined || Number.isNaN(n)) return EMPTY;
  const sym = currencySymbol(currency);
  if (opts.compact && Math.abs(n) >= 1e5) return `${sym}${compactNumber(n)}`;
  const decimals = opts.decimals ?? (Math.abs(n) >= 1000 ? 0 : 2);
  return `${sym}${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)}`;
}

export function formatPercent(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return EMPTY;
  return `${n.toFixed(decimals)}%`;
}

export function formatRoas(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return EMPTY;
  return `${n.toFixed(2)}×`;
}

export function formatChange(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return EMPTY;
  const v = Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1);
  return `${n > 0 ? "+" : ""}${v}%`;
}

export type MetricKind = "money" | "count" | "percent" | "ratio";

export const METRICS: Record<MetricKey, { label: string; kind: MetricKind; short?: string; help?: string }> = {
  spend: { label: "Amount spent", short: "Spend", kind: "money" },
  impressions: { label: "Impressions", kind: "count" },
  reach: { label: "Reach", kind: "count", help: "Sum of daily reach; people reached on several days are counted more than once." },
  clicks: { label: "Clicks (all)", short: "Clicks", kind: "count" },
  ctr: { label: "CTR", kind: "percent", help: "Clicks ÷ impressions × 100" },
  cpc: { label: "CPC", kind: "money", help: "Spend ÷ clicks" },
  cpm: { label: "CPM", kind: "money", help: "Spend ÷ impressions × 1,000" },
  leads: { label: "Leads", kind: "count", help: "Leads from lead-objective campaigns" },
  cost_per_lead: { label: "Cost per lead", short: "CPL", kind: "money", help: "Spend on lead campaigns ÷ leads" },
  purchases: { label: "Purchases", kind: "count", help: "Purchases from sales-objective campaigns" },
  cost_per_purchase: { label: "Cost per purchase", short: "CPP", kind: "money", help: "Spend on sales campaigns ÷ purchases" },
  purchase_value: { label: "Purchase value", short: "Value", kind: "money", help: "Attributed purchase conversion value" },
  roas: { label: "ROAS", kind: "ratio", help: "Purchase value ÷ spend on sales campaigns" },
};

export function formatByKind(
  kind: MetricKind,
  value: number | null | undefined,
  currency: string | null | undefined,
  opts: { compact?: boolean } = {},
): string {
  switch (kind) {
    case "money":
      return formatMoney(value, currency, opts);
    case "percent":
      return formatPercent(value);
    case "ratio":
      return formatRoas(value);
    default:
      return formatNumber(value, opts);
  }
}

export function formatMetric(
  key: MetricKey,
  value: number | null | undefined,
  currency: string | null | undefined,
  opts: { compact?: boolean } = {},
): string {
  return formatByKind(METRICS[key].kind, value, currency, opts);
}

export const RESULT_LABELS: Record<ResultType, { one: string; many: string; cost: string }> = {
  lead: { one: "Lead", many: "Leads", cost: "Cost per lead" },
  purchase: { one: "Purchase", many: "Purchases", cost: "Cost per purchase" },
};

export function resultLabel(t: ResultType | null | undefined, plural = true): string {
  if (!t) return "Results";
  return plural ? RESULT_LABELS[t].many : RESULT_LABELS[t].one;
}

export function costLabel(t: ResultType | null | undefined): string {
  return t ? RESULT_LABELS[t].cost : "Cost per result";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-24" -> "24 Oct 2026" without timezone conversion. */
export function formatDate(iso: string | null | undefined, opts: { year?: boolean } = { year: true }): string {
  if (!iso) return EMPTY;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}${opts.year === false ? "" : ` ${y}`}`;
}

export function formatRange(start: string, end: string): string {
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${formatDate(start, { year: !sameYear })} – ${formatDate(end)}`;
}

export function formatPlacement(p: string): string {
  const map: Record<string, string> = {
    feed: "Feed",
    stories: "Stories",
    reels: "Reels",
    explore: "Explore",
    right_column: "Right column",
    in_stream_video: "In-stream video",
  };
  return map[p] ?? p.replace(/_/g, " ");
}

export function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s_])\w/g, (c) => c.toUpperCase()).replace(/_/g, " ");
}
