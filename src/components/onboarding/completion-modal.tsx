"use client";

import * as React from "react";
import { CheckCircle2, RotateCcw, X } from "lucide-react";
import type { UserRole } from "@/lib/onboarding/steps";
import { Button } from "@/components/ui/button";

type CompletionModalProps = {
  onClose: () => void;
  onRestart: () => void;
  role?: UserRole;
};

const INVESTOR_RECAP = [
  {
    title: "Portfolio",
    desc: "Import or add founder contacts to build your portfolio",
  },
  {
    title: "Dashboard",
    desc: "View metrics, KPIs, and company insights at a glance",
  },
  {
    title: "Requests & Schedules",
    desc: "Send metric requests and automate recurring collections",
  },
  {
    title: "Reports & Funds",
    desc: "Analyze portfolio performance and generate LP reports",
  },
];

const FOUNDER_RECAP = [
  {
    title: "Metrics",
    desc: "Submit your key performance data for all approved investors",
  },
  {
    title: "Documents",
    desc: "Upload financial statements, board decks, and updates",
  },
  {
    title: "Investors",
    desc: "Control which investors can access your data",
  },
];

export function CompletionModal({ onClose, onRestart, role = "investor" }: CompletionModalProps) {
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

  const recap = role === "founder" ? FOUNDER_RECAP : INVESTOR_RECAP;
  const subtitle =
    role === "founder"
      ? "You're ready to share metrics with investors!"
      : "You're ready to manage your portfolio!";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-backdrop backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl border border-border-default bg-bg-secondary p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="completion-modal-title">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="absolute right-4 top-4"
          type="button"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success-bg-muted)]">
            <CheckCircle2 className="h-8 w-8 text-[var(--success-accent)]" />
          </div>

          <h2 id="completion-modal-title" className="mt-4 text-xl font-semibold text-text-primary">
            You&apos;re all set!
          </h2>

          <p className="mt-2 text-sm text-text-tertiary">
            {subtitle}
          </p>

          <ul className="mt-4 space-y-2 text-left text-sm text-text-secondary">
            {recap.map((item) => (
              <li key={item.title} className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-text-muted" />
                <span>
                  <strong className="text-text-primary">{item.title}</strong> - {item.desc}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex w-full flex-col gap-2">
            <Button
              onClick={onClose}
              className="w-full"
              type="button"
            >
              Get started
            </Button>
            <Button
              variant="secondary"
              onClick={onRestart}
              className="w-full"
              type="button"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Take the tour again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
