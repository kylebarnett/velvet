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
        className={`${iconSize} text-white/30 hover:text-white/60 transition-colors`}
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
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-zinc-900 p-2.5 text-xs text-white/70 shadow-xl">
          {text}
        </div>
      )}
    </div>
  );
}
