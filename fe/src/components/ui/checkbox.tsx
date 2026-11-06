"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { color } from "@/lib/type"

const checkboxVariants = cva(
  "peer group shrink-0 rounded-[5px] h-4 w-4 border border-default-400 bg-background ring-offset-background transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none [&_svg]:stroke-default-foreground [&_svg]:h-3.5 [&_svg]:w-3.5",
  {
    variants: {
      color: {
        default:
          "data-[state=checked]:border-default data-[state=checked]:bg-default",
        primary:
          "data-[state=checked]:border-primary data-[state=checked]:bg-primary [&_svg]:stroke-primary-foreground",
        secondary:
          "data-[state=checked]:border-secondary data-[state=checked]:bg-secondary [&_svg]:stroke-secondary-foreground",
        destructive:
          "data-[state=checked]:border-destructive data-[state=checked]:bg-destructive [&_svg]:stroke-destructive-foreground",
        warning:
          "data-[state=checked]:border-warning data-[state=checked]:bg-warning [&_svg]:stroke-warning-foreground",
        info: "data-[state=checked]:border-info data-[state=checked]:bg-info [&_svg]:stroke-info-foreground",
        success:
          "data-[state=checked]:border-success data-[state=checked]:bg-success [&_svg]:stroke-success-foreground",
      },
    },
    defaultVariants: {
      color: "default",
    },
  }
);


type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> &
  VariantProps<typeof checkboxVariants> & {
    color?: color
    icon?: React.ReactNode;
  };


const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, color, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      checkboxVariants({ color }),
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current ")}
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));

Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox }
