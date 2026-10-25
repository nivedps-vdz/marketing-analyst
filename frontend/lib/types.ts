// Types mirror the FastAPI response payloads (backend/app/services/reporting.py).

export type DataSource = "demo" | "live";

export type MetricKey =
  | "spend"
  | "impressions"
  | "reach"
  | "clicks"
  | "ctr"
  | "cpc"
  | "cpm"
  | "leads"
  | "cost_per_lead"
  | "purchases"
  | "cost_per_purchase"
  | "purchase_value"
  | "roas";

export type ResultType = "lead" | "purchase";
export type CreativeFormat = "image" | "video" | "carousel" | "other" | "unknown";

export interface MetricValue {
  value: number | null;
  unavailable_reason: string | null;
  note?: string;
  previous?: number | null;
  change_pct?: number | null;
  direction?: "up" | "down" | "flat" | null;
  assessment?: "good" | "bad" | "neutral" | null;
}

export interface PeriodInfo {
  start: string;
  end: string;
  days: number;
}

export interface Envelope {
  data_source: DataSource;
}

export interface Summary extends Envelope {
  period: PeriodInfo;
  previous_period: PeriodInfo;
  currency: string | null;
  metrics: Record<MetricKey, MetricValue>;
}

export type Point = { date: string; has_data: boolean } & Record<MetricKey, number | null>;

export interface Timeseries extends Envelope {
  period: PeriodInfo;
  currency: string | null;
  data_from: string | null;
  data_through: string | null;
  points: Point[];
}

export interface EntityMetrics {
  spend: number;
  impressions: number;
  reach: number | null;
  clicks: number;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  result_type: ResultType | null;
  results: number | null;
  cpa: number | null;
  result_value: number | null;
  roas: number | null;
  has_data: boolean;
}

export interface CampaignInfo {
  id: number;
  external_id: string;
  name: string;
  objective: string;
  objective_category: string;
  objective_label: string;
  status: string;
  platform: string;
  client_id: number;
  client_name: string | null;
}

export interface CampaignRow extends CampaignInfo {
  metrics: EntityMetrics;
}

export interface AdSetRow {
  id: number;
  external_id: string;
  name: string;
  status: string;
  optimization_goal: string | null;
  campaign: { id: number; name: string };
  metrics: EntityMetrics;
}

export interface CreativeInfo {
  id?: number;
  external_id?: string;
  format: CreativeFormat;
  format_label: string;
  aspect_ratio: string | null;
  is_vertical_video: boolean | null;
  thumbnail_url: string | null;
  headline: string | null;
  body: string | null;
  call_to_action: string | null;
}

export interface AdRow {
  id: number;
  external_id: string;
  name: string;
  status: string;
  client_id: number;
  client_name: string | null;
  campaign: CampaignInfo;
  ad_set: { id: number; name: string };
  creative: CreativeInfo;
  placements: string[] | null;
  metrics: EntityMetrics;
}

export interface AdDetail extends AdRow {
  previous_metrics: EntityMetrics;
  previous_period: PeriodInfo;
  timeseries: Point[];
  campaign_context: {
    metrics: EntityMetrics;
    spend_share: number | null;
    ads_in_campaign: number;
    rank_in_campaign: number | null;
    rank_basis: "results" | "spend";
  };
}

export interface AdAccountInfo {
  id: number;
  platform: string;
  platform_label: string;
  external_id: string;
  name: string;
  currency: string;
  timezone: string;
  connection_status: "connected" | "expired" | "error" | "not_connected" | "demo";
  last_synced_at: string | null;
  data_through: string | null;
}

export interface ClientProfile {
  id: number;
  slug: string;
  name: string;
  category: string;
  industry: string | null;
  geography: string | null;
  is_demo: boolean;
  ad_accounts: AdAccountInfo[];
  last_successful_sync: string | null;
}

export interface ClientCardData {
  id: number;
  slug: string;
  name: string;
  category: string;
  geography: string | null;
  is_demo: boolean;
  ad_accounts: AdAccountInfo[];
  connection_status: AdAccountInfo["connection_status"];
  currency: string | null;
  primary_result_type: ResultType | null;
  metrics: Record<
    "spend" | "leads" | "cost_per_lead" | "purchases" | "cost_per_purchase" | "purchase_value" | "roas",
    MetricValue
  >;
  sparkline: { date: string; spend: number | null }[];
}

export interface FormatRow {
  format: CreativeFormat;
  label: string;
  ad_count: number;
  spend_share: number | null;
  metrics: Record<MetricKey, number | null>;
}

export interface Formats extends Envelope {
  period: PeriodInfo;
  currency: string | null;
  note: string;
  rows: FormatRow[];
}

export interface RankingEntry {
  ad_id: number;
  name: string;
  campaign_name: string;
  format: CreativeFormat;
  metric_value: number | null;
  spend: number | null;
  impressions: number | null;
  results: number | null;
  result_type: ResultType | null;
  ctr: number | null;
  cpa: number | null;
  roas: number | null;
}

export interface Ranking {
  key: string;
  title: string;
  criteria: string;
  metric: "roas" | "cpa" | "results" | "ctr" | "cpc" | "cpm" | "spend";
  order: "asc" | "desc";
  caveat: string | null;
  considered: number;
  eligible: number;
  entries: RankingEntry[];
}

export interface Rankings extends Envelope {
  period: PeriodInfo;
  unavailable_reason?: string;
  thresholds?: { min_spend: number; min_impressions: number; min_conversions: number };
  rankings: Ranking[];
  needs_more_data: { criteria: string; entries: RankingEntry[] };
}

export interface Insight {
  kind: string;
  severity: "positive" | "info" | "warning";
  title: string;
  detail: string;
  entity: { type: string; id: number | string | null; name: string | null };
  evidence: Record<string, unknown>;
  basis: "calculated";
}

export interface Insights extends Envelope {
  period: PeriodInfo;
  unavailable_reason?: string;
  basis_note?: string;
  insights: Insight[];
}

export interface MetaInfo extends Envelope {
  today: string;
  timezone: string;
  data_from: string | null;
  data_through: string | null;
  default_period: PeriodInfo;
  platforms: { id: string; label: string; enabled: boolean }[];
  attribution_setting: string;
  thresholds: { min_spend: number; min_impressions: number; min_conversions: number };
}

export interface SearchResults extends Envelope {
  query: string;
  clients: { id: number; name: string; category: string }[];
  campaigns: { id: number; name: string; external_id: string; client_id: number; client_name: string | null }[];
  ads: {
    id: number;
    name: string;
    external_id: string;
    client_id: number;
    client_name: string | null;
    campaign_id: number;
  }[];
}

export type SortKey = "name" | "spend" | "impressions" | "clicks" | "ctr" | "cpc" | "cpm" | "results" | "cpa" | "roas";
