"use client";

import { useCallback, useEffect, useState } from "react";

export type ChartTheme = {
  grid: string;
  tick: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipLabel: string;
  tooltipShadow: string;
  cursor: string;
  secondaryLine: string;
};

function readChartTheme(): ChartTheme {
  if (typeof window === "undefined") {
    // SSR fallback — dark theme values
    return {
      grid: "rgba(255,255,255,0.06)",
      tick: "rgba(255,255,255,0.4)",
      tooltipBg: "rgba(9,9,11,0.95)",
      tooltipBorder: "rgba(255,255,255,0.1)",
      tooltipText: "rgba(255,255,255,0.8)",
      tooltipLabel: "rgba(255,255,255,0.5)",
      tooltipShadow: "rgba(0,0,0,0.4)",
      cursor: "rgba(255,255,255,0.03)",
      secondaryLine: "rgba(255,255,255,0.3)",
    };
  }
  const s = getComputedStyle(document.documentElement);
  return {
    grid: s.getPropertyValue("--chart-grid").trim() || "rgba(255,255,255,0.06)",
    tick: s.getPropertyValue("--chart-tick").trim() || "rgba(255,255,255,0.4)",
    tooltipBg: s.getPropertyValue("--chart-tooltip-bg").trim() || "rgba(9,9,11,0.95)",
    tooltipBorder: s.getPropertyValue("--chart-tooltip-border").trim() || "rgba(255,255,255,0.1)",
    tooltipText: s.getPropertyValue("--chart-tooltip-text").trim() || "rgba(255,255,255,0.8)",
    tooltipLabel: s.getPropertyValue("--chart-tooltip-label").trim() || "rgba(255,255,255,0.5)",
    tooltipShadow: s.getPropertyValue("--chart-tooltip-shadow").trim() || "rgba(0,0,0,0.4)",
    cursor: s.getPropertyValue("--chart-cursor").trim() || "rgba(255,255,255,0.03)",
    secondaryLine: s.getPropertyValue("--chart-secondary-line").trim() || "rgba(255,255,255,0.3)",
  };
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(readChartTheme);

  const refresh = useCallback(() => {
    setTheme(readChartTheme());
  }, []);

  useEffect(() => {
    // Re-read when .dark class changes on <html>
    const observer = new MutationObserver(() => {
      // Small delay to let CSS vars propagate
      requestAnimationFrame(refresh);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    // Also read on mount
    refresh();
    return () => observer.disconnect();
  }, [refresh]);

  return theme;
}
