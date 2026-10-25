"use client";

import { ClientCard } from "@/components/analytics/ClientCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, QueryState, Skeleton } from "@/components/ui/States";
import { useFilters, useGlobalQuery } from "@/lib/filters";
import { formatRange } from "@/lib/format";
import { useClientCards } from "@/lib/queries";

export default function ClientsPage() {
  const f = useFilters();
  const cards = useClientCards({ ready: f.ready, api: f.api });
  const gq = useGlobalQuery();
  return (
    <>
      <PageHeader title="Clients" subtitle={f.ready ? `Performance for ${formatRange(f.start, f.end)}` : undefined} />
      <QueryState
        query={cards}
        loading={<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>}
        isEmpty={(d) => d.clients.length === 0}
        empty={<EmptyState title="No clients yet" description="Run scripts\seed-demo.ps1 to load demo clients." />}
      >
        {(d) => (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {d.clients.map((c) => <ClientCard key={c.id} client={c} query={gq} />)}
          </div>
        )}
      </QueryState>
    </>
  );
}
