"use client";

import * as React from "react";
import { X } from "lucide-react";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Position = "top" | "bottom" | "left" | "right";

type OnboardingTooltipProps = {
  targetSelector: string;
  title: string;
  message: string;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  isLastStep?: boolean;
};

export function OnboardingTooltip({
  targetSelector,
  title,
  message,
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  isLastStep,
}: OnboardingTooltipProps) {
  const [targetRect, setTargetRect] = React.useState<Rect | null>(null);
  const [tooltipRect, setTooltipRect] = React.useState<Rect | null>(null);
  const [position, setPosition] = React.useState<Position>("bottom");
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  // Measure tooltip size
  React.useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      setTooltipRect({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    }
  }, [targetRect, position]);

  // Update target element position
  React.useEffect(() => {
    function updateRect() {
      const target = document.querySelector(targetSelector);
      if (!target) {
        setTargetRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      setTargetRect({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });

      // Determine best position for tooltip
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const tooltipHeight = 220;
      const tooltipWidth = 320;
      const gap = 16;

      // Check available space
      const spaceBelow = viewportHeight - (rect.y + rect.height);
      const spaceAbove = rect.y;
      const spaceRight = viewportWidth - (rect.x + rect.width);
      const spaceLeft = rect.x;

      // Prefer bottom, then top, then right, then left
      if (spaceBelow >= tooltipHeight + gap) {
        setPosition("bottom");
      } else if (spaceAbove >= tooltipHeight + gap) {
        setPosition("top");
      } else if (spaceRight >= tooltipWidth + gap) {
        setPosition("right");
      } else if (spaceLeft >= tooltipWidth + gap) {
        setPosition("left");
      } else {
        // Default to bottom and let it scroll/clamp
        setPosition("bottom");
      }
    }

    updateRect();

    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    const intervalId = setInterval(updateRect, 100);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
      clearInterval(intervalId);
    };
  }, [targetSelector]);

  if (!targetRect) {
    return null;
  }

  const gap = 12;
  const arrowSize = 8;
  const viewportPadding = 16;
  const tooltipWidth = 320;
  const tooltipHeight = tooltipRect?.height ?? 200;

  // Calculate tooltip position with viewport clamping
  let top: number | undefined;
  let left: number | undefined;
  let bottom: number | undefined;
  let right: number | undefined;
  let arrowLeft: number | undefined;
  let arrowTop: number | undefined;
  let arrowRight: number | undefined;
  let arrowBottom: number | undefined;
  let arrowBorder: React.CSSProperties = {};

  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

  switch (position) {
    case "bottom": {
      // Position below target
      top = targetRect.y + targetRect.height + gap + arrowSize;

      // Center horizontally on target, but clamp to viewport
      const idealLeft = targetRect.x + targetRect.width / 2 - tooltipWidth / 2;
      left = Math.max(
        viewportPadding,
        Math.min(idealLeft, viewportWidth - tooltipWidth - viewportPadding)
      );

      // Clamp top to ensure tooltip doesn't go off bottom of screen
      const maxTop = viewportHeight - tooltipHeight - viewportPadding;
      if (top > maxTop) {
        top = maxTop;
      }

      // Arrow points up
      arrowTop = -arrowSize;
      arrowLeft = Math.max(
        16,
        Math.min(
          targetRect.x + targetRect.width / 2 - left - arrowSize / 2,
          tooltipWidth - 32
        )
      );
      arrowBorder = {
        borderLeft: `${arrowSize}px solid transparent`,
        borderRight: `${arrowSize}px solid transparent`,
        borderBottom: `${arrowSize}px solid rgb(39 39 42)`,
      };
      break;
    }
    case "top": {
      // Position above target
      bottom = viewportHeight - targetRect.y + gap + arrowSize;

      // Center horizontally on target, but clamp to viewport
      const idealLeft = targetRect.x + targetRect.width / 2 - tooltipWidth / 2;
      left = Math.max(
        viewportPadding,
        Math.min(idealLeft, viewportWidth - tooltipWidth - viewportPadding)
      );

      // Clamp bottom to ensure tooltip doesn't go off top of screen
      const maxBottom = viewportHeight - tooltipHeight - viewportPadding;
      if (bottom > maxBottom) {
        bottom = maxBottom;
      }

      // Arrow points down
      arrowBottom = -arrowSize;
      arrowLeft = Math.max(
        16,
        Math.min(
          targetRect.x + targetRect.width / 2 - left - arrowSize / 2,
          tooltipWidth - 32
        )
      );
      arrowBorder = {
        borderLeft: `${arrowSize}px solid transparent`,
        borderRight: `${arrowSize}px solid transparent`,
        borderTop: `${arrowSize}px solid rgb(39 39 42)`,
      };
      break;
    }
    case "right": {
      // Position to the right of target
      left = targetRect.x + targetRect.width + gap + arrowSize;

      // Center vertically on target, but clamp to viewport
      const idealTop = targetRect.y + targetRect.height / 2 - tooltipHeight / 2;
      top = Math.max(
        viewportPadding,
        Math.min(idealTop, viewportHeight - tooltipHeight - viewportPadding)
      );

      // Arrow points left
      arrowLeft = -arrowSize;
      arrowTop = Math.max(
        16,
        Math.min(
          targetRect.y + targetRect.height / 2 - top - arrowSize / 2,
          tooltipHeight - 32
        )
      );
      arrowBorder = {
        borderTop: `${arrowSize}px solid transparent`,
        borderBottom: `${arrowSize}px solid transparent`,
        borderRight: `${arrowSize}px solid rgb(39 39 42)`,
      };
      break;
    }
    case "left": {
      // Position to the left of target
      right = viewportWidth - targetRect.x + gap + arrowSize;

      // Center vertically on target, but clamp to viewport
      const idealTop = targetRect.y + targetRect.height / 2 - tooltipHeight / 2;
      top = Math.max(
        viewportPadding,
        Math.min(idealTop, viewportHeight - tooltipHeight - viewportPadding)
      );

      // Arrow points right
      arrowRight = -arrowSize;
      arrowTop = Math.max(
        16,
        Math.min(
          targetRect.y + targetRect.height / 2 - top - arrowSize / 2,
          tooltipHeight - 32
        )
      );
      arrowBorder = {
        borderTop: `${arrowSize}px solid transparent`,
        borderBottom: `${arrowSize}px solid transparent`,
        borderLeft: `${arrowSize}px solid rgb(39 39 42)`,
      };
      break;
    }
  }

  const tooltipStyle: React.CSSProperties = {
    ...(top !== undefined && { top }),
    ...(left !== undefined && { left }),
    ...(bottom !== undefined && { bottom }),
    ...(right !== undefined && { right }),
  };

  const arrowStyle: React.CSSProperties = {
    ...(arrowTop !== undefined && { top: arrowTop }),
    ...(arrowLeft !== undefined && { left: arrowLeft }),
    ...(arrowBottom !== undefined && { bottom: arrowBottom }),
    ...(arrowRight !== undefined && { right: arrowRight }),
    ...arrowBorder,
  };

  return (
    <div
      ref={tooltipRef}
      className="pointer-events-auto fixed z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-zinc-800 p-4 shadow-xl"
      style={tooltipStyle}
    >
      {/* Arrow */}
      <div className="absolute h-0 w-0" style={arrowStyle} />

      {/* Close button */}
      <button
        onClick={onSkip}
        className="absolute right-2 top-2 rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white/60"
        type="button"
        aria-label="Skip tour"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="pr-6">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-1.5 text-sm text-white/70">{message}</p>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="shrink-0 text-xs text-white/40">
          {currentStep + 1}/{totalSteps}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSkip}
            className="shrink-0 text-xs text-white/50 hover:text-white/70"
            type="button"
          >
            Skip
          </button>
          <button
            onClick={onNext}
            className="shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-white/90"
            type="button"
          >
            {isLastStep ? "Finish" : "Next"}
          </button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="mt-3 flex justify-center gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i === currentStep ? "bg-white" : "bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
