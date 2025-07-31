import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-12 w-full rounded-lg border-2 border-neutral-900 bg-white px-4 py-3 text-sm text-neutral-900 font-bold placeholder:text-neutral-600 placeholder:font-medium focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary-600',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
