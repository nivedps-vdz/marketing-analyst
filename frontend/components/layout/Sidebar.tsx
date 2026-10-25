"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { useGlobalQuery } from "@/lib/filters";
import { initials, profile } from "@/lib/profile";

import { Logo } from "./Logo";
import { NAV, isActive } from "./nav";

export function SidebarNav({ pathname, query, onNavigate }: {
  pathname: string;
  query: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
      {NAV.map((group) => (
        <div key={group.section} className="mt-5 first:mt-2">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">{group.section}</p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={`${item.href}${query}`}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active ? "bg-brand-soft text-brand" : "text-ink hover:bg-page",
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px]", active ? "text-brand" : "text-ink/80")} aria-hidden strokeWidth={1.8} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function ProfileCard() {
  return (
    <div className="m-3 flex items-center gap-3 rounded-2xl bg-brand-tint p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
        {initials(profile.name)}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-ink">{profile.name}</p>
        <p className="truncate text-[10px] uppercase tracking-wide text-muted">{profile.role}</p>
        <p className="truncate text-[11px] font-medium text-brand">{profile.department}</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const query = useGlobalQuery();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-card lg:flex">
      <div className="flex h-16 items-center px-6">
        <Link href={`/dashboard${query}`} aria-label="Vestadz Marketing Analyst home">
          <Logo />
        </Link>
      </div>
      <SidebarNav pathname={pathname} query={query} />
      <ProfileCard />
    </aside>
  );
}
