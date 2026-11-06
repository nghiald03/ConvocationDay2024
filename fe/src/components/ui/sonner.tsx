"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

// shadcn/ui Sonner toaster, styled as a compact "badge" pill in the top-right corner.
// Every type gets a tinted fill over an opaque popover surface (so content underneath
// never bleeds through), a matching border, and matching text/icon color. Toasts that
// carry a description fall back to a rounded rectangle so multi-line text stays tidy.
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      offset={20}
      visibleToasts={4}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast group-[.toaster]:w-auto group-[.toaster]:max-w-[min(26rem,calc(100vw-2rem))] group-[.toaster]:gap-2 group-[.toaster]:rounded-full group-[.toaster]:has-[[data-description]]:rounded-2xl group-[.toaster]:border group-[.toaster]:bg-popover group-[.toaster]:px-4 group-[.toaster]:py-2 group-[.toaster]:text-sm group-[.toaster]:font-medium group-[.toaster]:shadow-dropdown",
          title: "group-[.toast]:font-medium",
          description: "group-[.toast]:font-normal group-[.toast]:opacity-80",
          actionButton:
            "group-[.toast]:rounded-full group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:rounded-full group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          default:
            "group-[.toaster]:border-border group-[.toaster]:text-popover-foreground",
          success:
            "group-[.toaster]:border-success/40 group-[.toaster]:text-success group-[.toaster]:[background-image:linear-gradient(hsl(var(--success)/0.1),hsl(var(--success)/0.1))]",
          error:
            "group-[.toaster]:border-destructive/40 group-[.toaster]:text-destructive group-[.toaster]:[background-image:linear-gradient(hsl(var(--destructive)/0.1),hsl(var(--destructive)/0.1))]",
          warning:
            "group-[.toaster]:border-warning/40 group-[.toaster]:text-warning group-[.toaster]:[background-image:linear-gradient(hsl(var(--warning)/0.1),hsl(var(--warning)/0.1))]",
          info:
            "group-[.toaster]:border-info/40 group-[.toaster]:text-info group-[.toaster]:[background-image:linear-gradient(hsl(var(--info)/0.1),hsl(var(--info)/0.1))]",
          loading:
            "group-[.toaster]:border-primary/40 group-[.toaster]:text-primary group-[.toaster]:[background-image:linear-gradient(hsl(var(--primary)/0.1),hsl(var(--primary)/0.1))]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
