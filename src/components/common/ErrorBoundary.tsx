import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../lib/logger';
import { Icons } from '../Icon';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error("Uncaught error in ErrorBoundary", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="min-h-screen bg-arch-950 flex items-center justify-center p-6 font-sans">
                    <div className="max-w-md w-full relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 shadow-2xl transition-all duration-300">
                        {/* Background Glow */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent-600/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500 mb-6">
                                <Icons.AlertTriangle size={32} />
                            </div>

                            <h1 className="text-2xl font-bold text-white mb-3">Algo no ha salido bien</h1>
                            <p className="text-arch-400 mb-8 leading-relaxed">
                                La aplicación ha encontrado un error inesperado. Hemos registrado el incidente para solucionarlo lo antes posible.
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={this.handleReset}
                                    className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-accent-600 hover:bg-accent-500 text-white rounded-xl font-semibold transition-all duration-200 active:scale-95"
                                >
                                    <Icons.Refresh size={18} />
                                    <span>Recargar Aplicación</span>
                                </button>

                                <button
                                    onClick={() => window.history.back()}
                                    className="w-full px-6 py-2 text-arch-500 hover:text-arch-300 text-sm font-medium transition-colors"
                                >
                                    Volver atrás
                                </button>
                            </div>

                            {import.meta.env.DEV && this.state.error && (
                                <div className="mt-8 p-4 bg-red-950/30 border border-red-500/20 rounded-lg text-left overflow-auto max-h-40">
                                    <p className="text-[10px] uppercase tracking-wider text-red-400 font-bold mb-1">Debug Info:</p>
                                    <code className="text-[11px] text-red-300 font-mono break-all">
                                        {this.state.error.toString()}
                                    </code>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
