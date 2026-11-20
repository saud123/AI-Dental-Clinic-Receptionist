import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

export interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  subLabel?: string;
  className?: string;
}

export function KpiCard({ label, value, sub, subLabel, className }: KpiCardProps) {
  const displaySub = sub || subLabel;

  return (
    <Card className={cn("flex flex-col justify-between space-y-2 p-5", className)}>
      <span className="text-label-sm font-medium text-ink-muted uppercase tracking-wider">
        {label}
      </span>
      <div className="text-kpi text-accent font-bold tabular tracking-tight">
        {value}
      </div>
      {displaySub ? (
        <div className="text-body-sm text-ink-muted pt-1 border-t border-border/50">
          {displaySub}
        </div>
      ) : null}
    </Card>
  );
}
