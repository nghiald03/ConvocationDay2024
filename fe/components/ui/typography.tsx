import React from 'react';
import { cn } from '@/lib/utils'; // Tích hợp tiện ích nối class của ShadcnUI

interface TypographyProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'p';
}

export const Typography = ({
  variant = 'p',
  className,
  ...props
}: TypographyProps) => {
  const Component = variant as keyof JSX.IntrinsicElements;
  const baseClasses = {
    h1: 'text-3xl font-bold',
    h2: 'text-2xl font-semibold',
    h3: 'text-xl font-medium',
    p: 'text-base',
  };

  return (
    <div className={cn(baseClasses[variant], className)} {...props}>
      {props.children}
    </div>
  );
};
