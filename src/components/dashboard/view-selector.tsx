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
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-white/20"
        >
          <span>View: {displayName}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-xl">
            {views.length === 0 ? (
              <div className="px-3 py-2 text-xs text-white/50">No saved views</div>
            ) : (
              views.map((view) => (
                <div
                  key={view.id}
                  className={`
                    flex w-full items-center justify-between
                    ${
                      selectedViewId === view.id
                        ? "bg-white/10"
                        : "hover:bg-white/5"
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
                          ? "text-white"
                          : "text-white/70 hover:text-white"
                      }
                    `}
                  >
                    <span>{view.name}</span>
                    {view.isDefault && (
                      <span className="text-[10px] text-white/40">Default</span>
                    )}
                  </button>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClick(e, view)}
                      className="mr-2 rounded p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-red-400"
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
                <div className="mx-2 border-t border-white/10" />
                <button
                  type="button"
                  onClick={() => {
                    onCreateNew();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/70 hover:bg-white/5 hover:text-white"
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
