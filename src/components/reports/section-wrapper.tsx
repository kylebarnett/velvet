"use client";

import * as React from "react";
import { ChevronDown, Eye, EyeOff, Download, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type SectionWrapperProps = {
  id: string;
  title: string;
  description?: string;
  visible: boolean;
  onToggle: () => void;
  exportable?: boolean;
  onExportPng?: () => void;
  onExportCsv?: () => void;
  children: React.ReactNode;
};

export function SectionWrapper({
  id,
  title,
  description,
  visible,
  onToggle,
  exportable,
  onExportPng,
  onExportCsv,
  children,
}: SectionWrapperProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const sectionRef = React.useRef<HTMLDivElement>(null);

  if (!visible) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border-default px-4 py-2 text-xs text-text-muted transition-colors hover:border-border-hover hover:bg-bg-elevated hover:text-text-secondary"
      >
        <EyeOff className="h-3.5 w-3.5" />
        <span>{title}</span>
        <span className="ml-auto text-[10px]">Click to show</span>
      </button>
    );
  }

  return (
    <div
      ref={sectionRef}
      data-pdf-page={id}
      data-section-id={id}
      className="rounded-xl border border-border-default bg-bg-primary"
    >
      {/* Section header */}
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-sm font-medium text-text-primary"
          aria-expanded={!collapsed}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 text-text-muted transition-transform",
              collapsed && "-rotate-90"
            )}
          />
          {title}
        </button>

        {description && !collapsed && (
          <span className="hidden text-xs text-text-muted sm:inline">
            — {description}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1" data-no-print>
          {/* Per-section export */}
          {exportable && !collapsed && (
            <>
              {onExportPng && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    if (sectionRef.current) onExportPng();
                  }}
                  title="Export as PNG"
                >
                  <Image className="h-3.5 w-3.5" />
                </Button>
              )}
              {onExportCsv && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onExportCsv}
                  title="Export as CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}

          {/* Visibility toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            title="Hide section"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Section content */}
      {!collapsed && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}
