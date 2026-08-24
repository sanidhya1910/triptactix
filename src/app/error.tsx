'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/AppShell';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppShell width="narrow">
      <div className="py-12">
        <h1 className="text-display-sm text-ink">Something broke on this page.</h1>
        <p className="mt-4 text-ink-secondary prose-measure">
          We could not finish loading it. Trying again usually works. If it keeps happening, the
          data service behind this screen is probably down.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>

        {error.digest && (
          <p className="mt-10 font-mono text-xs text-ink-tertiary">Reference {error.digest}</p>
        )}
      </div>
    </AppShell>
  );
}
