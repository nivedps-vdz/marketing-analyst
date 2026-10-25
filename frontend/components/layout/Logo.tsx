"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * Vestadz wordmark from the official white-on-transparent PNG (public/brand/vestadz-wordmark-white.png,
 * 1080×1080 export), rendered in brand magenta through a CSS mask as on crm.vestadz.com.
 * The file itself is not modified. If it is missing, a labelled placeholder is shown instead.
 */
const SRC = "/brand/vestadz-wordmark-white.png";
// In the 1080×1080 export the wordmark spans about 990 px wide and 157 px tall, centred.
const TEXT_WIDTH_RATIO = 990 / 1080;
const TEXT_HEIGHT_RATIO = 157 / 1080;

export function Logo({ width = 168, className }: { width?: number; className?: string }) {
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    const img = new Image();
    img.onload = () => setState("ok");
    img.onerror = () => setState("missing");
    img.src = SRC;
  }, []);

  const maskSize = Math.round(width / TEXT_WIDTH_RATIO);
  const height = Math.ceil(maskSize * TEXT_HEIGHT_RATIO) + 2;

  if (state === "missing") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md border border-dashed border-brand/50 text-[10px] font-semibold uppercase tracking-wider text-brand",
          className,
        )}
        style={{ width, height: height + 4 }}
        title="Logo placeholder: add frontend/public/brand/vestadz-wordmark-white.png"
      >
        Vestadz logo
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label="Vestadz"
      className={cn("brand-mask inline-block", state === "loading" && "opacity-0", className)}
      style={{
        width,
        height,
        WebkitMaskImage: `url(${SRC})`,
        maskImage: `url(${SRC})`,
        WebkitMaskSize: `${maskSize}px ${maskSize}px`,
        maskSize: `${maskSize}px ${maskSize}px`,
      }}
    />
  );
}
