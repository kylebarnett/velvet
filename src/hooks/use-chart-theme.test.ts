import { renderHook } from "@testing-library/react";
import { useChartTheme } from "./use-chart-theme";

describe("useChartTheme", () => {
  it("returns all expected theme keys", () => {
    const { result } = renderHook(() => useChartTheme());
    expect(result.current).toHaveProperty("grid");
    expect(result.current).toHaveProperty("tick");
    expect(result.current).toHaveProperty("tooltipBg");
    expect(result.current).toHaveProperty("tooltipBorder");
    expect(result.current).toHaveProperty("tooltipText");
    expect(result.current).toHaveProperty("tooltipLabel");
    expect(result.current).toHaveProperty("tooltipShadow");
    expect(result.current).toHaveProperty("cursor");
    expect(result.current).toHaveProperty("secondaryLine");
  });

  it("returns string values for all keys", () => {
    const { result } = renderHook(() => useChartTheme());
    const theme = result.current;
    for (const key of Object.keys(theme)) {
      expect(typeof theme[key as keyof typeof theme]).toBe("string");
    }
  });

  it("returns fallback values in jsdom", () => {
    // jsdom doesn't have CSS custom properties, so fallbacks are used
    const { result } = renderHook(() => useChartTheme());
    expect(result.current.grid).toContain("rgba");
    expect(result.current.tick).toContain("rgba");
  });
});
