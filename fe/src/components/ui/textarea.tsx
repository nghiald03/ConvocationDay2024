import * as React from "react";

import { cn } from "@/lib/utils";

import { cva, type VariantProps } from "class-variance-authority";
import { InputColor, radius } from "@/lib/type";

export const textareaVariants = cva(
  "flex flex-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground read-only:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 motion-reduce:transition-none",
  {
    variants: {
      color: {
        default:
          "border-input hover:border-default-400 focus-visible:border-ring focus-visible:ring-ring/25",
        primary:
          "border-primary/50 focus-visible:border-primary focus-visible:ring-primary/25",
        secondary:
          "border-default-300 focus-visible:border-default-500 focus-visible:ring-default-500/25",
        info: "border-info/50 focus-visible:border-info focus-visible:ring-info/25",
        warning:
          "border-warning/50 focus-visible:border-warning focus-visible:ring-warning/25",
        success:
          "border-success/50 focus-visible:border-success focus-visible:ring-success/25",
        destructive:
          "border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/25",
      },

    },

    defaultVariants: {
      color: "default",
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  VariantProps<typeof textareaVariants> {
  color?: InputColor
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, color,  defaultValue, ...props }, ref) => {
    return (
      <div className="flex-1 w-full">
        <textarea
          className={cn(
            textareaVariants({ color }),
            className
          )}
          ref={ref}
          {...props}
        >
          {defaultValue}
        </textarea>
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
