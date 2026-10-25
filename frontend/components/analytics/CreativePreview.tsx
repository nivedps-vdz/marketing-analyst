import { GalleryHorizontal, HelpCircle, Image as ImageIcon, Video } from "lucide-react";

import { cn } from "@/lib/cn";
import type { CreativeInfo } from "@/lib/types";

const ICONS = { image: ImageIcon, video: Video, carousel: GalleryHorizontal, other: HelpCircle, unknown: HelpCircle };

/**
 * Creative thumbnail. When the platform provides no preview (all demo ads, and some live ads), a labelled
 * placeholder is shown in the creative's real aspect ratio instead of an invented image.
 */
export function CreativePreview({ creative, className, large }: { creative: CreativeInfo; className?: string; large?: boolean }) {
  const Icon = ICONS[creative.format] ?? HelpCircle;
  const ratio = creative.aspect_ratio?.replace(":", " / ") ?? "1 / 1";

  if (creative.thumbnail_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- platform CDN URLs, not optimisable at build time
      <img
        src={creative.thumbnail_url}
        alt={creative.headline ? `Creative: ${creative.headline}` : "Ad creative"}
        referrerPolicy="no-referrer"
        className={cn("w-full rounded-xl bg-page object-cover", className)}
        style={{ aspectRatio: ratio }}
      />
    );
  }

  return (
    <div className={cn("flex w-full items-center justify-center rounded-xl bg-page", className)} style={{ height: large ? 260 : 150 }}>
      <div
        className="relative flex h-full max-h-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong bg-card px-3 text-center"
        style={{ aspectRatio: ratio }}
      >
        <Icon className={cn("text-brand", large ? "h-8 w-8" : "h-5 w-5")} aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{creative.format_label}{creative.aspect_ratio ? ` · ${creative.aspect_ratio}` : ""}</span>
        <span className="text-[10px] text-subtle">No preview available</span>
      </div>
    </div>
  );
}
