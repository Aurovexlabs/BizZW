import { AlertTriangle, RefreshCw } from 'lucide-react';
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.props.onError?.(error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/25">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">
            Something went wrong
          </h3>
          <p className="mb-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            This section encountered an unexpected error. Try refreshing or contact support if the
            issue persists.
          </p>
          {this.state.error && (
            <pre className="mb-6 max-w-md overflow-auto rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left font-mono text-xs text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-red-400">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper — wraps any subtree with the error boundary.
 * Use this in page-level components.
 *
 * @example
 * <WithErrorBoundary>
 *   <ExpensiveChart />
 * </WithErrorBoundary>
 */
export function WithErrorBoundary({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
}
