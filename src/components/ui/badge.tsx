import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Pill radius is reserved for tags and status badges. Every variant previously
 * pointed at undefined tokens (bg-primary, text-secondary-foreground, ...) and
 * rendered transparent, which is why call sites all passed their own colors.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium uppercase tracking-[0.05em] leading-5 whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-ink text-surface',
        neutral: 'bg-surface-sunken text-ink-secondary',
        outline: 'border border-line-strong text-ink-secondary',
        brand: 'bg-brand-soft text-brand',
        positive: 'bg-pos text-pos-fg',
        negative: 'bg-neg text-neg-fg',
        caution: 'bg-caution text-caution-fg',
        info: 'bg-info text-info-fg',
        /** Kept so existing `variant="secondary" | "destructive"` call sites keep working. */
        secondary: 'bg-surface-sunken text-ink-secondary',
        destructive: 'bg-neg text-neg-fg',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
