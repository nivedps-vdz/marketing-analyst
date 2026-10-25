"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ClientFilter } from "@/components/analytics/ClientFilter";
import { EntityTable } from "@/components/analytics/EntityTable";
import { DeliveryBadge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { EmptyState, QueryState } from "@/components/ui/States";
import { useFilters, useGlobalQuery, useSetParams } from "@/lib/filters";
import { formatRange } from "@/lib/format";
import { useCampaigns, useSummary } from "@/lib/queries";
import type { ResultType, SortKey } from "@/lib/types";

export default function CampaignsPage() {
  const f = useFilters();
  const sp = useSearchParams();
  const set = useSetParams();
  const gq = useGlobalQuery();
  const client = sp.get("client") ? Number(sp.get("client")) : null;
  const sort = (sp.get("sort") as SortKey | null) ?? "spend";
  const order = (sp.get("order") as "asc" | "desc" | null) ?? "desc";
  const rt = (sp.get("rt") as ResultType | null) ?? null;
  const api = { ...f.api, client_ids: client ? [client] : undefined, result_type: rt ?? undefined };
  const q = useCampaigns({ ready: f.ready, api }, undefined, sort, order);
  const summary = useSummary({ ready: f.ready, api: { ...f.api, client_ids: client ? [client] : undefined } });
  const currency = summary.data?.currency ?? null;
  const link = (clientId: number, campaignId: number) => `/clients/${clientId}${gq ? `${gq}&` : "?"}tab=adsets&campaign=${campaignId}`;

  return (
    <>
      <PageHeader
        title="Campaigns"
        subtitle={f.ready ? `All clients · ${formatRange(f.start, f.end)}` : undefined}
        actions={
          <>
            <ClientFilter value={client} onChange={(v) => set({ client: v })} />
            <Select label="Objective result" value={rt ?? ""} onChange={(e) => set({ rt: e.target.value || null })}>
              <option value="">All objectives</option>
              <option value="lead">Lead campaigns</option>
              <option value="purchase">Sales campaigns</option>
            </Select>
          </>
        }
      />
      <Card>
        <CardHeader
          title="Campaign performance"
          subtitle={
            summary.data && currency === null
              ? "Accounts use different currencies, so money columns show amounts without a currency symbol."
              : "Click a column to sort. Click a campaign name to open its ad sets."
          }
        />
        <CardBody className="px-2">
          <QueryState query={q} isEmpty={(d) => d.campaigns.length === 0} empty={<EmptyState title="No campaigns match these filters" />}>
            {(d) => (
              <EntityTable
                caption="Campaigns across clients"
                rows={d.campaigns}
                currency={currency}
                sort={sort}
                order={order}
                onSort={(k) => set({ sort: k, order: sort === k && order === "desc" ? "asc" : "desc" })}
                leading={[
                  {
                    label: "Campaign",
                    render: (r) => (
                      <div className="min-w-[220px]">
                        <Link href={link(r.client_id, r.id)} className="font-semibold text-ink hover:text-brand">{r.name}</Link>
                        <p className="text-[11px] text-subtle">ID {r.external_id}</p>
                      </div>
                    ),
                  },
                  { label: "Client", render: (r) => <Link href={`/clients/${r.client_id}${gq}`} className="whitespace-nowrap text-xs font-medium text-brand hover:underline">{r.client_name}</Link> },
                  { label: "Objective", render: (r) => <span className="whitespace-nowrap text-xs">{r.objective_label}</span> },
                  { label: "Status", render: (r) => <DeliveryBadge status={r.status} /> },
                ]}
              />
            )}
          </QueryState>
        </CardBody>
      </Card>
    </>
  );
}
