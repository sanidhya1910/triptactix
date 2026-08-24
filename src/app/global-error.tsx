'use client';

import { useEffect } from 'react';
import { fontClassNames } from '@/lib/fonts';
// This boundary renders its own <html>/<body>, so it has to pull the stylesheet
// in itself. Without this it fell back to unstyled browser defaults.
import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error caught:', error);

    if (
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ECONNREFUSED')
    ) {
      console.warn('Network connection error:', error.message);
    }
  }, [error]);

  return (
    <html lang="en" className={fontClassNames}>
      <body className="bg-canvas text-ink">
        <main className="flex min-h-[100dvh] items-center px-5 sm:px-8">
          <div className="mx-auto w-full max-w-lg">
            <p className="font-mono text-sm text-ink-tertiary">Error</p>
            <h1 className="mt-4 text-display-sm text-ink">The app failed to load.</h1>
            <p className="mt-4 leading-relaxed text-ink-secondary">
              This is usually a temporary network problem rather than something wrong with your
              trip. Reloading normally clears it.
            </p>

            <button
              onClick={reset}
              className="mt-9 inline-flex h-10 items-center justify-center rounded-md bg-ink px-5 text-sm font-medium text-surface transition-colors duration-200 hover:bg-ink/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              Try again
            </button>

            {error.digest && (
              <p className="mt-10 font-mono text-xs text-ink-tertiary">
                Reference {error.digest}
              </p>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
