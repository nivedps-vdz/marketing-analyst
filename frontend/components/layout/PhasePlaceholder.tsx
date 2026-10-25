import { Clock } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

/** Honest placeholder for features scheduled in later phases. Shows the plan, never fake data. */
export function PhasePlaceholder({ title, phase, summary, planned, notes }: {
  title: string;
  phase: number;
  summary: string;
  planned: string[];
  notes?: ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} subtitle={summary} actions={<Badge tone="brand" className="py-1"><Clock className="h-3.5 w-3.5" aria-hidden /> Planned for Phase {phase}</Badge>} />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader title="What this page will do" subtitle="Not active yet. Nothing on this page is running." />
          <CardBody>
            <ul className="space-y-2">
              {planned.map((p) => (
                <li key={p} className="flex gap-2 text-sm text-ink">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        {notes ? (
          <Card>
            <CardHeader title="Limitations" />
            <CardBody className="text-xs leading-relaxed text-muted">{notes}</CardBody>
          </Card>
        ) : null}
      </div>
    </>
  );
}
