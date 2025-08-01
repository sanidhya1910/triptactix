import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-transparent',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg hover:shadow-xl border-2 border-primary-600 hover:border-primary-700',
        destructive: 'bg-accent-500 text-white hover:bg-accent-600 shadow-lg hover:shadow-xl border-2 border-accent-500 hover:border-accent-600',
        outline: 'border-2 border-neutral-900 bg-white text-neutral-900 hover:bg-neutral-900 hover:text-white font-bold',
        secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 shadow-lg hover:shadow-xl border-2 border-secondary-600 hover:border-secondary-700',
        ghost: 'text-neutral-900 hover:bg-neutral-200 hover:text-neutral-900 font-medium',
        link: 'text-primary-600 underline-offset-4 hover:underline hover:text-primary-700 font-medium',
      },
      size: {
        default: 'h-12 px-6 py-3',
        sm: 'h-10 rounded-lg px-4 text-sm',
        lg: 'h-14 rounded-lg px-8 text-base font-bold',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
