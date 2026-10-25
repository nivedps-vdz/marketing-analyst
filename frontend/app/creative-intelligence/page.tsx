"use client";

import { Info, Link2, Upload } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { RankingCard } from "@/components/analytics/Rankings";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader, SectionTitle } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { EmptyState, QueryState } from "@/components/ui/States";
import { useFilters, useSetParams } from "@/lib/filters";
import { useClients, useRankings, useSummary } from "@/lib/queries";

const CONFIG_FIELDS = [
  { id: "industry", label: "Client industry", placeholder: "e.g. Real estate" },
  { id: "geo", label: "Target geography", placeholder: "e.g. Kozhikode, Malappuram, GCC NRIs" },
  { id: "competitors", label: "Competitor names", placeholder: "One per line" },
  { id: "urls", label: "Competitor website URLs", placeholder: "https://…" },
  { id: "products", label: "Products and services", placeholder: "e.g. 2BHK apartments, villa plots" },
  { id: "keywords", label: "Keywords and offers", placeholder: "e.g. site visit offer, zero brokerage" },
  { id: "formats", label: "Creative formats of interest", placeholder: "e.g. vertical video, carousel" },
];

const LIBRARY_COLUMNS = ["Competitor", "Creative", "Format", "Copy and headline", "Offer / CTA", "First seen", "Last seen", "Source", "Confidence"];

export default function CreativeIntelligencePage() {
  const f = useFilters();
  const sp = useSearchParams();
  const set = useSetParams();
  const clients = useClients();
  const selected = sp.get("client") ? Number(sp.get("client")) : clients.data?.clients.find((c) => c.ad_accounts.length)?.id ?? null;
  const current = clients.data?.clients.find((c) => c.id === selected);
  const scope = { ready: f.ready && selected !== null, api: f.api };
  const rankings = useRankings(scope, selected ?? 0);
  const summary = useSummary(scope, selected ?? undefined);

  return (
    <>
      <PageHeader
        title="Creative Intelligence"
        subtitle="Creative ideas from each client's own results, plus a library of public competitor ads."
        actions={
          <Select label="Client" className="min-w-[240px]" value={selected ?? ""} onChange={(e) => set({ client: e.target.value || null })}>
            {clients.data?.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        }
      />

      <Card className="mb-5 flex items-start gap-3 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
        <p className="text-xs leading-relaxed text-muted">
          <span className="font-semibold text-ink">Automated competitor discovery is not active.</span> Competitor management, manual
          import and the observation library arrive in Phase 3; daily discovery in Phase 4. The section on client-owned creatives uses
          calculated metrics. No competitor spend, CPA, conversions or ROAS will be shown, because they are not public.
        </p>
      </Card>

      <SectionTitle>What is working for {current?.name ?? "this client"} (client-owned ads)</SectionTitle>
      {selected === null ? (
        <Card><EmptyState title="Choose a client" /></Card>
      ) : (
        <QueryState query={rankings}>
          {(d) => {
            const picks = d.rankings.filter((r) => r.key !== "highest_ctr").slice(0, 3);
            return picks.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {picks.map((r) => <RankingCard key={r.key} ranking={r} currency={summary.data?.currency ?? null} />)}
              </div>
            ) : (
              <Card><EmptyState title="No ranked ads" description={d.unavailable_reason ?? "This client has no ads with enough data in the selected period."} /></Card>
            );
          }}
        </QueryState>
      )}

      <div className="mt-7 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader title="Research configuration" subtitle="Used to judge how relevant a competitor creative is to this client" action={<Badge tone="brand">Phase 3</Badge>} />
          <CardBody>
            <fieldset disabled className="space-y-3">
              <legend className="sr-only">Research configuration (not editable yet)</legend>
              {CONFIG_FIELDS.map((fld) => (
                <label key={fld.id} className="block text-xs font-medium text-muted">
                  {fld.label}
                  <input
                    className="mt-1 h-10 w-full cursor-not-allowed rounded-xl border border-line bg-page px-3 text-sm text-ink placeholder:text-subtle"
                    placeholder={fld.placeholder}
                    defaultValue={fld.id === "industry" ? current?.industry ?? "" : fld.id === "geo" ? current?.geography ?? "" : ""}
                  />
                </label>
              ))}
            </fieldset>
            <p className="mt-3 text-[11px] text-muted">Industry and geography come from the client profile. Saving the other fields starts in Phase 3.</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Competitor creative library"
            subtitle="Observed public ads with source links and verification dates"
            action={
              <div className="flex gap-2">
                <Button size="sm" disabled title="Available in Phase 3"><Link2 className="h-3.5 w-3.5" aria-hidden /> Add ad URL</Button>
                <Button size="sm" disabled title="Available in Phase 3"><Upload className="h-3.5 w-3.5" aria-hidden /> Import screenshot</Button>
              </div>
            }
          />
          <CardBody className="overflow-x-auto px-2">
            <table className="w-full min-w-[760px] text-sm">
              <caption className="sr-only">Competitor creative observations</caption>
              <thead>
                <tr className="border-b border-line">
                  {LIBRARY_COLUMNS.map((c) => (
                    <th key={c} scope="col" className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-subtle">{c}</th>
                  ))}
                </tr>
              </thead>
            </table>
            <EmptyState
              title="No observations yet"
              description="Competitor ads will be added by URL, screenshot, media file or copied text, each with its source and a reliability rating. First-seen and last-seen dates are recorded only when verifiable."
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
