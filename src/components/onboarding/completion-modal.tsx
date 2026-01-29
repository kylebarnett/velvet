"use client";

import * as React from "react";
import { CheckCircle2, RotateCcw, X } from "lucide-react";

type CompletionModalProps = {
  onClose: () => void;
  onRestart: () => void;
};

export function CompletionModal({ onClose, onRestart }: CompletionModalProps) {
  // Handle Escape key
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white/60"
          type="button"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>

          <h2 className="mt-4 text-xl font-semibold text-white">
            You&apos;re all set!
          </h2>

          <p className="mt-2 text-sm text-white/60">
            You&apos;ve completed the Velvet tour. Here&apos;s a quick recap of what you learned:
          </p>

          <ul className="mt-4 space-y-2 text-left text-sm text-white/70">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
              <span>
                <strong className="text-white">Portfolio</strong> - Import or add founder contacts to build your portfolio
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
              <span>
                <strong className="text-white">Templates</strong> - Create reusable metric sets for consistent tracking
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
              <span>
                <strong className="text-white">Requests</strong> - Send metric requests and track submissions
              </span>
            </li>
          </ul>

          <div className="mt-6 flex w-full flex-col gap-2">
            <button
              onClick={onClose}
              className="w-full rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90"
              type="button"
            >
              Get started
            </button>
            <button
              onClick={onRestart}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
              type="button"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Take the tour again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
