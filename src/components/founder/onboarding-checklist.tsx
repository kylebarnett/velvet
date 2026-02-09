"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  X,
  FileText,
  BarChart3,
  Users,
  ChevronRight,
} from "lucide-react";

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
};

type Props = {
  hasSubmittedMetrics: boolean;
  hasUploadedDocuments: boolean;
  hasReviewedInvestors: boolean;
};

export function OnboardingChecklist({
  hasSubmittedMetrics,
  hasUploadedDocuments,
  hasReviewedInvestors,
}: Props) {
  const [dismissed, setDismissed] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    async function check() {
      try {
        const res = await fetch(
          "/api/user/preferences?key=founder_onboarding_dismissed",
        );
        const json = await res.json().catch(() => null);
        if (json?.value === true) setDismissed(true);
      } catch {
        // Non-critical
      } finally {
        setLoaded(true);
      }
    }
    check();
  }, []);

  async function handleDismiss() {
    setDismissed(true);
    try {
      await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "founder_onboarding_dismissed",
          value: true,
        }),
      });
    } catch {
      // Non-critical
    }
  }

  const items: ChecklistItem[] = [
    {
      id: "account",
      label: "Create your account",
      description: "You're all set!",
      completed: true,
      href: "#",
    },
    {
      id: "investors",
      label: "Review investor access",
      description: "Approve or deny investors who want to see your metrics",
      completed: hasReviewedInvestors,
      href: "/portal/investors",
    },
    {
      id: "metrics",
      label: "Submit your first metrics",
      description: "Share your key performance data with investors",
      completed: hasSubmittedMetrics,
      href: "/portal?tab=metrics",
    },
    {
      id: "documents",
      label: "Upload a document",
      description: "Share financial statements, board decks, or updates",
      completed: hasUploadedDocuments,
      href: "/portal?tab=documents",
    },
  ];

  const icons: Record<string, React.ReactNode> = {
    account: <CheckCircle2 className="h-4 w-4" />,
    investors: <Users className="h-4 w-4" />,
    metrics: <BarChart3 className="h-4 w-4" />,
    documents: <FileText className="h-4 w-4" />,
  };

  const completedCount = items.filter((i) => i.completed).length;
  const allComplete = completedCount === items.length;

  if (!loaded || dismissed || allComplete) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-white">Getting Started</h3>
          <p className="mt-0.5 text-xs text-white/60">
            {completedCount} of {items.length} complete
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-md p-1 text-white/40 hover:text-white/70 transition-colors"
          aria-label="Dismiss checklist"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-white/10">
        <div
          className="h-1.5 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${(completedCount / items.length) * 100}%` }}
        />
      </div>

      <div className="mt-4 space-y-1">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
              item.completed ? "opacity-60" : "hover:bg-white/5"
            }`}
          >
            {item.completed ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-white/30" />
            )}
            <div className="min-w-0 flex-1">
              <div
                className={`text-sm ${item.completed ? "line-through text-white/60" : "text-white"}`}
              >
                {item.label}
              </div>
              <div className="text-xs text-white/40">{item.description}</div>
            </div>
            {!item.completed && (
              <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
