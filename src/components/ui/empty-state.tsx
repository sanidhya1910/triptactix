import * as React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** Empty states usually sit directly under the page h1, so h2 is the default. */
  as?: 'h2' | 'h3';
}

/** A composed starting point, not a blank panel. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  as: Heading = 'h2',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg border border-dashed border-line-strong bg-surface px-6 py-16 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-surface-sunken text-ink-secondary">
          {icon}
        </div>
      )}
      <Heading className="text-lg font-semibold text-ink">{title}</Heading>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-secondary">{description}</p>
      )}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
