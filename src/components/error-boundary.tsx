'use client'

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Handle network errors specifically
    if (error.message.includes('ECONNRESET') || 
        error.message.includes('ETIMEDOUT') || 
        error.message.includes('ECONNREFUSED')) {
      console.warn('Network connection error in component:', error.message)
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent 
          error={this.state.error!} 
          resetError={() => this.setState({ hasError: false })} 
        />
      )
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  const isNetwork =
    error.message.includes('ECONNRESET') || error.message.toLowerCase().includes('network')

  return (
    <main className="flex min-h-[100dvh] items-center px-5 sm:px-8">
      <div className="mx-auto w-full max-w-lg">
        <p className="font-mono text-sm text-ink-tertiary">Error</p>
        <h1 className="mt-4 text-display-sm text-ink">
          {isNetwork ? 'We lost the connection.' : 'This screen failed to load.'}
        </h1>
        <p className="mt-4 leading-relaxed text-ink-secondary">
          {isNetwork
            ? 'Check your internet connection, then try again. Nothing you saved has been lost.'
            : 'Trying again usually clears it. If it keeps happening, the service behind this screen is probably down.'}
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <button
            onClick={resetError}
            className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-5 text-sm font-medium text-surface transition-colors duration-200 hover:bg-ink/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex h-10 items-center justify-center rounded-md border border-line-strong bg-surface px-5 text-sm font-medium text-ink transition-colors duration-200 hover:border-ink/25 hover:bg-surface-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            Reload the page
          </button>
        </div>
      </div>
    </main>
  )
}

// Hook for handling unhandled promise rejections
export function useUnhandledRejectionHandler() {
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      
      // Handle specific network errors
      if (event.reason && typeof event.reason === 'object' && 'code' in event.reason) {
        const error = event.reason as { code: string; message?: string }
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
          console.warn(`Network error (${error.code}): Connection to external service failed`)
          // Prevent the error from being logged as unhandled
          event.preventDefault()
        }
      }
    }

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error)
      
      // Handle network errors
      if (event.error && event.error.message && 
          (event.error.message.includes('ECONNRESET') || 
           event.error.message.includes('ETIMEDOUT') || 
           event.error.message.includes('ECONNREFUSED'))) {
        console.warn('Network connection error:', event.error.message)
        event.preventDefault()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])
}
