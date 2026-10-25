import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/** Native select styled to match the CRM. Native controls keep keyboard and screen-reader support. */
export function Select({ label, className, children, hideLabel, ...props }: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hideLabel?: boolean;
}) {
  return (
    <label className={cn("flex flex-col gap-1 text-xs font-medium text-muted", className)}>
      <span className={hideLabel ? "sr-only" : undefined}>{label}</span>
      <span className="relative">
        <select
          className="h-10 w-full appearance-none rounded-xl border border-line bg-card pl-3 pr-9 text-sm font-medium text-ink hover:border-line-strong"
          {...props}
        >
          {children}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </span>
    </label>
  );
}
