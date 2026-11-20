import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusChipVariant =
  | "waiting"
  | "replied"
  | "active"
  | "closed"
  | "booked"
  | "cancelled"
  | "completed";

export interface StatusChipProps {
  status: StatusChipVariant | string;
  label?: string;
  className?: string;
}

export function StatusChip({ status, label, className }: StatusChipProps) {
  const norm = status.toLowerCase();

  let dotColor = "bg-gray-400";
  let bgText = "bg-surface-variant text-ink-muted border-border";

  if (norm.includes("waiting")) {
    dotColor = "bg-warning";
    bgText = "bg-warning-soft text-warning border-warning-border";
  } else if (norm.includes("replied") || norm.includes("completed")) {
    dotColor = "bg-success";
    bgText = "bg-success-soft text-success border-success-border";
  } else if (norm.includes("active") || norm.includes("booked") || norm.includes("open")) {
    dotColor = "bg-accent";
    bgText = "bg-accent-soft text-accent border-accent-border";
  } else if (norm.includes("closed") || norm.includes("cancelled")) {
    dotColor = "bg-slate-400";
    bgText = "bg-surface-high text-ink-muted border-border";
  }

  const displayLabel = label || status.replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-label-sm font-medium border capitalize",
        bgText,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-pill shrink-0", dotColor)} />
      {displayLabel}
    </span>
  );
}
