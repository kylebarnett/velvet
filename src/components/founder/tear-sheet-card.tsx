"use client";

import * as React from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";

type TearSheet = {
  id: string;
  title: string;
  quarter: string;
  year: number;
  status: string;
  share_enabled: boolean;
  share_token: string | null;
  created_at: string;
  updated_at: string;
};

type TearSheetCardProps = {
  tearSheet: TearSheet;
  onDelete: () => void;
  /** When true, render only the delete button + confirm modal (for list view rows). */
  deleteOnly?: boolean;
};

export function TearSheetCard({
  tearSheet,
  onDelete,
  deleteOnly,
}: TearSheetCardProps) {
  const [showConfirm, setShowConfirm] = React.useState(false);

  const deleteButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={(e) => {
        e.preventDefault();
        setShowConfirm(true);
      }}
      className="shrink-0 text-text-faint hover:bg-bg-elevated hover:text-[var(--status-error-text)]"
      aria-label="Delete tear sheet"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  const confirmModal = (
    <ConfirmModal
      open={showConfirm}
      title="Delete Tear Sheet"
      message={`Are you sure you want to delete "${tearSheet.title}"? This action cannot be undone.`}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      variant="danger"
      onConfirm={() => {
        setShowConfirm(false);
        onDelete();
      }}
      onCancel={() => setShowConfirm(false)}
    />
  );

  if (deleteOnly) {
    return (
      <>
        {deleteButton}
        {confirmModal}
      </>
    );
  }

  const updatedAt = new Date(tearSheet.updated_at).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );

  return (
    <>
      <div className="rounded-xl border border-border-default card-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <Link
              href={`/portal/tear-sheets/${tearSheet.id}`}
              className="block truncate text-sm font-medium hover:text-text-secondary"
            >
              {tearSheet.title}
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  tearSheet.status === "published"
                    ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
                    : "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
                }`}
              >
                {tearSheet.status === "published" ? "Published" : "Draft"}
              </span>
              <span className="text-xs text-text-tertiary">
                {tearSheet.quarter} {tearSheet.year}
              </span>
              {tearSheet.share_enabled && (
                <span className="rounded-full bg-[var(--status-info-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-info-text)]">
                  Shared
                </span>
              )}
            </div>
          </div>
          {deleteButton}
        </div>
        <div className="mt-3 text-xs text-text-muted">Updated {updatedAt}</div>
      </div>

      {confirmModal}
    </>
  );
}
