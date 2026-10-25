import { formatMoney, formatNumber, formatPercent, formatRoas, resultLabel } from "@/lib/format";
import type { EntityMetrics, SortKey } from "@/lib/types";

export interface MetricColumn {
  key: SortKey;
  label: string;
  render: (m: EntityMetrics, currency: string | null) => string;
}

export const METRIC_COLUMNS: MetricColumn[] = [
  { key: "spend", label: "Spend", render: (m, c) => formatMoney(m.spend, c) },
  { key: "impressions", label: "Impr.", render: (m) => formatNumber(m.impressions) },
  { key: "clicks", label: "Clicks", render: (m) => formatNumber(m.clicks) },
  { key: "ctr", label: "CTR", render: (m) => formatPercent(m.ctr) },
  { key: "cpc", label: "CPC", render: (m, c) => formatMoney(m.cpc, c, { decimals: 2 }) },
  {
    key: "results",
    label: "Results",
    render: (m) => (m.result_type ? `${formatNumber(m.results)} ${resultLabel(m.result_type, m.results !== 1).toLowerCase()}` : "n/a"),
  },
  { key: "cpa", label: "Cost / result", render: (m, c) => (m.result_type ? formatMoney(m.cpa, c, { decimals: 2 }) : "n/a") },
  { key: "roas", label: "ROAS", render: (m) => (m.result_type === "purchase" ? formatRoas(m.roas) : "n/a") },
];

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "spend", label: "Spend" },
  { value: "ctr", label: "CTR" },
  { value: "cpc", label: "CPC" },
  { value: "results", label: "Conversions" },
  { value: "cpa", label: "Cost per result (CPA)" },
  { value: "roas", label: "ROAS" },
  { value: "impressions", label: "Impressions" },
  { value: "name", label: "Name" },
];
