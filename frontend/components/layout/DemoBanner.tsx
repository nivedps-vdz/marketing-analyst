"use client";

import { Info, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useMeta } from "@/lib/filters";

const KEY = "vestadz.demoBannerDismissed";

/** Magenta announcement banner in the CRM style. The header badge stays visible after dismissal. */
export function DemoBanner() {
  const meta = useMeta();
  const [hidden, setHidden] = useState(true);
  useEffect(() => setHidden(sessionStorage.getItem(KEY) === "1"), []);
  if (meta.data?.data_source !== "demo" || hidden) return null;
  return (
    <div role="note" className="mb-5 flex items-center gap-3 rounded-2xl bg-brand px-5 py-4 text-white shadow-[var(--shadow-card)]">
      <Info className="h-5 w-5 shrink-0" aria-hidden />
      <p className="text-sm">
        <span className="font-semibold">Demo mode.</span> Every figure on these pages is synthetic sample data for
        fictional businesses. Real Meta Ads data arrives with the Phase 2 integration.
      </p>
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem(KEY, "1");
          setHidden(true);
        }}
        className="ml-auto rounded-lg p-1 hover:bg-white/15"
        aria-label="Dismiss demo notice"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
