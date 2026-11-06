import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { color, shadow, rounded } from "@/lib/type"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base: calm transitions, a visible keyboard focus ring, a tiny press response,
  // and a larger hit area on touch screens (min 44px) without affecting mouse layouts.
  "inline-flex items-center justify-center whitespace-nowrap select-none rounded-md px-4 text-sm font-medium ring-offset-background transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100 [@media(pointer:coarse)]:min-h-[2.75rem]",
  {
    variants: {
      color: {
        default: "bg-default text-default-foreground shadow-sm hover:bg-default/90",
        primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        warning: "bg-warning text-warning-foreground shadow-sm hover:bg-warning/90",
        info: "bg-info text-info-foreground shadow-sm hover:bg-info/90",
        success: "bg-success text-success-foreground shadow-sm hover:bg-success/90",
      },
      variant: {
        default: "",
        // Neutral outline by default; colored outlines come from compoundVariants.
        outline: "border border-input bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground dark:bg-transparent dark:shadow-none",
        soft: "shadow-none",
        ghost: "bg-transparent shadow-none text-foreground/80 hover:bg-accent hover:text-accent-foreground",
        shadow: "shadow-md"
      },
      shadow: {
        sm: "shadow-sm",
        md: "shadow-md",
        lg: "shadow-lg",
        xl: "shadow-xl",
      },
      rounded: {
        sm: "rounded",
        md: "rounded-md",
        lg: "rounded-lg",
        full: "rounded-full",
      },
      fullWidth: {
        true: "w-full",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-11 px-6 text-base",
        icon: "h-10 w-10 p-0 [@media(pointer:coarse)]:min-w-[2.75rem]",
      }
    },
    compoundVariants: [
      // ---- outline: tinted border + text, soft fill on hover ----
      { variant: "outline", color: "primary", className: "border-primary/40 text-primary hover:bg-primary/10 hover:text-primary" },
      { variant: "outline", color: "success", className: "border-success/40 text-success hover:bg-success/10 hover:text-success" },
      { variant: "outline", color: "info", className: "border-info/40 text-info hover:bg-info/10 hover:text-info" },
      { variant: "outline", color: "warning", className: "border-warning/40 text-warning hover:bg-warning/10 hover:text-warning" },
      { variant: "outline", color: "destructive", className: "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" },
      { variant: "outline", color: "secondary", className: "border-input text-foreground hover:bg-secondary hover:text-secondary-foreground" },

      // ---- soft: tinted background, deepens on hover ----
      { variant: "soft", color: "default", className: "bg-default/10 text-default hover:bg-default/20" },
      { variant: "soft", color: "primary", className: "bg-primary/10 text-primary hover:bg-primary/20" },
      { variant: "soft", color: "secondary", className: "bg-secondary text-secondary-foreground hover:bg-secondary/80" },
      { variant: "soft", color: "success", className: "bg-success/10 text-success hover:bg-success/20" },
      { variant: "soft", color: "info", className: "bg-info/10 text-info hover:bg-info/20" },
      { variant: "soft", color: "warning", className: "bg-warning/10 text-warning hover:bg-warning/20" },
      { variant: "soft", color: "destructive", className: "bg-destructive/10 text-destructive hover:bg-destructive/20" },

      // ---- ghost: transparent, soft fill on hover ----
      { variant: "ghost", color: "primary", className: "text-primary hover:bg-primary/10 hover:text-primary" },
      { variant: "ghost", color: "success", className: "text-success hover:bg-success/10 hover:text-success" },
      { variant: "ghost", color: "info", className: "text-info hover:bg-info/10 hover:text-info" },
      { variant: "ghost", color: "warning", className: "text-warning hover:bg-warning/10 hover:text-warning" },
      { variant: "ghost", color: "destructive", className: "text-destructive hover:bg-destructive/10 hover:text-destructive" },
      // Sidebar menus rely on secondary tokens so themed (colored) sidebars keep working.
      { variant: "ghost", color: "secondary", className: "text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground" },
    ],
    defaultVariants: {
      variant: "default",
      color: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
  color?: color
  shadow?: shadow
  rounded?: rounded
  fullWidth?: boolean
  size?: "default" | "sm" | "md" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, color, fullWidth, shadow, rounded, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, rounded, color, shadow, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
