import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  onError: (error: Error) => void;
}

interface State {
  hasError: boolean;
}

/**
 * Scoped error boundary for the EventDetailModal.
 *
 * If anything inside the modal throws during render, we dismiss the modal
 * (via the onError callback → navigate(-1)) instead of letting the error
 * bubble to the global ErrorBoundary, which would blank the entire app.
 *
 * This matches Instagram's web behavior: a broken post modal falls back to
 * the feed, the app never goes white.
 */
export class ModalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ModalErrorBoundary] Caught error inside modal:", error, errorInfo);
    // Defensive: ensure the body isn't left scroll-locked from a prior render
    try {
      document.body.style.overflow = "";
    } catch {}
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      // Render nothing — parent will dismiss the modal route via navigate(-1)
      return null;
    }
    return this.props.children;
  }
}
