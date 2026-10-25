"use client";

import { Tabs as RadixTabs } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Tabs({ value, onValueChange, tabs, children, label }: {
  value: string;
  onValueChange: (v: string) => void;
  tabs: { value: string; label: string; count?: number }[];
  children: ReactNode;
  label: string;
}) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange}>
      <RadixTabs.List
        aria-label={label}
        className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-card p-1 shadow-[var(--shadow-card)]"
      >
        {tabs.map((t) => (
          <RadixTabs.Trigger
            key={t.value}
            value={t.value}
            className={cn(
              "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-ink",
              "data-[state=active]:bg-brand-soft data-[state=active]:text-brand",
            )}
          >
            {t.label}
            {t.count !== undefined ? <span className="ml-1.5 text-xs opacity-70">{t.count}</span> : null}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}

export const TabPanel = ({ value, children }: { value: string; children: ReactNode }) => (
  <RadixTabs.Content value={value} className="mt-5 focus-visible:outline-none">
    {children}
  </RadixTabs.Content>
);
