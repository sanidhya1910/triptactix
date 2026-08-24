import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink',
        'transition-[border-color,box-shadow] duration-200',
        'hover:border-ink/25',
        'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15',
        'aria-[invalid=true]:border-neg-fg aria-[invalid=true]:focus:ring-neg-fg/15',
        'disabled:cursor-not-allowed disabled:opacity-45',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };
