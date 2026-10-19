import { useLayoutEffect, useRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import type { ItemKind } from '@/lib/planner/types'
import { formatNumber, parseAmount } from '@/lib/planner/calc'

export const kindVar = (k: ItemKind) => `var(--k-${k})`

export function KindDot({ kind, size = 14 }: { kind: ItemKind; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: kindVar(kind) }}
    />
  )
}

/** Textarea that grows to fit its content. Enter blurs when singleLine. */
export function AutoTextarea({
  value,
  onChange,
  singleLine,
  className = '',
  ...rest
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & {
  value: string
  onChange: (v: string) => void
  singleLine?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight + 4}px`
    }
    fit()
    // Re-fit once web fonts load and when the width changes, since both change line wrapping.
    document.fonts?.ready.then(fit)
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [value])
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      className={`tp-field ${className}`}
      onChange={(e) => onChange(singleLine ? e.target.value.replace(/\n/g, ' ') : e.target.value)}
      onKeyDown={(e) => {
        if (singleLine && e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        }
      }}
      {...rest}
    />
  )
}

export function AmountInput({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (n: number) => void
  label: string
}) {
  return (
    <label className="flex min-h-12 items-center rounded-[10px] border-2 border-tp-line bg-tp-surface px-3 focus-within:border-tp-accent hover:border-tp-ink2">
      <span aria-hidden className="mr-1 text-[17px] font-semibold text-tp-ink2">
        ₹
      </span>
      <input
        aria-label={label}
        inputMode="numeric"
        placeholder="0"
        value={value ? formatNumber(value) : ''}
        onChange={(e) => onChange(parseAmount(e.target.value))}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full min-w-0 bg-transparent text-right text-[17px] font-semibold outline-none"
      />
    </label>
  )
}

export const GripIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden fill="currentColor">
    {[5, 9, 13].map((y) => (
      <g key={y}>
        <circle cx="6" cy={y} r="1.5" />
        <circle cx="12" cy={y} r="1.5" />
      </g>
    ))}
  </svg>
)

export const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6" />
  </svg>
)
