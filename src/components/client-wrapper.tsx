'use client'

import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { ErrorBoundary, useUnhandledRejectionHandler } from '@/components/error-boundary'

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  // Handle unhandled promise rejections globally
  useUnhandledRejectionHandler()
  
  // Add additional error handling for network issues
  useEffect(() => {
    // Global fetch wrapper to handle network errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        return await originalFetch(...args);
      } catch (error) {
        if (error instanceof Error && 
            (error.message.includes('ECONNRESET') || 
             error.message.includes('ETIMEDOUT') || 
             error.message.includes('ECONNREFUSED'))) {
          console.warn('Network fetch failed:', error.message);
          // Return a failed response instead of throwing
          return new Response(JSON.stringify({ 
            error: 'Network unavailable', 
            code: 'NETWORK_ERROR' 
          }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          });
        }
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);
  
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
