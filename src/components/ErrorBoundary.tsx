import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { SenaLogo } from './SenaLogo';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): State {
    let readable = error.message;
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string; path?: string };
      if (parsed && parsed.error) {
        readable = `Error de permisos o datos (${parsed.operationType || 'operación'} en ${parsed.path || 'colección'}): ${parsed.error}`;
      }
    } catch {
      // Keep raw error message
    }
    return { hasError: true, message: readable };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
            <div className="mb-4">
              <SenaLogo className="w-9 h-9" />
            </div>
            <div className="flex items-center gap-3 text-red-700 dark:text-red-400 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Se presentó un inconveniente en la sesión
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              {this.state.message || 'Ocurrió un error inesperado al sincronizar la información de inducción.'}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#166534] dark:bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
