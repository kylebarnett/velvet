"use client";

import { ChevronDown, Plus } from "lucide-react";
import * as React from "react";

type DashboardView = {
  id: string;
  name: string;
  isDefault: boolean;
};

type ViewSelectorProps = {
  views: DashboardView[];
  selectedViewId: string | null;
  onChange: (viewId: string) => void;
  onCreateNew?: () => void;
};

export function ViewSelector({
  views,
  selectedViewId,
  onChange,
  onCreateNew,
}: ViewSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
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

  return (
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
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-xl">
          {views.length === 0 ? (
            <div className="px-3 py-2 text-xs text-white/50">No saved views</div>
          ) : (
            views.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => {
                  onChange(view.id);
                  setIsOpen(false);
                }}
                className={`
                  flex w-full items-center justify-between px-3 py-2 text-left text-xs
                  ${
                    selectedViewId === view.id
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                <span>{view.name}</span>
                {view.isDefault && (
                  <span className="text-[10px] text-white/40">Default</span>
                )}
              </button>
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
  );
}
