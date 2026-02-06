import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Global error handler - catches unhandled errors and promise rejections
function setupGlobalErrorHandlers(onError: (error: Error) => void) {
  // Catch unhandled errors
  const handleError = (event: ErrorEvent) => {
    console.error('[GlobalError] Uncaught error:', event.error || event.message);
    onError(event.error || new Error(event.message));
  };

  // Catch unhandled promise rejections
  const handleRejection = (event: PromiseRejectionEvent) => {
    console.error('[GlobalError] Unhandled promise rejection:', event.reason);
    // Only treat critical rejections as fatal
    if (event.reason?.message?.includes('Failed to fetch') === false) {
      onError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
    }
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);

  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
  };
}

export class ErrorBoundary extends Component<Props, State> {
  private cleanupGlobalHandlers?: () => void;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidMount() {
    // Setup global error handlers
    this.cleanupGlobalHandlers = setupGlobalErrorHandlers((error) => {
      // Only set error state if it's a critical error
      if (!this.state.hasError) {
        this.setState({ hasError: true, error });
      }
    });
  }

  componentWillUnmount() {
    this.cleanupGlobalHandlers?.();
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleRefresh} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </Button>
              <Button variant="outline" onClick={this.handleGoHome} className="gap-2">
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
