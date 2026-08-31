"use client";

import React, { Component, ReactNode, ErrorInfo } from "react";
import { reportClientIncidentAction } from "@/lib/telemetry";

interface Props {
  children: ReactNode;
  sessionId?: string;
  attemptId?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  reported: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      reported: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Send telemetry to server proctor stream
    reportClientIncidentAction({
      sessionId: this.props.sessionId,
      attemptId: this.props.attemptId,
      errorType: error.name || "CLIENT_RUNTIME_ERROR",
      message: error.message || "Unknown rendering exception",
      stack: error.stack || errorInfo.componentStack || undefined,
      context: {
        location: typeof window !== "undefined" ? window.location.href : "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : ""
      }
    }).then(() => {
      this.setState({ reported: true });
    }).catch(err => {
      console.error("Telemetry report failed:", err);
    });
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-sans">
          <div className="bg-slate-800 p-8 sm:p-10 rounded-3xl border border-slate-700 shadow-2xl max-w-lg w-full text-center space-y-6 animate-in fade-in">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
              <span className="text-3xl">🛡️</span>
            </div>

            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-100">Assessment Paused (Crash Protection)</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                An unexpected client error occurred. Your answered questions and progress are safely preserved in our local recovery buffer and cloud database.
              </p>
            </div>

            {this.state.reported ? (
              <div className="p-3 bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                <span>✓ Incident logged with exam proctors</span>
              </div>
            ) : (
              <div className="p-3 bg-slate-700/60 border border-slate-600 text-slate-300 rounded-xl text-xs font-medium">
                Logging error telemetry...
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition-colors"
              >
                🔄 Reload & Resume Assessment
              </button>
              <p className="text-[11px] text-slate-500">
                You will be returned to your current question with all previous answers intact.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
