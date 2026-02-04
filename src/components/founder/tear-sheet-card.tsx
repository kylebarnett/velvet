"use client";

import * as React from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
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
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        setShowConfirm(true);
      }}
      className="shrink-0 rounded-md p-1.5 text-white/30 hover:bg-white/5 hover:text-red-300"
      aria-label="Delete tear sheet"
    >
      <Trash2 className="h-4 w-4" />
    </button>
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
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <Link
              href={`/portal/tear-sheets/${tearSheet.id}`}
              className="block truncate text-sm font-medium hover:text-white/80"
            >
              {tearSheet.title}
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  tearSheet.status === "published"
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-amber-500/20 text-amber-200"
                }`}
              >
                {tearSheet.status === "published" ? "Published" : "Draft"}
              </span>
              <span className="text-xs text-white/50">
                {tearSheet.quarter} {tearSheet.year}
              </span>
              {tearSheet.share_enabled && (
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-200">
                  Shared
                </span>
              )}
            </div>
          </div>
          {deleteButton}
        </div>
        <div className="mt-3 text-xs text-white/40">Updated {updatedAt}</div>
      </div>

      {confirmModal}
    </>
  );
}
