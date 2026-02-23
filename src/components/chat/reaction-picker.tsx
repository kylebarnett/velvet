"use client";

import * as React from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReactionPickerProps = {
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_EMOJIS = ["\uD83D\uDC4D", "\u2764\uFE0F", "\uD83D\uDE02", "\uD83D\uDE2E", "\uD83D\uDE22", "\uD83D\uDD25"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const picker = (
    <div
      ref={ref}
      role="listbox"
      aria-label="Reaction picker"
      className="rounded-lg border border-border-default bg-bg-secondary p-1.5 shadow-xl"
    >
      <div className="flex gap-0.5">
        {DEFAULT_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            role="option"
            aria-label={`React with ${emoji}`}
            onClick={() => onSelect(emoji)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-base transition-colors hover:bg-bg-elevated"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );

  // Render inline (parent handles positioning) — no portal needed since it's
  // already positioned absolutely via the parent ChatMessage component.
  return picker;
}
