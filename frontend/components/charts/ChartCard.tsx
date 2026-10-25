import type { ReactNode } from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { cn } from "@/lib/cn";

export function ChartCard({ title, subtitle, action, children, footer, height = 260, className, isLoading, error, onRetry }: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  height?: number;
  className?: string;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      <div className="px-3 pb-2 pt-3 sm:px-4" style={{ minHeight: height }}>
        {error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : isLoading ? (
          <div role="status" className="h-full px-2">
            <span className="sr-only">Loading chart…</span>
            <Skeleton className="w-full" />
            <Skeleton className="mt-2 w-full" />
            <div style={{ height: height - 40 }} className="mt-2"><Skeleton className="h-full w-full" /></div>
          </div>
        ) : (
          children
        )}
      </div>
      {footer ? <div className="border-t border-line px-5 py-3 text-[11px] leading-relaxed text-muted">{footer}</div> : null}
    </Card>
  );
}
