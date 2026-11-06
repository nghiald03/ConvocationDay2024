"use client";
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { InputColor } from '@/lib/type';

export const inputVariants = cva(
  'flex w-full rounded-md border bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground read-only:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 motion-reduce:transition-none',
  {
    variants: {
      color: {
        default:
          'border-input hover:border-default-400 focus-visible:border-ring focus-visible:ring-ring/25',
        primary:
          'border-primary/50 focus-visible:border-primary focus-visible:ring-primary/25',
        secondary:
          'border-default-300 focus-visible:border-default-500 focus-visible:ring-default-500/25',
        info: 'border-info/50 focus-visible:border-info focus-visible:ring-info/25',
        warning:
          'border-warning/50 focus-visible:border-warning focus-visible:ring-warning/25',
        success:
          'border-success/50 focus-visible:border-success focus-visible:ring-success/25',
        destructive:
          'border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/25',
      },

      size: {
        sm: 'h-8 text-xs',
        default: 'h-10',
        md: 'h-10',
        lg: 'h-12',
      },
    },

    defaultVariants: {
      color: 'default',
      size: 'default',
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  color?: InputColor;
  size?: any;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, color, onChange, ...props }, ref) => {
    // Handle number input to remove leading zeros
    const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type === 'number') {
        // Get the current value
        const value = e.target.value;

        // Remove leading zeros but preserve single zero and decimals
        if (
          value.length > 1 &&
          value.startsWith('0') &&
          !value.startsWith('0.')
        ) {
          // Remove leading zeros (but keep decimal part if present)
          const parts = value.split('.');
          const integerPart = parts[0].replace(/^0+/, '') || '0';

          // Set the new value (with or without decimal part)
          e.target.value =
            parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
        }
      }

      // Call the original onChange handler if provided
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <input
        type={type}
        className={cn(inputVariants({ color, size }), className)}
        ref={ref}
        onChange={handleNumberInput}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
