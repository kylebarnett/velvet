"use client";

import * as React from "react";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SpotlightOverlayProps = {
  targetSelector: string;
  padding?: number;
  borderRadius?: number;
  onClick?: () => void;
};

export function SpotlightOverlay({
  targetSelector,
  padding = 8,
  borderRadius = 8,
  onClick,
}: SpotlightOverlayProps) {
  const [targetRect, setTargetRect] = React.useState<Rect | null>(null);
  const [windowSize, setWindowSize] = React.useState({ width: 0, height: 0 });

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
    }

    function updateWindowSize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    // Initial updates
    updateRect();
    updateWindowSize();

    // Set up observers and listeners
    const resizeObserver = new ResizeObserver(updateRect);
    const target = document.querySelector(targetSelector);
    if (target) {
      resizeObserver.observe(target);
    }

    window.addEventListener("resize", updateWindowSize);
    window.addEventListener("scroll", updateRect, true);

    // Poll for element position changes (handles animations, etc.)
    const intervalId = setInterval(updateRect, 100);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateWindowSize);
      window.removeEventListener("scroll", updateRect, true);
      clearInterval(intervalId);
    };
  }, [targetSelector]);

  if (!targetRect || windowSize.width === 0) {
    return null;
  }

  const cutoutX = targetRect.x - padding;
  const cutoutY = targetRect.y - padding;
  const cutoutWidth = targetRect.width + padding * 2;
  const cutoutHeight = targetRect.height + padding * 2;

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${windowSize.width} ${windowSize.height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <mask id="spotlight-mask">
            {/* White rectangle = visible area (shows overlay) */}
            <rect
              width={windowSize.width}
              height={windowSize.height}
              fill="white"
            />
            {/* Black rectangle = cutout area (hidden/transparent) */}
            <rect
              x={cutoutX}
              y={cutoutY}
              width={cutoutWidth}
              height={cutoutHeight}
              rx={borderRadius}
              ry={borderRadius}
              fill="black"
            />
          </mask>
        </defs>
        {/* Semi-transparent overlay with cutout */}
        <rect
          width={windowSize.width}
          height={windowSize.height}
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
          className="pointer-events-auto cursor-pointer"
          onClick={onClick}
        />
      </svg>
      {/* Highlight border around target */}
      <div
        className="pointer-events-none absolute rounded-lg ring-2 ring-white/50 ring-offset-2 ring-offset-transparent transition-all duration-200"
        style={{
          left: cutoutX,
          top: cutoutY,
          width: cutoutWidth,
          height: cutoutHeight,
        }}
      />
    </div>
  );
}
