import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ name, size = "md", className }: AvatarProps) {
  const getInitials = (n: string) => {
    if (!n) return "?";
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sizeStyles = {
    sm: "w-8 h-8 text-label-sm",
    md: "w-10 h-10 text-label-md",
    lg: "w-12 h-12 text-body-lg",
  };

  return (
    <div
      className={cn(
        "rounded-pill bg-slate-500 text-white font-medium flex items-center justify-center shrink-0 select-none shadow-elev1",
        sizeStyles[size],
        className
      )}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
