"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center p-8">
          <div className="w-full max-w-md rounded-xl border border-border-default card-surface p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 text-red-400"
                aria-hidden="true"
              >
                <circle cx={12} cy={12} r={10} />
                <line x1={12} y1={8} x2={12} y2={12} />
                <line x1={12} y1={16} x2={12.01} y2={16} />
              </svg>
            </div>

            <h2 className="mb-2 text-lg font-semibold text-text-primary">
              Something went wrong
            </h2>
            <p className="mb-6 text-sm text-text-tertiary">
              An unexpected error occurred. Try reloading to fix the issue.
            </p>

            <button
              onClick={this.handleReset}
              className="rounded-lg bg-btn-primary-bg px-4 py-2 text-sm font-medium text-btn-primary-text transition-colors hover:bg-btn-primary-hover"
            >
              Reload
            </button>

            {this.state.error && (
              <div className="mt-4">
                <button
                  onClick={this.toggleDetails}
                  className="rounded-lg border border-border-default bg-bg-elevated px-3 py-1.5 text-xs text-text-tertiary transition-colors hover:bg-bg-hover"
                >
                  {this.state.showDetails ? "Hide details" : "Show details"}
                </button>

                {this.state.showDetails && (
                  <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-border-default bg-bg-input p-3 text-left text-xs text-[var(--status-error-text)]">
                    {this.state.error.message}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
