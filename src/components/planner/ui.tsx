import { forwardRef, useLayoutEffect, useRef } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { formatNumber, parseAmount } from '@/lib/planner/calc'
import { cn } from '@/lib/utils'

/**
 * Reads as plain text until hovered or focused, so a plan looks like a document
 * rather than a form, while every title is still one click from editable.
 */
export const inlineField =
  'w-full min-w-0 rounded-md border border-transparent bg-transparent px-2 text-ink transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-ink-tertiary hover:border-line focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/15'

/** Square, quiet icon button for row and card actions. */
export const iconButton =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-tertiary transition-colors hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'

export const InlineInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, onKeyDown, ...props }, ref) => (
    <input
      ref={ref}
      {...props}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        onKeyDown?.(e)
      }}
      className={cn(inlineField, 'h-9 text-sm', className)}
    />
  ),
)
InlineInput.displayName = 'InlineInput'

/** Textarea that grows to fit its content instead of scrolling inside itself. */
export function AutoTextarea({
  value,
  onChange,
  className,
  ...rest
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & {
  value: string
  onChange: (v: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight + 2}px`
    }
    fit()
    // Wrapping changes once web fonts load and whenever the width changes.
    document.fonts?.ready.then(fit)
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [value])
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(inlineField, 'block resize-none overflow-hidden py-1.5 text-sm leading-relaxed', className)}
      {...rest}
    />
  )
}

/** Rupee amount. Monospaced and tabular so a column of costs lines up digit for digit. */
export function AmountInput({
  value,
  onChange,
  label,
  className,
}: {
  value: number
  onChange: (n: number) => void
  label: string
  className?: string
}) {
  return (
    <label
      className={cn(
        'flex h-9 items-center rounded-md border border-line bg-surface px-2.5 transition-[border-color,box-shadow] duration-200 hover:border-line-strong focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15',
        className,
      )}
    >
      <span aria-hidden className="mr-1 font-mono text-sm text-ink-tertiary">
        ₹
      </span>
      <input
        aria-label={label}
        inputMode="numeric"
        placeholder="0"
        value={value ? formatNumber(value) : ''}
        onChange={(e) => onChange(parseAmount(e.target.value))}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="w-full min-w-0 bg-transparent text-right font-mono text-sm text-ink outline-none [font-variant-numeric:tabular-nums] placeholder:text-ink-tertiary"
      />
    </label>
  )
}

/**
 * Focus an element once React has committed the render that creates it. Updates from
 * a click are committed before the next macrotask, so a zero timeout is enough; it is
 * used instead of requestAnimationFrame, which never fires while frames are throttled.
 */
export function focusSoon(id: string, { scroll = false } = {}) {
  setTimeout(() => {
    const el = document.getElementById(id)
    if (!el) return
    if (scroll) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    ;(el as HTMLElement).focus({ preventScroll: scroll })
  })
}
