'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button'; // Import Button từ shadcn
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Minus, Plus } from 'lucide-react';

export interface InputNumberProps {
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  defaultValue?: number;
  onChange?: (value: number) => void;
  className?: string;
}

const InputNumber = React.forwardRef<HTMLInputElement, InputNumberProps>(
  (
    {
      min = 0,
      max,
      step = 1,
      defaultValue = 0,
      disabled = false,
      onChange,
      className,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = React.useState(defaultValue);

    React.useEffect(() => {
      setValue(defaultValue);
    }, [defaultValue]);

    const handleMinus = (e: React.MouseEvent) => {
      e.preventDefault();
      const newValue = Math.max(min, value - step);
      setValue(newValue);
      onChange?.(newValue);
    };

    const handlePlus = (e: React.MouseEvent) => {
      e.preventDefault();
      const newValue =
        max !== undefined ? Math.min(max, value + step) : value + step;
      setValue(newValue);
      onChange?.(newValue);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value.replace(/[^0-9.-]/g, '');
      let newValue = parseFloat(inputValue);

      if (isNaN(newValue)) newValue = min;
      if (newValue < min) newValue = min;
      if (max !== undefined && newValue > max) newValue = max;

      setValue(newValue);
      onChange?.(newValue);
    };

    // Ensure value stays within bounds if min/max changes
    React.useEffect(() => {
      let newValue = value;
      if (value < min) newValue = min;
      if (max !== undefined && value > max) newValue = max;

      if (newValue !== value) {
        setValue(newValue);
        onChange?.(newValue);
      }
    }, [min, max, value, onChange]);

    return (
      <div className={cn('flex items-center flex-1', className)} {...props}>
        <Button
          variant='outline'
          size='md'
          onClick={handleMinus}
          disabled={value <= min || disabled}
          className='rounded-r-none !px-2'
        >
          <Minus className='h-4 w-4' />
        </Button>
        <Input
          type='text'
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          onChange={handleInputChange}
          className={cn(
            'w-20 text-center border border-input bg-background !rounded-none text-base focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          ref={ref}
        />
        <Button
          variant='outline'
          size='md'
          onClick={handlePlus}
          className='rounded-l-none !px-2'
          disabled={(max !== undefined && value >= max) || disabled}
        >
          <Plus className='h-4 w-4' />
        </Button>
      </div>
    );
  }
);

InputNumber.displayName = 'InputNumber';

export { InputNumber };
