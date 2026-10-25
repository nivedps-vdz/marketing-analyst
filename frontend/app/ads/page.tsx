"use client";

import { useSearchParams } from "next/navigation";

import { AdDetailDialog } from "@/components/analytics/AdDetailDialog";
import { AdGallery } from "@/components/analytics/AdGallery";
import { ClientFilter } from "@/components/analytics/ClientFilter";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useFilters, useSetParams } from "@/lib/filters";
import { formatRange } from "@/lib/format";
import { useAds, useSummary } from "@/lib/queries";
import type { CreativeFormat, ResultType, SortKey } from "@/lib/types";

export default function AdsPage() {
  const f = useFilters();
  const sp = useSearchParams();
  const set = useSetParams();
  const client = sp.get("client") ? Number(sp.get("client")) : null;
  const format = (sp.get("format") as CreativeFormat | null) ?? null;
  const p = {
    sort: (sp.get("sort") as SortKey | null) ?? "spend",
    order: (sp.get("order") as "asc" | "desc" | null) ?? "desc",
    rt: (sp.get("rt") as ResultType | null) ?? null,
  };
  const openAd = sp.get("ad") ? Number(sp.get("ad")) : null;
  const openClient = sp.get("adclient") ? Number(sp.get("adclient")) : null;
  const clientIds = client ? [client] : undefined;
  const ads = useAds(
    { ready: f.ready, api: { ...f.api, client_ids: clientIds, format: format ?? undefined, result_type: p.rt ?? undefined } },
    undefined,
    p.sort,
    p.order,
  );
  const summary = useSummary({ ready: f.ready, api: { ...f.api, client_ids: clientIds } });

  return (
    <>
      <PageHeader
        title="Ads"
        subtitle={f.ready ? `Individual ads across clients · ${formatRange(f.start, f.end)}` : undefined}
        actions={
          <>
            <ClientFilter value={client} onChange={(v) => set({ client: v })} />
            <Select label="Creative format" value={format ?? ""} onChange={(e) => set({ format: e.target.value || null })}>
              <option value="">All formats</option>
              {["image", "video", "carousel", "other", "unknown"].map((v) => <option key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</option>)}
            </Select>
          </>
        }
      />
      <AdGallery
        ads={ads}
        currency={summary.data?.currency ?? null}
        p={p}
        set={set}
        showClient={!client}
        onOpen={(a) => set({ ad: String(a.id), adclient: String(a.client_id) })}
      />
      {openClient ? (
        <AdDetailDialog
          clientId={openClient}
          adId={openAd}
          period={{ start: f.start, end: f.end }}
          currency={summary.data?.currency ?? null}
          onClose={() => set({ ad: null, adclient: null })}
        />
      ) : null}
    </>
  );
}
