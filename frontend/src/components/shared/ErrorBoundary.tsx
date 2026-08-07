import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 bg-background px-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </span>
          <h1 className="font-display text-3xl font-medium">Something went wrong</h1>
          <p className="max-w-md text-sm leading-7 text-muted-foreground">
            An unexpected error occurred. Please reload the page and try again.
          </p>
          <div className="mt-2 flex gap-3">
            <Button variant="dark" onClick={() => window.location.reload()}>
              Reload page
            </Button>
            <Button variant="outline" onClick={() => window.location.assign('/')}>
              Go to home
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
