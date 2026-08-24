import { cn } from '@/lib/utils';

interface StatProps {
  value: string;
  label: string;
  detail?: string;
  className?: string;
}

/**
 * Numerals are monospaced and tabular so figures line up column to column.
 * In a fare-comparison product misaligned digits are a defect, not a detail.
 */
export function Stat({ value, label, detail, className }: StatProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="font-mono text-3xl font-medium tracking-[-0.02em] text-ink [font-variant-numeric:tabular-nums] sm:text-4xl">
        {value}
      </span>
      <span className="text-sm text-ink-secondary">{label}</span>
      {detail && <span className="text-xs text-ink-tertiary">{detail}</span>}
    </div>
  );
}
