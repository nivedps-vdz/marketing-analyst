"use client";

import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { Fragment, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import type { EntityMetrics, SortKey } from "@/lib/types";

import { METRIC_COLUMNS } from "./entityColumns";

export interface EntityRow {
  id: number;
  metrics: EntityMetrics;
}

/** Table of campaigns or ad sets with server-side sorting and an optional drill-down action per row. */
export function EntityTable<T extends EntityRow>({ rows, currency, leading, sort, order, onSort, onSelect, selectedId, caption, selectLabel }: {
  rows: T[];
  currency: string | null;
  leading: { label: string; render: (r: T) => ReactNode }[];
  sort: SortKey;
  order: "asc" | "desc";
  onSort: (key: SortKey) => void;
  onSelect?: (r: T) => void;
  selectedId?: number | null;
  caption: string;
  selectLabel?: (r: T) => string;
}) {
  const header = (key: SortKey, label: string, align: "left" | "right" = "right") => {
    const active = sort === key;
    return (
      <th
        scope="col"
        aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"}
        className={cn("whitespace-nowrap px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-subtle", align === "right" ? "text-right" : "text-left")}
      >
        <button type="button" onClick={() => onSort(key)} className={cn("inline-flex items-center gap-1 hover:text-ink", active && "text-brand")}>
          {label}
          {active ? (order === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />) : null}
        </button>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line">
            {leading.map((l, i) => (i === 0 ? <Fragment key={l.label}>{header("name", l.label, "left")}</Fragment> : (
              <th key={l.label} scope="col" className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-subtle">{l.label}</th>
            )))}
            {METRIC_COLUMNS.map((c) => <Fragment key={c.key}>{header(c.key, c.label)}</Fragment>)}
            {onSelect ? <th scope="col"><span className="sr-only">Drill down</span></th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={cn("border-b border-line last:border-0 hover:bg-page/70", selectedId === r.id && "bg-brand-tint")}>
              {leading.map((l) => <td key={l.label} className="px-3 py-3 align-top">{l.render(r)}</td>)}
              {METRIC_COLUMNS.map((c) => (
                <td key={c.key} className={cn("whitespace-nowrap px-3 py-3 text-right tabular-nums", r.metrics.has_data ? "text-ink" : "text-subtle")}>
                  {r.metrics.has_data ? c.render(r.metrics, currency) : c.key === "spend" ? "No delivery" : "—"}
                </td>
              ))}
              {onSelect ? (
                <td className="px-2 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(r)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-soft"
                    aria-label={selectLabel?.(r)}
                  >
                    Drill down <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
