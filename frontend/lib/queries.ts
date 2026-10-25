"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { apiGet } from "./api";
import type {
  AdRow,
  AdSetRow,
  CampaignRow,
  ClientCardData,
  ClientProfile,
  Formats,
  Insights,
  Rankings,
  ResultType,
  SortKey,
  Summary,
  Timeseries,
} from "./types";

type P = Record<string, string | number | number[] | undefined | null>;

function useApi<T>(key: string, path: string, params: P, enabled = true) {
  return useQuery({
    queryKey: [key, path, params],
    queryFn: ({ signal }) => apiGet<T>(path, params, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export interface Scope {
  ready: boolean;
  api: P;
}

const base = (clientId?: number) => (clientId ? `/clients/${clientId}` : "/overview");

export const useSummary = (s: Scope, clientId?: number) => useApi<Summary>("summary", `${base(clientId)}/summary`, s.api, s.ready);
export const useTimeseries = (s: Scope, clientId?: number) =>
  useApi<Timeseries>("timeseries", `${base(clientId)}/timeseries`, s.api, s.ready);
export const useFormats = (s: Scope, clientId?: number) => useApi<Formats>("formats", `${base(clientId)}/formats`, s.api, s.ready);

export const useClientCards = (s: Scope) =>
  useApi<{ clients: ClientCardData[] }>("client-cards", "/overview/clients", s.api, s.ready);

export const useCampaignRanking = (s: Scope, sort: SortKey, order: "asc" | "desc", resultType: ResultType | null) =>
  useApi<{ campaigns: CampaignRow[]; total: number }>(
    "campaign-ranking",
    "/overview/campaign-ranking",
    { ...s.api, sort, order, result_type: resultType ?? undefined, limit: 10 },
    s.ready,
  );

export const useClient = (clientId: number) =>
  useApi<{ client: ClientProfile }>("client", `/clients/${clientId}`, {}, Number.isFinite(clientId));

export const useClients = () => useApi<{ clients: ClientProfile[] }>("clients", "/clients", {});

export const useCampaigns = (s: Scope, clientId: number | undefined, sort: SortKey, order: "asc" | "desc") =>
  useApi<{ campaigns: CampaignRow[] }>("campaigns", clientId ? `/clients/${clientId}/campaigns` : "/campaigns", { ...s.api, sort, order }, s.ready);

export const useAdSets = (s: Scope, clientId: number, sort: SortKey, order: "asc" | "desc") =>
  useApi<{ ad_sets: AdSetRow[] }>("adsets", `/clients/${clientId}/adsets`, { ...s.api, sort, order }, s.ready);

export const useAds = (s: Scope, clientId: number | undefined, sort: SortKey, order: "asc" | "desc") =>
  useApi<{ ads: AdRow[] }>("ads", clientId ? `/clients/${clientId}/ads` : "/ads", { ...s.api, sort, order }, s.ready);

export const useRankings = (s: Scope, clientId: number) => useApi<Rankings>("rankings", `/clients/${clientId}/rankings`, s.api, s.ready);
export const useInsights = (s: Scope, clientId: number) => useApi<Insights>("insights", `/clients/${clientId}/insights`, s.api, s.ready);
