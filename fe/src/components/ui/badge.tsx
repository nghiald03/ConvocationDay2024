import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { color, rounded } from "@/lib/type";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border py-0.5 px-2 text-xs capitalize font-medium leading-5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      color: {
        default: "border-transparent bg-default text-default-foreground",
        primary: "border-transparent bg-primary text-primary-foreground",
        secondary: "bg-secondary border-transparent text-secondary-foreground ",
        destructive: "bg-destructive border-transparent text-destructive-foreground",
        success: "bg-success border-transparent  text-success-foreground ",
        info: "bg-info border-transparent text-info-foreground ",
        warning: "bg-warning  border-transparent text-warning-foreground",
      },
      rounded: {
        sm: "rounded",
        md: "rounded-md",
        lg: "rounded-lg",
        full: "rounded-full",
      },
      // "solid" keeps the original filled look; "soft" is the quieter tinted chip.
      variant: {
        solid: "",
        soft: "",
      },
    },
    compoundVariants: [
      { variant: "soft", color: "default", className: "border-default/20 bg-default/10 text-default" },
      { variant: "soft", color: "primary", className: "border-primary/20 bg-primary/10 text-primary" },
      { variant: "soft", color: "secondary", className: "border-border bg-secondary text-secondary-foreground" },
      { variant: "soft", color: "destructive", className: "border-destructive/20 bg-destructive/10 text-destructive" },
      { variant: "soft", color: "success", className: "border-success/20 bg-success/10 text-success" },
      { variant: "soft", color: "info", className: "border-info/20 bg-info/10 text-info" },
      { variant: "soft", color: "warning", className: "border-warning/20 bg-warning/10 text-warning" },
    ],

    defaultVariants: {
      color: "default",
      rounded: "md",
      variant: "solid",
    },
  }
);
export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> {

  color?: color;
  rounded?: rounded;
}


function Badge({ className, color, rounded, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ color, rounded, variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
