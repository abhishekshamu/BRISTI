import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Admin ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="admin-empty h-64">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Something went wrong</h3>
          <p className="text-xs text-slate-500 mt-1">An unexpected error occurred. Reload the page to continue.</p>
          <button type="button" className="admin-btn-primary px-4 py-2 text-sm mt-4" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
