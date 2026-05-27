import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AppContext } from '@/store/AppContext';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  static contextType = AppContext;
  declare context: React.ContextType<typeof AppContext>;

  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetView = () => {
    if (this.context) {
      // Clear active borewell and selected cross-section list to recover from bad data/state crashes
      this.context.dispatch({ type: 'SET_SELECTED_BOREWELLS', payload: [] });
      this.context.dispatch({ type: 'SET_ACTIVE_BOREWELL', id: null });
      this.context.dispatch({ type: 'SET_VIEW_MODE', mode: 'map' });
    }
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] w-full p-8 text-center rounded-2xl border border-red-500/10 bg-deep-void/90 backdrop-blur-md">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-6 animate-pulse">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          
          <h3 className="text-red-400 text-lg font-semibold tracking-wide mb-2">
            Something went wrong
          </h3>
          <p className="text-shallows/60 text-sm max-w-md leading-relaxed mb-6">
            The visualization failed to render.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-foam bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Page
            </button>
            <button
              onClick={this.handleResetView}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-void bg-core hover:bg-shoal transition-colors shadow-glass"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset View
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
