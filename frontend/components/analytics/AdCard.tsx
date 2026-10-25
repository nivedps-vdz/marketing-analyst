import { Badge, DeliveryBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { costLabel, formatMoney, formatNumber, formatPercent, formatPlacement, formatRoas, resultLabel } from "@/lib/format";
import type { AdRow } from "@/lib/types";

import { CreativePreview } from "./CreativePreview";

function M({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[10px] text-muted">{label}</dt>
      <dd className="truncate text-xs font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

export function AdCard({ ad, currency, onOpen, showClient }: {
  ad: AdRow;
  currency: string | null;
  onOpen: (ad: AdRow) => void;
  showClient?: boolean;
}) {
  const m = ad.metrics;
  const rt = m.result_type;
  return (
    <Card as="article" className="flex flex-col overflow-hidden">
      <button type="button" onClick={() => onOpen(ad)} className="block p-3 text-left" aria-label={`Open details for ad ${ad.name}`}>
        <CreativePreview creative={ad.creative} />
      </button>
      <div className="flex flex-1 flex-col px-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <button type="button" onClick={() => onOpen(ad)} className="min-w-0 text-left">
            <h3 className="line-clamp-2 text-sm font-semibold text-ink hover:text-brand">{ad.name}</h3>
          </button>
          <DeliveryBadge status={ad.status} />
        </div>
        <p className="mt-0.5 text-[11px] text-subtle">ID {ad.external_id}</p>
        {showClient ? <p className="mt-1 truncate text-[11px] font-medium text-brand">{ad.client_name}</p> : null}
        <p className="mt-1 truncate text-[11px] text-muted" title={`${ad.campaign.name} › ${ad.ad_set.name}`}>
          {ad.campaign.name} › {ad.ad_set.name}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge tone="brand">{ad.creative.format_label}</Badge>
          {ad.placements ? (
            ad.placements.map((p) => <Badge key={p} tone="outline">{formatPlacement(p)}</Badge>)
          ) : (
            <Badge tone="outline">Placements unknown</Badge>
          )}
        </div>
        {m.has_data ? (
          <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 border-t border-line pt-3">
            <M label="Spend" value={formatMoney(m.spend, currency)} />
            <M label="Impressions" value={formatNumber(m.impressions, { compact: true })} />
            <M label="Reach" value={formatNumber(m.reach, { compact: true })} />
            <M label="Clicks" value={formatNumber(m.clicks)} />
            <M label="CTR" value={formatPercent(m.ctr)} />
            <M label="CPC" value={formatMoney(m.cpc, currency, { decimals: 2 })} />
            <M label="CPM" value={formatMoney(m.cpm, currency, { decimals: 2 })} />
            <M label={rt ? resultLabel(rt) : "Results"} value={rt ? formatNumber(m.results) : "n/a"} />
            <M label={rt ? costLabel(rt) : "CPA"} value={rt ? formatMoney(m.cpa, currency, { decimals: 2 }) : "n/a"} />
            {rt === "purchase" ? (
              <>
                <M label="Purchase value" value={formatMoney(m.result_value, currency, { compact: true })} />
                <M label="ROAS" value={formatRoas(m.roas)} />
              </>
            ) : null}
          </dl>
        ) : (
          <p className="mt-3 border-t border-line pt-3 text-xs text-muted">No delivery in this period.</p>
        )}
      </div>
    </Card>
  );
}
