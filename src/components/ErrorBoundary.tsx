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

  handleCopy = () => {
    const detail = `${this.state.error?.name ?? "Error"}: ${this.state.error?.message ?? "desconocido"}`;
    try {
      navigator.clipboard?.writeText(detail);
    } catch {}
  };

  render() {
    if (this.state.hasError) {
      const detail = this.state.error?.message ?? "";
      return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
          <div className="text-center space-y-4 max-w-sm">
            <img src={errorMascot} alt="" className="w-40 h-40 mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">

              Algo salió mal
            </h1>
            <p className="text-sm text-muted-foreground">
              Ocurrió un error inesperado. Por favor, recarga la aplicación.
            </p>
            {detail && (
              <p className="text-[11px] leading-snug text-muted-foreground/70 break-words px-2">
                {detail.slice(0, 200)}
              </p>
            )}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={this.handleReload}
                className="px-6 py-2.5 rounded-lg bg-foreground text-background font-medium text-sm"
              >
                Recargar
              </button>
              {detail && (
                <button
                  onClick={this.handleCopy}
                  className="text-xs text-muted-foreground underline py-1"
                >
                  Copiar detalles del error
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }


    return this.props.children;
  }
}

export default ErrorBoundary;
