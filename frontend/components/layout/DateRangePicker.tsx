"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { addDays, daysBetween, useFilters, useMeta, useSetParams } from "@/lib/filters";
import { formatRange } from "@/lib/format";

const MAX_DAYS = 400;

function presets(anchor: string) {
  const [y, m] = anchor.split("-").map(Number);
  const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
  const prevMonthEnd = addDays(monthStart, -1);
  const prevMonthStart = `${prevMonthEnd.slice(0, 7)}-01`;
  return [
    { label: "Last 7 days", start: addDays(anchor, -6), end: anchor },
    { label: "Last 14 days", start: addDays(anchor, -13), end: anchor },
    { label: "Last 30 days", start: addDays(anchor, -29), end: anchor },
    { label: "Last 90 days", start: addDays(anchor, -89), end: anchor },
    { label: "Month to date", start: monthStart, end: anchor },
    { label: "Last month", start: prevMonthStart, end: prevMonthEnd },
  ];
}

export function DateRangePicker() {
  const f = useFilters();
  const meta = useMeta();
  const setParams = useSetParams();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(f.start);
  const [end, setEnd] = useState(f.end);

  useEffect(() => {
    if (open) {
      setStart(f.start);
      setEnd(f.end);
    }
  }, [open, f.start, f.end]);

  const anchor = meta.data?.default_period.end;
  const error =
    !start || !end
      ? "Choose both dates"
      : start > end
        ? "Start must be on or before end"
        : daysBetween(start, end) > MAX_DAYS
          ? `Maximum range is ${MAX_DAYS} days`
          : null;

  const apply = (s: string, e: string) => {
    setParams({ start: s, end: e });
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button aria-label="Reporting period" disabled={!f.ready} className="max-w-full">
          <CalendarDays className="h-4 w-4 text-muted" aria-hidden />
          <span className="truncate">{f.ready ? formatRange(f.start, f.end) : "Loading period"}</span>
          <ChevronDown className="h-4 w-4 text-muted" aria-hidden />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[300px] rounded-2xl border border-line bg-card p-4 shadow-lg"
        >
          <p className="text-sm font-semibold text-ink">Reporting period</p>
          <p className="mt-0.5 text-xs text-muted">Dates are inclusive, in {meta.data?.timezone ?? "Asia/Kolkata"}.</p>
          {anchor ? (
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {presets(anchor).map((p) => {
                const active = p.start === f.start && p.end === f.end;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => apply(p.start, p.end)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-left text-xs font-medium",
                      active ? "bg-brand-soft text-brand" : "text-ink hover:bg-page",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-muted">
              Start
              <input
                type="date"
                value={start}
                max={end || undefined}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-sm text-ink"
              />
            </label>
            <label className="text-xs font-medium text-muted">
              End
              <input
                type="date"
                value={end}
                min={start || undefined}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-sm text-ink"
              />
            </label>
          </div>
          {error ? <p className="mt-2 text-xs text-negative" role="alert">{error}</p> : null}
          {meta.data?.data_through ? (
            <p className="mt-2 text-[11px] text-muted">
              Data available {formatRange(meta.data.data_from!, meta.data.data_through)}
            </p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" variant="primary" disabled={Boolean(error)} onClick={() => apply(start, end)}>
              Apply
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
