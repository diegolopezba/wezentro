import React, { Component, ErrorInfo, ReactNode } from "react";
import errorMascot from "@/assets/error-mascot.png";


interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
    // Defensive: ensure body isn't left scroll-locked from a child modal,
    // otherwise the "Recargar" button can be unreachable on iOS PWA.
    try {
      document.body.style.overflow = "";
    } catch {}
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
          <div className="text-center space-y-4 max-w-sm">
            <h1 className="text-xl font-semibold text-foreground">
              Algo salió mal
            </h1>
            <p className="text-sm text-muted-foreground">
              Ocurrió un error inesperado. Por favor, recarga la aplicación.
            </p>
            <button
              onClick={this.handleReload}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
