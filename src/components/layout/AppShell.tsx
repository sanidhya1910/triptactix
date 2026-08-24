import * as React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  /** `wide` is for the data-dense screens (search results, fare analytics). */
  width?: 'default' | 'wide' | 'narrow';
  className?: string;
}

const widths = {
  narrow: 'max-w-3xl',
  default: 'max-w-6xl',
  wide: 'max-w-7xl',
} as const;

/**
 * Owns the fixed-navbar offset and the container width so individual screens
 * stop repeating `pt-24` and drifting between four different max-widths.
 */
export function AppShell({ children, width = 'default', className }: AppShellProps) {
  return (
    <div className="min-h-[100dvh] bg-canvas">
      <Navbar />
      <main id="main" className={cn('px-5 pb-24 pt-24 sm:px-8 md:pt-28', className)}>
        <div className={cn('mx-auto w-full', widths[width])}>{children}</div>
      </main>
    </div>
  );
}
