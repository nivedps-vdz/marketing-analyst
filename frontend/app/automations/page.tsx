import { PhasePlaceholder } from "@/components/layout/PhasePlaceholder";

export const metadata = { title: "Automations" };

export default function AutomationsPage() {
  return (
    <PhasePlaceholder
      title="Automations"
      phase={4}
      summary="Scheduled data sync and competitor research."
      planned={[
        "Daily job, by default at 8:00 AM Asia/Kolkata (configurable).",
        "Sync authorised Meta Ads data, detect significant performance changes and update the activity feed.",
        "Check permitted competitor sources and de-duplicate new observations.",
        "Show last successful run, next scheduled run, errors and run history from real execution records.",
      ]}
      notes={
        <>
          <p>No job is scheduled today. Last run: never. Next run: none.</p>
          <p className="mt-2">Jobs will run on this laptop, so it and the backend must be on at the scheduled time.</p>
        </>
      }
    />
  );
}
