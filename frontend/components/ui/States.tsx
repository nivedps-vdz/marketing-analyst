import { AlertTriangle, Inbox, RotateCw } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Button } from "./Button";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-neutral-soft", className)} />;
}

export function LoadingBlock({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("space-y-3", className)}>
      <span className="sr-only">{label}…</span>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function EmptyState({ title, description, icon, action, className }: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <div className="mt-1 max-w-md text-xs leading-relaxed text-muted">{description}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-negative-soft text-negative">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-ink">Could not load this data</p>
      <p className="mt-1 max-w-md text-xs text-muted">{message}</p>
      {onRetry ? (
        <Button className="mt-4" size="sm" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" aria-hidden /> Try again
        </Button>
      ) : null}
    </div>
  );
}

/** Renders loading / error / content for a react-query result. */
export function QueryState<T>({ query, children, loading, empty, isEmpty }: {
  query: { data?: T; isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  children: (data: T) => ReactNode;
  loading?: ReactNode;
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
}) {
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.isPending || query.data === undefined) return <>{loading ?? <LoadingBlock />}</>;
  if (isEmpty?.(query.data) && empty) return <>{empty}</>;
  return <>{children(query.data)}</>;
}
