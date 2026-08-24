import * as React from 'react';
import { cn } from '@/lib/utils';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** `sunken` alternates the band without leaving the light theme. */
  tone?: 'canvas' | 'sunken';
  width?: 'default' | 'wide' | 'narrow';
  bleed?: boolean;
}

const widths = {
  narrow: 'max-w-3xl',
  default: 'max-w-6xl',
  wide: 'max-w-7xl',
} as const;

/**
 * One vertical rhythm for the whole site. Bottom padding runs slightly heavier
 * than top so stacked sections read optically centred rather than mathematically.
 */
export function Section({
  tone = 'canvas',
  width = 'default',
  bleed = false,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        'px-5 pt-20 pb-24 sm:px-8 md:pt-28 md:pb-32',
        tone === 'sunken' && 'bg-surface-sunken',
        className
      )}
      {...props}
    >
      <div className={cn('mx-auto w-full', !bleed && widths[width])}>{children}</div>
    </section>
  );
}

/** Section heading. Serif is confined to the display line. */
export function SectionHeading({
  title,
  lead,
  className,
  as: Comp = 'h2',
}: {
  title: string;
  lead?: string;
  className?: string;
  as?: 'h2' | 'h3';
}) {
  return (
    <div className={cn('max-w-2xl', className)}>
      <Comp className="text-display-sm text-ink">{title}</Comp>
      {lead && <p className="mt-4 text-ink-secondary prose-measure">{lead}</p>}
    </div>
  );
}
