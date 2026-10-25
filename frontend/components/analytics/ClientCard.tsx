import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Sparkline } from "@/components/charts/Sparkline";
import { Badge, ConnectionBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ChangePill } from "@/components/ui/ChangePill";
import { formatDate, formatMetric } from "@/lib/format";
import type { ClientCardData, MetricKey } from "@/lib/types";

function Stat({ label, k, c }: { label: string; k: MetricKey; c: ClientCardData }) {
  const m = c.metrics[k as keyof ClientCardData["metrics"]];
  return (
    <div>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="text-sm font-semibold text-ink">
        {m.value === null ? <span className="font-medium text-subtle" title={m.unavailable_reason ?? undefined}>N/A</span> : formatMetric(k, m.value, c.currency, { compact: true })}
      </dd>
    </div>
  );
}

export function ClientCard({ client, query }: { client: ClientCardData; query: string }) {
  const c = client;
  const spend = c.metrics.spend;
  const hasLeads = c.metrics.leads.value !== null;
  const hasSales = c.metrics.purchases.value !== null;
  const expired = c.ad_accounts.find((a) => a.connection_status === "expired");

  return (
    <Card as="article" className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-ink">{c.name}</h3>
          <p className="mt-0.5 truncate text-xs text-muted">{c.category}{c.geography ? ` · ${c.geography}` : ""}</p>
        </div>
        <ConnectionBadge status={c.connection_status} />
      </div>

      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] text-muted">Spend</p>
          <p className="text-2xl font-semibold tracking-tight text-ink">
            {spend.value === null ? <span className="text-base text-subtle">Not available</span> : formatMetric("spend", spend.value, c.currency, { compact: true })}
          </p>
        </div>
        {spend.value !== null ? <ChangePill metric={spend} /> : null}
      </div>
      {spend.value === null ? <p className="mt-1 text-[11px] text-muted">{spend.unavailable_reason}</p> : null}

      <div className="mt-3">
        <Sparkline data={c.sparkline} label={`Daily spend trend for ${c.name}`} />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
        {hasLeads ? (
          <>
            <Stat label="Leads" k="leads" c={c} />
            <Stat label="Cost per lead" k="cost_per_lead" c={c} />
          </>
        ) : null}
        {hasSales ? (
          <>
            <Stat label="Purchases" k="purchases" c={c} />
            <Stat label="ROAS" k="roas" c={c} />
          </>
        ) : null}
        {!hasLeads && !hasSales ? (
          <p className="col-span-3 text-[11px] text-muted">
            {spend.value === null ? "No performance data." : "No lead or sales campaigns in this period."}
          </p>
        ) : null}
      </dl>

      {expired ? (
        <p className="mt-3 rounded-lg bg-negative-soft px-3 py-2 text-[11px] text-negative">
          Access expired. Data stops at {formatDate(expired.data_through)}.
        </p>
      ) : null}

      <div className="mt-auto flex items-center justify-between pt-4">
        {c.is_demo ? <Badge tone="warning">Demo</Badge> : <span />}
        <Link
          href={`/clients/${c.id}${query}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
          aria-label={`Open analytics for ${c.name}`}
        >
          Open analytics <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </Card>
  );
}
