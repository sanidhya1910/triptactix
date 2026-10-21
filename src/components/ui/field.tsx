'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Label above, control, error below. No placeholder-as-label anywhere.
 * `error` renders with role="alert" so it is announced on validation failure.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;
  const describedBy = (error ? errorId : hint ? hintId : undefined) || undefined;

  // Point the control at its hint or error, so a screen reader reads it with the field
  // rather than only when it first appears. Only a single element child can take it.
  const child =
    describedBy && React.isValidElement<{ 'aria-describedby'?: string; 'aria-invalid'?: boolean }>(children)
      ? React.cloneElement(children, {
          'aria-describedby': [children.props['aria-describedby'], describedBy].filter(Boolean).join(' '),
          ...(error ? { 'aria-invalid': true } : {}),
        })
      : children;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-neg-fg">*</span>}
      </Label>
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-tertiary">
          {hint}
        </p>
      )}
      {child}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-neg-fg">
          {error}
        </p>
      )}
    </div>
  );
}
