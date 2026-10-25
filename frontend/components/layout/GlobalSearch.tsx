"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { apiGet } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useGlobalQuery } from "@/lib/filters";
import type { SearchResults } from "@/lib/types";

interface Item {
  key: string;
  group: string;
  label: string;
  sub: string;
  href: string;
}

function useDebounced(value: string, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function GlobalSearch() {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const q = useDebounced(text.trim(), 250);
  const router = useRouter();
  const gq = useGlobalQuery();
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);

  const res = useQuery({
    queryKey: ["search", q],
    queryFn: ({ signal }) => apiGet<SearchResults>("/search", { q }, signal),
    enabled: q.length >= 2,
  });

  const join = (base: string, extra: string) => (gq ? `${base}${gq}&${extra}` : `${base}?${extra}`);
  const items: Item[] = res.data
    ? [
        ...res.data.clients.map((c) => ({
          key: `c${c.id}`, group: "Clients", label: c.name, sub: c.category, href: `/clients/${c.id}${gq}`,
        })),
        ...res.data.campaigns.map((c) => ({
          key: `k${c.id}`, group: "Campaigns", label: c.name, sub: `${c.client_name} · ID ${c.external_id}`,
          href: join(`/clients/${c.client_id}`, `tab=campaigns&campaign=${c.id}`),
        })),
        ...res.data.ads.map((a) => ({
          key: `a${a.id}`, group: "Ads", label: a.name, sub: `${a.client_name} · ID ${a.external_id}`,
          href: join(`/clients/${a.client_id}`, `tab=ads&ad=${a.id}`),
        })),
      ]
    : [];

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (item: Item) => {
    setOpen(false);
    setText("");
    router.push(item.href);
  };

  const showPanel = open && q.length >= 2;

  return (
    <div ref={box} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
      <input
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Search clients, campaigns and ads"
        placeholder="Search clients, campaigns, ads…"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && items[active]) {
            e.preventDefault();
            go(items[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="h-10 w-full rounded-xl border border-line bg-page pl-9 pr-3 text-sm text-ink placeholder:text-subtle focus:bg-card"
      />
      {showPanel ? (
        <div className="absolute left-0 right-0 top-12 z-50 max-h-[420px] overflow-y-auto rounded-2xl border border-line bg-card p-2 shadow-lg">
          {res.isPending ? <p className="px-3 py-2 text-xs text-muted">Searching…</p> : null}
          {res.isError ? <p className="px-3 py-2 text-xs text-negative">Search failed. Is the backend running?</p> : null}
          {res.data && items.length === 0 ? <p className="px-3 py-2 text-xs text-muted">No matches for “{q}”.</p> : null}
          <ul id={listId} role="listbox" aria-label="Search results">
            {items.map((it, i) => (
              <li key={it.key} role="option" aria-selected={i === active}>
                {i === 0 || items[i - 1].group !== it.group ? (
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">{it.group}</p>
                ) : null}
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(it)}
                  className={cn("block w-full rounded-lg px-3 py-2 text-left", i === active ? "bg-brand-soft" : "hover:bg-page")}
                >
                  <span className={cn("block truncate text-sm font-medium", i === active ? "text-brand" : "text-ink")}>{it.label}</span>
                  <span className="block truncate text-xs text-muted">{it.sub}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
