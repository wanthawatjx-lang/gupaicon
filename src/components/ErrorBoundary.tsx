import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { getInitialLanguage, translations } from '../i18n';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Log generic error message without sensitive PII or tokens
    console.error('UI ErrorBoundary caught error:', error?.name || 'Error', info?.componentStack ? '(render)' : '');
  }

  render() {
    if (this.state.hasError) {
      const lang = getInitialLanguage();
      const t = translations[lang].states;

      return (
        <div className="min-h-screen w-full bg-black text-white flex items-center justify-center p-6">
          <div className="max-w-sm w-full p-6 rounded-2xl bg-neutral-950 border border-neutral-800 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-base font-bold text-white">{t.errorBoundaryTitle}</h1>
            <p className="text-xs text-neutral-400 leading-relaxed">{t.errorBoundaryMessage}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t.reloadPage}</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
