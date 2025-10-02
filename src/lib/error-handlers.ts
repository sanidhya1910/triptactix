// Global error handler for Node.js process
// This should be loaded as early as possible

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  // Handle network errors specifically
  const networkError = error as Error & { code?: string };
  if (networkError.code === 'ECONNRESET' || 
      networkError.code === 'ETIMEDOUT' || 
      networkError.code === 'ECONNREFUSED') {
    console.warn(`Network error (${networkError.code}): ${error.message}`);
    // Don't exit the process for network errors
    return;
  }
  
  // For other errors, log and exit gracefully
  console.error('Application will restart due to uncaught exception');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
  
  // Handle network errors in promises
  if (reason && typeof reason === 'object' && 'code' in reason) {
    const networkError = reason as { code: string; message?: string };
    if (networkError.code === 'ECONNRESET' || 
        networkError.code === 'ETIMEDOUT' || 
        networkError.code === 'ECONNREFUSED') {
      console.warn(`Unhandled network error (${networkError.code}): External service unavailable`);
      // Don't exit the process for network errors
      return;
    }
  }
  
  // For other rejections, log but don't exit (let Next.js handle it)
  console.warn('Unhandled promise rejection - continuing execution');
});

// Handle warnings
process.on('warning', (warning) => {
  console.warn('Warning:', warning.name, warning.message);
  if (warning.stack) {
    console.warn('Stack:', warning.stack);
  }
});

export {};
