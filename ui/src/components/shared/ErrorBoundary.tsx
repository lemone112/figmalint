import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static MAX_RETRIES = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < ErrorBoundary.MAX_RETRIES;

      return (
        <div className="h-full flex items-center justify-center px-6" role="alert">
          <div className="max-w-[280px] text-center space-y-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-bg-danger">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-fg-danger"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div>
              <h2 className="text-13 font-medium text-fg">Something went wrong</h2>
              <p className="text-11 text-fg-secondary mt-1">
                {canRetry
                  ? 'An unexpected error occurred. Try again or reload the plugin.'
                  : 'This error keeps happening. Please reload the plugin.'}
              </p>
            </div>
            {this.state.error && (
              <p className="text-11 text-fg-tertiary font-mono break-all">
                {this.state.error.message}
              </p>
            )}
            {canRetry ? (
              <button
                className="px-4 py-2 bg-bg-brand text-fg-onbrand text-12 font-medium rounded-xl hover:opacity-90 transition-opacity"
                onClick={this.handleRetry}
              >
                Retry
              </button>
            ) : (
              <button
                className="px-4 py-2 bg-bg-secondary text-fg-secondary text-12 font-medium rounded-xl hover:opacity-90 transition-opacity"
                onClick={() => window.location.reload()}
              >
                Reload Plugin
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
