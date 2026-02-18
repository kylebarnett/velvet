"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, EyeOff, Eye, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";

type Props = {
  companyId: string;
  companyName: string;
  isHidden: boolean;
  onDeleted?: () => void;
};

export function CompanyCardMenu({ companyId, companyName, isHidden, onDeleted }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  async function handleToggleHide() {
    setLoading(true);
    setOpen(false);
    try {
      const res = await fetch(`/api/investors/companies/${companyId}/manage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isHidden ? "unhide" : "hide" }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setShowDeleteConfirm(false);
    setOpen(false);
    try {
      const res = await fetch(`/api/investors/companies/${companyId}/manage`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (onDeleted) {
          // Optimistically remove from parent list, then refresh data in background
          onDeleted();
          router.refresh();
        } else {
          // No parent handler (e.g. company detail page) — navigate away cleanly
          router.replace("/companies");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        disabled={loading}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary disabled:opacity-60"
        aria-label={`Actions for ${companyName}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-1 w-52 overflow-hidden rounded-lg border border-border-default bg-bg-secondary py-1 shadow-xl backdrop-blur-sm"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleToggleHide();
            }}
          >
            {isHidden ? (
              <>
                <Eye className="h-4 w-4" aria-hidden="true" />
                Show on dashboard
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" aria-hidden="true" />
                Hide from dashboard
              </>
            )}
          </button>
          <div className="mx-2 my-1 border-t border-border-subtle" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--error-accent)] transition-colors hover:bg-bg-elevated"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setOpen(false);
              setShowDeleteConfirm(true);
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Remove from portfolio
          </button>
        </div>
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Remove company"
        message={`Are you sure you want to remove ${companyName} from your portfolio? This will delete all your private metrics and data for this company. This action cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
