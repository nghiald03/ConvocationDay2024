"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, type ButtonProps } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export interface IconButtonProps extends Omit<ButtonProps, "size" | "children" | "asChild"> {
  /** Accessible name, also shown as the tooltip. */
  label: string
  icon: LucideIcon
  tooltipSide?: React.ComponentProps<typeof TooltipContent>["side"]
}

/**
 * Compact icon-only action button with a tooltip, for table rows and toolbars.
 * The tooltip trigger is a wrapper span so it still shows on disabled buttons
 * (disabled elements swallow pointer events), and `label` doubles as the aria-label.
 * Props and ref go to the underlying Button, so it can sit inside Radix `asChild` triggers.
 */
const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon: IconComponent, tooltipSide = "top", className, variant = "outline", type = "button", ...props }, ref) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            ref={ref}
            type={type}
            variant={variant}
            size="icon"
            aria-label={label}
            className={cn("h-8 w-8", className)}
            {...props}
          >
            <IconComponent className="h-4 w-4" aria-hidden="true" />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>{label}</TooltipContent>
    </Tooltip>
  )
)
IconButton.displayName = "IconButton"

export { IconButton }
