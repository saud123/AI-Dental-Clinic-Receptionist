import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-btn font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-fg hover:bg-primary-container shadow-elev1",
        secondary:
          "bg-secondary text-secondary-fg hover:bg-secondary-container hover:text-secondary-on-container shadow-elev1",
        ghost:
          "bg-transparent text-ink hover:bg-surface-high hover:text-on-surface",
        danger:
          "bg-danger text-white hover:bg-red-700 shadow-elev1",
        outline:
          "border border-border bg-white text-ink hover:bg-surface-low",
      },
      size: {
        sm: "h-8 px-3 text-label-sm",
        md: "h-10 px-4 text-label-md",
        lg: "h-12 px-6 text-body-md",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
