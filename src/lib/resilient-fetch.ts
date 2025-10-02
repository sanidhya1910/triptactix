export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  timeout: number;
}

export class NetworkError extends Error {
  constructor(public code: string, message: string, public originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export async function resilientFetch(
  url: string, 
  options: RequestInit = {}, 
  retryOptions: Partial<RetryOptions> = {}
): Promise<Response> {
  const config: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    timeout: 3000,
    ...retryOptions
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);
      
      // Merge the abort signal with any existing signal
      const signal = options.signal ? 
        combineAbortSignals(controller.signal, options.signal) : 
        controller.signal;

      const response = await fetch(url, {
        ...options,
        signal
      });

      clearTimeout(timeoutId);
      return response;

    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a network error we should retry
      const isRetryableError = 
        (error instanceof Error && error.name === 'AbortError') ||
        (error instanceof Error && 'code' in error && 
         ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENETUNREACH'].includes((error as any).code));

      if (!isRetryableError || attempt === config.maxRetries) {
        // Don't retry or this was the last attempt
        if (error instanceof Error && 'code' in error) {
          const networkError = error as Error & { code?: string };
          throw new NetworkError(
            networkError.code || 'UNKNOWN', 
            `Network request failed: ${error.message}`,
            error
          );
        }
        throw error;
      }

      // Calculate delay for next retry (exponential backoff with jitter)
      const delay = Math.min(
        config.baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        config.maxDelay
      );

      console.warn(`API call failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay}ms:`, error.message);
      await sleep(delay);
    }
  }

  throw lastError;
}

function combineAbortSignals(signal1: AbortSignal, signal2: AbortSignal): AbortSignal {
  const controller = new AbortController();
  
  function abort() {
    controller.abort();
  }
  
  if (signal1.aborted || signal2.aborted) {
    controller.abort();
  } else {
    signal1.addEventListener('abort', abort, { once: true });
    signal2.addEventListener('abort', abort, { once: true });
  }
  
  return controller.signal;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function callMLAPI<T>(
  endpoint: string,
  data: any,
  options: Partial<RetryOptions> = {}
): Promise<T | null> {
  try {
    // Skip ML API calls during build process
    if (process.env.NEXT_BUILD || process.env.NODE_ENV === 'test') {
      console.log('Skipping ML API call during build/test');
      return null;
    }

    const response = await resilientFetch(
      `http://localhost:8000${endpoint}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      options
    );

    if (!response.ok) {
      console.warn(`ML API returned ${response.status}: ${response.statusText}`);
      return null;
    }

    const result = await response.json();
    return result;

  } catch (error) {
    if (error instanceof NetworkError) {
      console.warn(`ML API network error (${error.code}): ${error.message}`);
    } else {
      console.warn('ML API call failed:', error instanceof Error ? error.message : error);
    }
    return null;
  }
}
