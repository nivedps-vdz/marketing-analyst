"use client";

import { Bell, ChevronDown, FlaskConical, Menu, Settings } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, Popover } from "radix-ui";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useFilters, useGlobalQuery, useMeta, useSetParams } from "@/lib/filters";
import { initials, profile } from "@/lib/profile";

import { DateRangePicker } from "./DateRangePicker";
import { GlobalSearch } from "./GlobalSearch";
import { Logo } from "./Logo";

function PlatformSelect() {
  const f = useFilters();
  const meta = useMeta();
  const setParams = useSetParams();
  return (
    <label className="relative">
      <span className="sr-only">Advertising platform</span>
      <select
        value={f.platform}
        onChange={(e) => setParams({ platform: e.target.value === "all" ? null : e.target.value })}
        className="h-10 appearance-none rounded-xl border border-line bg-card pl-3 pr-8 text-sm font-medium text-ink hover:border-line-strong"
      >
        <option value="all">All platforms</option>
        {(meta.data?.platforms ?? []).map((p) => (
          <option key={p.id} value={p.id} disabled={!p.enabled}>
            {p.label}{p.enabled ? "" : " (planned)"}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
    </label>
  );
}

function ActivityButton() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label="Activity">
          <Bell className="h-5 w-5" aria-hidden />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-50 w-72 rounded-2xl border border-line bg-card p-4 shadow-lg">
          <p className="text-sm font-semibold text-ink">Activity</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            No activity yet. Sync events, performance alerts and new competitor creatives will appear here once
            daily automation is built (Phase 4).
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ProfileMenu() {
  const gq = useGlobalQuery();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-page" aria-label="Profile menu">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
            {initials(profile.name)}
          </span>
          <span className="hidden text-left leading-tight xl:block">
            <span className="block text-sm font-semibold text-ink">{profile.name}</span>
            <span className="block text-[11px] text-muted">{profile.role}</span>
            <span className="block text-[11px] font-medium text-brand">{profile.department}</span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-muted xl:block" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-48 rounded-2xl border border-line bg-card p-1.5 shadow-lg">
          <DropdownMenu.Label className="px-3 py-2 text-xs text-muted">Signed in locally (no account system in Phase 1)</DropdownMenu.Label>
          <DropdownMenu.Item asChild>
            <Link href={`/settings${gq}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none data-[highlighted]:bg-brand-soft data-[highlighted]:text-brand">
              <Settings className="h-4 w-4" aria-hidden /> Settings
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function DemoBadge() {
  const meta = useMeta();
  if (meta.data?.data_source !== "demo") return null;
  return (
    <Badge tone="warning" className="py-1" title="All figures are generated sample data, not real client results.">
      <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Demo data · synthetic
    </Badge>
  );
}

export function Header({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-card/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open navigation">
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
        <span className="lg:hidden"><Logo width={112} /></span>
        <div className="hidden min-w-0 flex-1 md:block">
          <GlobalSearch />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:inline-flex"><DemoBadge /></span>
          <div className="hidden md:block"><PlatformSelect /></div>
          <DateRangePicker />
          <ActivityButton />
          <ProfileMenu />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2 md:hidden">
        <GlobalSearch />
        <PlatformSelect />
        <DemoBadge />
      </div>
    </header>
  );
}
