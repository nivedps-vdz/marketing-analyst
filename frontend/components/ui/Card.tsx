import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Card({ className, children, as: As = "section" }: {
  className?: string;
  children: ReactNode;
  as?: "section" | "div" | "article";
}) {
  return (
    <As className={cn("rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-card)]", className)}>
      {children}
    </As>
  );
}

/** Card header in the CRM style: bold title, small muted subtitle, optional pill or action on the right. */
export function CardHeader({ title, subtitle, action, className, id }: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-[15px] font-semibold leading-tight text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-5 pb-5 pt-4", className)}>{children}</div>;
}
