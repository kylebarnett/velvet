"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";

type Props = {
  text: string;
  size?: "sm" | "md";
};

export function HelpTooltip({ text, size = "sm" }: Props) {
  const [show, setShow] = React.useState(false);

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        className={`${iconSize} text-text-faint hover:text-text-tertiary transition-colors`}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => {
          e.stopPropagation();
          setShow(!show);
        }}
        aria-label="Help"
      >
        <HelpCircle className="h-full w-full" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-border-default bg-bg-secondary p-2.5 text-xs text-text-secondary shadow-xl">
          {text}
        </div>
      )}
    </div>
  );
}
