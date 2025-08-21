import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-transparent',
  {
    variants: {
      variant: {
        default: 'bg-black text-white hover:bg-neutral-800 shadow-lg hover:shadow-xl border-2 border-black hover:border-neutral-800',
        destructive: 'bg-destructive text-white hover:bg-destructive/90 shadow-lg hover:shadow-xl border-2 border-destructive hover:border-destructive/90',
        outline: 'border-2 border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 hover:border-neutral-400 font-medium',
        secondary: 'bg-neutral-700 text-white hover:bg-neutral-600 shadow-lg hover:shadow-xl border-2 border-neutral-700 hover:border-neutral-600',
        ghost: 'text-neutral-900 hover:bg-neutral-100 hover:text-neutral-900 font-medium',
        link: 'text-neutral-700 underline-offset-4 hover:underline hover:text-black font-medium',
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
