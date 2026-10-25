"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryState } from "@/components/ui/States";
import { useMeta } from "@/lib/filters";
import { formatNumber, formatRange } from "@/lib/format";
import { useClients } from "@/lib/queries";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-3 border-b border-line py-3 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

export default function SettingsPage() {
  const meta = useMeta();
  const clients = useClients();
  return (
    <>
      <PageHeader title="Settings" subtitle="Read-only in Phase 1. Values come from the backend .env file." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Data and reporting" />
          <CardBody>
            <QueryState query={meta}>
              {(m) => (
                <dl>
                  <Row label="Data source">
                    {m.data_source === "demo" ? <Badge tone="warning">Demo · synthetic</Badge> : <Badge tone="positive">Live</Badge>}
                  </Row>
                  <Row label="Reporting timezone">{m.timezone}</Row>
                  <Row label="Data available">{m.data_from && m.data_through ? formatRange(m.data_from, m.data_through) : "No data"}</Row>
                  <Row label="Attribution setting">{m.attribution_setting}</Row>
                  <Row label="Platforms">
                    {m.platforms.map((p) => `${p.label}${p.enabled ? "" : " (planned)"}`).join(", ")}
                  </Row>
                </dl>
              )}
            </QueryState>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Ranking thresholds" subtitle="Ads below these are listed as “needs more data”. Change via MIN_SPEND, MIN_IMPRESSIONS, MIN_CONVERSIONS in .env." />
          <CardBody>
            <QueryState query={meta}>
              {(m) => (
                <dl>
                  <Row label="Minimum spend">{formatNumber(m.thresholds.min_spend)} <span className="text-xs text-muted">(in each account&apos;s currency)</span></Row>
                  <Row label="Minimum impressions">{formatNumber(m.thresholds.min_impressions)}</Row>
                  <Row label="Minimum results">{formatNumber(m.thresholds.min_conversions)} for cost-based rankings</Row>
                </dl>
              )}
            </QueryState>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Clients and ad accounts" subtitle="Account connections are added in Phase 2 (Meta Marketing API, read-only)." />
          <CardBody>
            <QueryState query={clients}>
              {(d) => (
                <dl>
                  {d.clients.map((c) => (
                    <Row key={c.id} label={c.name}>
                      {c.ad_accounts.length
                        ? c.ad_accounts.map((a) => `${a.platform_label} ${a.external_id} (${a.connection_status})`).join(", ")
                        : "No ad account"}
                    </Row>
                  ))}
                </dl>
              )}
            </QueryState>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
