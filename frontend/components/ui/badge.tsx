import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-pill px-2.5 py-0.5 text-label-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        success: "bg-success-soft text-success border border-success-border",
        warning: "bg-warning-soft text-warning border border-warning-border",
        danger: "bg-danger-soft text-danger border border-danger-border",
        neutral: "bg-surface-variant text-ink-muted border border-border",
        accent: "bg-accent-soft text-accent border border-accent-border",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
