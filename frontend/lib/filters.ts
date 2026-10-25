"use client";

// Global filters (reporting period, platform) live in the URL so every page and link shares them.
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { apiGet } from "./api";
import type { MetaInfo } from "./types";

export const GLOBAL_KEYS = ["start", "end", "platform"] as const;

export function useMeta() {
  return useQuery({
    queryKey: ["meta"],
    queryFn: ({ signal }) => apiGet<MetaInfo>("/meta", undefined, signal),
    staleTime: 5 * 60_000,
  });
}

export interface Filters {
  ready: boolean;
  start: string;
  end: string;
  platform: string;
  /** Params for API calls. */
  api: { start: string; end: string; platform?: string };
}

export function useFilters(): Filters {
  const sp = useSearchParams();
  const meta = useMeta();
  const start = sp.get("start") ?? meta.data?.default_period.start ?? "";
  const end = sp.get("end") ?? meta.data?.default_period.end ?? "";
  const platform = sp.get("platform") ?? "all";
  return useMemo(
    () => ({
      ready: Boolean(start && end),
      start,
      end,
      platform,
      api: { start, end, platform: platform === "all" ? undefined : platform },
    }),
    [start, end, platform],
  );
}

/** Update URL search params, keeping the others. ``null`` removes a key. */
export function useSetParams() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return useCallback(
    (updates: Record<string, string | null>, opts: { replace?: boolean } = {}) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (opts.replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [router, pathname, sp],
  );
}

/** Query string with only the global filters, for building navigation links. */
export function useGlobalQuery(): string {
  const sp = useSearchParams();
  const q = new URLSearchParams();
  for (const k of GLOBAL_KEYS) {
    const v = sp.get(k);
    if (v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  const [y1, m1, d1] = start.split("-").map(Number);
  const [y2, m2, d2] = end.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000) + 1;
}
