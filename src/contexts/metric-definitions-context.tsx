"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { CustomMetricDefinition } from "@/lib/metric-definitions";

type MetricDefinitionsContextValue = {
  customDefinitions: Record<string, CustomMetricDefinition>;
  isLoaded: boolean;
  saveDefinition: (metricName: string, def: { description: string; formula?: string }) => Promise<void>;
  deleteDefinition: (metricName: string) => Promise<void>;
};

const MetricDefinitionsContext = createContext<MetricDefinitionsContextValue | null>(null);

function normalizeKey(metricName: string): string {
  return metricName.toLowerCase().replace(/\s+/g, "_");
}

const PREF_PREFIX = "metric_def.";

export function MetricDefinitionsProvider({ children }: { children: ReactNode }) {
  const [customDefinitions, setCustomDefinitions] = useState<Record<string, CustomMetricDefinition>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load all preferences on mount, filter for metric_def.* keys
  useEffect(() => {
    fetch("/api/user/preferences")
      .then((res) => res.json())
      .then((json) => {
        const prefs = json.preferences ?? json.value ?? {};
        const defs: Record<string, CustomMetricDefinition> = {};
        for (const [key, value] of Object.entries(prefs)) {
          if (key.startsWith(PREF_PREFIX) && value && typeof value === "object") {
            const normalizedName = key.slice(PREF_PREFIX.length);
            defs[normalizedName] = value as CustomMetricDefinition;
          }
        }
        setCustomDefinitions(defs);
      })
      .catch(() => {
        // Silently fail — definitions are optional
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const saveDefinition = useCallback(
    async (metricName: string, def: { description: string; formula?: string }) => {
      const key = normalizeKey(metricName);
      const prefKey = `${PREF_PREFIX}${key}`;
      const customDef: CustomMetricDefinition = {
        description: def.description,
        formula: def.formula,
        updatedAt: new Date().toISOString(),
      };

      // Optimistic update
      setCustomDefinitions((prev) => ({ ...prev, [key]: customDef }));

      try {
        const res = await fetch("/api/user/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: prefKey, value: customDef }),
        });
        if (!res.ok) throw new Error("Failed to save");
      } catch {
        // Rollback on error
        setCustomDefinitions((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [],
  );

  const deleteDefinition = useCallback(async (metricName: string) => {
    const key = normalizeKey(metricName);
    const prefKey = `${PREF_PREFIX}${key}`;

    // Save for rollback
    const previous = customDefinitions[key];

    // Optimistic update
    setCustomDefinitions((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: prefKey, value: null }),
      });
      if (!res.ok) throw new Error("Failed to delete");
    } catch {
      // Rollback on error
      if (previous) {
        setCustomDefinitions((prev) => ({ ...prev, [key]: previous }));
      }
    }
  }, [customDefinitions]);

  const value = useMemo(
    () => ({ customDefinitions, isLoaded, saveDefinition, deleteDefinition }),
    [customDefinitions, isLoaded, saveDefinition, deleteDefinition],
  );

  return (
    <MetricDefinitionsContext.Provider value={value}>
      {children}
    </MetricDefinitionsContext.Provider>
  );
}

export function useMetricDefinitions(): MetricDefinitionsContextValue {
  const ctx = useContext(MetricDefinitionsContext);
  if (!ctx) {
    // Return a safe fallback — allows use outside the provider (e.g., storybook, tests)
    return {
      customDefinitions: {},
      isLoaded: true,
      saveDefinition: async () => {},
      deleteDefinition: async () => {},
    };
  }
  return ctx;
}
