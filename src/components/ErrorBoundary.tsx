import React, { useState, useCallback, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackLabel?: string;
}

export function ErrorBoundary({ children, fallbackLabel }: ErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      setError(event.error || new Error(event.message || 'Unknown error'));
      event.preventDefault();
    };
    const rejection = (event: PromiseRejectionEvent) => {
      setError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
    };
    window.addEventListener('error', handler);
    window.addEventListener('unhandledrejection', rejection);
    return () => {
      window.removeEventListener('error', handler);
      window.removeEventListener('unhandledrejection', rejection);
    };
  }, []);

  const handleReset = useCallback(() => {
    setError(null);
    setResetKey((k) => k + 1);
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {fallbackLabel || 'Something went wrong'}
        </h3>
        <p className="text-sm text-gray-500 mb-4 max-w-md">
          {error.message || 'An unexpected error occurred.'}
        </p>
        {error.stack && (
          <details className="mb-4 max-w-2xl w-full text-left">
            <summary className="text-xs font-semibold text-gray-400 cursor-pointer select-none">Technical details</summary>
            <pre className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md overflow-auto max-h-48 text-[10px] leading-relaxed text-gray-600 whitespace-pre-wrap">{error.stack}</pre>
          </details>
        )}
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  return <React.Fragment key={resetKey}>{children}</React.Fragment>;
}
