import { PhasePlaceholder } from "@/components/layout/PhasePlaceholder";

export const metadata = { title: "Competitors" };

export default function CompetitorsPage() {
  return (
    <PhasePlaceholder
      title="Competitors"
      phase={3}
      summary="Track competitors for each client and keep a history of their public ads."
      planned={[
        "Maintain competitor names, websites and Facebook/Instagram pages per client.",
        "Save observed ads with source URL, screenshot, copy, offer, call to action and format.",
        "Record first-seen and last-seen dates only when they can be verified.",
        "De-duplicate repeated observations while keeping their history.",
        "Rate each source's reliability and the confidence of each observation.",
      ]}
      notes={
        <>
          <p>Meta&apos;s Ad Library API only returns ads that reached the EU or UK, or ads about social issues, elections or politics. Ordinary commercial ads shown only in India cannot be fetched through it.</p>
          <p className="mt-2">Google&apos;s Ads Transparency Center has no official public API for this data.</p>
          <p className="mt-2">Indian competitor research will therefore rely mainly on manual import. Competitor spend, CPA, conversions and ROAS are not public and will not be shown.</p>
        </>
      }
    />
  );
}
