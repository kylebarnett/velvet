"use client";

import { ChevronDown, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { ConfirmModal } from "@/components/ui/confirm-modal";

type DashboardView = {
  id: string;
  name: string;
  isDefault: boolean;
};

type ViewSelectorProps = {
  views: DashboardView[];
  selectedViewId: string | null;
  onChange: (viewId: string | null) => void;
  onCreateNew?: () => void;
  onDelete?: (viewId: string) => void;
};

export function ViewSelector({
  views,
  selectedViewId,
  onChange,
  onCreateNew,
  onDelete,
}: ViewSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [deleteView, setDeleteView] = React.useState<DashboardView | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedView = views.find((v) => v.id === selectedViewId);
  const displayName = selectedView?.name ?? "Default View";

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  function handleDeleteClick(e: React.MouseEvent, view: DashboardView) {
    e.stopPropagation();
    setIsOpen(false);
    setDeleteView(view);
  }

  function handleConfirmDelete() {
    if (deleteView) {
      onDelete?.(deleteView.id);
      // If deleting the selected view, switch to default
      if (deleteView.id === selectedViewId) {
        onChange(null);
      }
      setDeleteView(null);
    }
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-raised px-3 py-1.5 text-xs font-medium text-text-tertiary hover:border-border-default hover:text-text-secondary transition-colors"
        >
          <span>View: {displayName}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
        {isOpen && (
          <div className="dropdown-enter absolute left-0 top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-border-default bg-bg-secondary shadow-xl">
            {views.length === 0 ? (
              <div className="px-3 py-2 text-xs text-text-tertiary">No saved views</div>
            ) : (
              views.map((view) => (
                <div
                  key={view.id}
                  className={`
                    flex w-full items-center justify-between
                    ${
                      selectedViewId === view.id
                        ? "bg-bg-hover"
                        : "hover:bg-bg-elevated"
                    }
                  `}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(view.id);
                      setIsOpen(false);
                    }}
                    className={`
                      flex flex-1 items-center justify-between px-3 py-2 text-left text-xs
                      ${
                        selectedViewId === view.id
                          ? "text-text-primary"
                          : "text-text-secondary hover:text-text-primary"
                      }
                    `}
                  >
                    <span>{view.name}</span>
                    {view.isDefault && (
                      <span className="text-[10px] text-text-muted">Default</span>
                    )}
                  </button>
                  {onDelete && !view.isDefault && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClick(e, view)}
                      className="mr-2 rounded p-1 text-text-faint transition-colors hover:bg-bg-hover hover:text-[var(--error-accent)]"
                      title="Delete view"
                      aria-label={`Delete ${view.name} view`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))
            )}
            {onCreateNew && (
              <>
                <div className="mx-2 border-t border-border-default" />
                <button
                  type="button"
                  onClick={() => {
                    onCreateNew();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                >
                  <Plus className="h-3 w-3" />
                  Create new view
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteView}
        title="Delete dashboard view"
        message={`Are you sure you want to delete "${deleteView?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteView(null)}
      />
    </>
  );
}
