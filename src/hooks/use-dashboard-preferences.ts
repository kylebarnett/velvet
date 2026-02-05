"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PeriodType } from "@/components/dashboard";
import { DateRange } from "@/components/dashboard/date-range-selector";

type DashboardPreferences = {
  periodType: PeriodType;
  dateRange: DateRange;
};

const DEFAULT_PREFERENCES: DashboardPreferences = {
  periodType: "quarterly",
  dateRange: "1y",
};

/**
 * Hook to manage dashboard preferences (periodType, dateRange) with database persistence.
 * Preferences sync across devices via the /api/user/preferences endpoint.
 */
export function useDashboardPreferences() {
  const [periodType, setPeriodTypeState] = useState<PeriodType>(DEFAULT_PREFERENCES.periodType);
  const [dateRange, setDateRangeState] = useState<DateRange>(DEFAULT_PREFERENCES.dateRange);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load preferences on mount
  useEffect(() => {
    fetch("/api/user/preferences?key=dashboard.preferences")
      .then((res) => res.json())
      .then((json) => {
        if (json.value) {
          const prefs = json.value as Partial<DashboardPreferences>;
          if (prefs.periodType) setPeriodTypeState(prefs.periodType);
          if (prefs.dateRange) setDateRangeState(prefs.dateRange);
        }
        setIsLoaded(true);
      })
      .catch(() => {
        setIsLoaded(true);
      });
  }, []);

  // Save preferences (debounced)
  const savePreferences = useCallback((prefs: Partial<DashboardPreferences>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      // First get current preferences, then merge
      fetch("/api/user/preferences?key=dashboard.preferences")
        .then((res) => res.json())
        .then((json) => {
          const current = (json.value as Partial<DashboardPreferences>) ?? {};
          const updated = { ...current, ...prefs };

          return fetch("/api/user/preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "dashboard.preferences", value: updated }),
          });
        })
        .catch(() => {
          // Silently fail - preferences still work locally
        });
    }, 500);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Wrapped setters that also persist
  const setPeriodType = useCallback((value: PeriodType) => {
    setPeriodTypeState(value);
    savePreferences({ periodType: value });
  }, [savePreferences]);

  const setDateRange = useCallback((value: DateRange) => {
    setDateRangeState(value);
    savePreferences({ dateRange: value });
  }, [savePreferences]);

  return {
    periodType,
    setPeriodType,
    dateRange,
    setDateRange,
    isLoaded,
  };
}
