import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface EmptyStateProps {
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === "function" || typeof icon === "object") {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className="w-8 h-8 text-ink-muted" />;
    }
    return icon;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-card border border-dashed border-border bg-white/60",
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-ink-muted p-3 bg-surface-low rounded-pill">
          {renderIcon()}
        </div>
      )}
      <h3 className="text-headline-sm font-semibold text-on-surface mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-body-sm text-ink-muted max-w-sm mb-4">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
