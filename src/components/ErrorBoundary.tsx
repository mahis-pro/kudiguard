import { Component, ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode; // Optional custom fallback UI
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: _, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
    // You could also log error to an error reporting service here
    // logErrorToMyService(error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-card text-center">
            <CardHeader>
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle className="text-2xl text-destructive">Something went wrong!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We're sorry, an unexpected error occurred. Please try reloading the page.
              </p>
              <Button onClick={this.handleReload} className="bg-gradient-primary hover:shadow-success">
                Reload Page
              </Button>
              {/* Optional: Display error details in development */}
              {import.meta.env.DEV && this.state.error && (
                <details className="mt-4 text-sm text-left text-muted-foreground p-2 border rounded-md bg-muted/50">
                  <summary className="font-semibold cursor-pointer text-foreground">Error Details</summary>
                  <pre className="whitespace-pre-wrap break-all mt-2">
                    {this.state.error.toString()}
                    <br />
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;