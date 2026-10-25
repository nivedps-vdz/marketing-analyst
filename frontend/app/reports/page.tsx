import { PhasePlaceholder } from "@/components/layout/PhasePlaceholder";

export const metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <PhasePlaceholder
      title="Reports"
      phase={5}
      summary="Client-specific performance reports."
      planned={[
        "Report per client and period: KPI summary, charts, campaign and ad rankings.",
        "Creative analysis and competitor observations.",
        "Recommended next actions, with AI-written text clearly labelled as hypotheses.",
        "Export to PDF in a later step.",
      ]}
      notes={<p>Until then, the client analytics page and its Recommendations tab show the same calculated figures.</p>}
    />
  );
}
