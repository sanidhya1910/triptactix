'use client'

import { Toaster } from 'sonner'
import { ErrorBoundary, useUnhandledRejectionHandler } from '@/components/error-boundary'

// There used to be a global window.fetch wrapper here that turned network errors into
// synthetic 503 responses. Browsers report those failures as "Failed to fetch", never the
// Node error codes it matched, so it never fired; had it fired, it would have hidden real
// failures from every catch block. Each caller now handles its own failures.
export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  useUnhandledRejectionHandler()

  return (
    <ErrorBoundary>
      {children}
      <Toaster
        position="bottom-right"
        gap={10}
        toastOptions={{
          classNames: {
            toast:
              'rounded-lg border border-line bg-surface text-ink shadow-xl font-sans text-sm',
            description: 'text-ink-secondary',
            actionButton: 'bg-ink text-surface rounded-md',
            cancelButton: 'bg-surface-sunken text-ink-secondary rounded-md',
            error: 'border-neg-fg/25 bg-neg text-neg-fg',
            success: 'border-pos-fg/25 bg-pos text-pos-fg',
            warning: 'border-caution-fg/25 bg-caution text-caution-fg',
          },
        }}
      />
    </ErrorBoundary>
  )
}
