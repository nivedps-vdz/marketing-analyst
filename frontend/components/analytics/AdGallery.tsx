"use client";

import { Select } from "@/components/ui/Select";
import { EmptyState, QueryState, Skeleton } from "@/components/ui/States";
import type { AdRow, ResultType, SortKey } from "@/lib/types";

import { AdCard } from "./AdCard";
import { SORT_OPTIONS } from "./entityColumns";

export function AdGallery({ ads, currency, p, set, onOpen, showClient }: {
  ads: { data?: { ads: AdRow[] }; isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  currency: string | null;
  p: { sort: SortKey; order: "asc" | "desc"; rt: ResultType | null };
  set: (updates: Record<string, string | null>) => void;
  onOpen: (ad: AdRow) => void;
  showClient?: boolean;
}) {
  const mixed = (p.sort === "cpa" || p.sort === "results") && !p.rt;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select label="Sort by" value={p.sort} onChange={(e) => set({ sort: e.target.value })}>
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Select label="Order" value={p.order} onChange={(e) => set({ order: e.target.value })}>
          <option value="desc">Highest first</option>
          <option value="asc">Lowest first</option>
        </Select>
        <Select label="Result type" value={p.rt ?? ""} onChange={(e) => set({ rt: e.target.value || null })}>
          <option value="">All ads</option>
          <option value="lead">Lead ads</option>
          <option value="purchase">Sales ads</option>
        </Select>
        <p className="pb-2 text-[11px] text-muted">Ads with an undefined value for the sort metric are listed last.</p>
      </div>
      {mixed ? (
        <p className="mb-4 rounded-xl bg-warning-soft px-4 py-2 text-xs text-warning">
          Cost per lead and cost per purchase are not comparable. Choose a result type to rank ads fairly.
        </p>
      ) : null}
      <QueryState
        query={ads}
        loading={<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-96 rounded-2xl" />)}</div>}
        isEmpty={(d) => d.ads.length === 0}
        empty={<EmptyState title="No ads match these filters" description="Try another campaign, format or result type." />}
      >
        {(d) => (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {d.ads.map((a) => <AdCard key={a.id} ad={a} currency={currency} onOpen={onOpen} showClient={showClient} />)}
          </div>
        )}
      </QueryState>
    </>
  );
}
