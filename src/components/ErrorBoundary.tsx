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
      setError(event.error || new Error('Unknown error'));
      event.preventDefault();
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
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
