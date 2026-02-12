import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { resolveMetricDefinition } from "@/lib/metric-definitions";
import { useMetricDefinitions } from "@/contexts/metric-definitions-context";

type AIDefinition = {
  description: string;
  formula?: string;
};

// Session-scoped client cache (persists across renders/mounts within a tab)
const clientCache = new Map<string, AIDefinition>();

export function useAIMetricDefinition(metricName: string) {
  const { customDefinitions, isLoaded } = useMetricDefinitions();
  const [definition, setDefinition] = useState<AIDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const debouncedName = useDebounce(metricName.trim(), 600);

  useEffect(() => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = null;

    // Wait for custom definitions to load from DB before deciding
    if (!isLoaded) {
      setDefinition(null);
      setIsLoading(false);
      return;
    }

    // Skip if name too short
    if (debouncedName.length < 3) {
      setDefinition(null);
      setIsLoading(false);
      return;
    }

    // Skip if catalog or a saved custom definition already exists (no AI call needed)
    const { info } = resolveMetricDefinition(debouncedName, customDefinitions);
    if (info) {
      setDefinition(null);
      setIsLoading(false);
      return;
    }

    // Check client cache
    const cacheKey = debouncedName.toLowerCase();
    const cached = clientCache.get(cacheKey);
    if (cached) {
      setDefinition(cached);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setDefinition(null);

    fetch("/api/metrics/suggest-definition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metricName: debouncedName }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data: { description: string; formula: string | null }) => {
        const result: AIDefinition = {
          description: data.description,
          formula: data.formula ?? undefined,
        };
        clientCache.set(cacheKey, result);
        setDefinition(result);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setDefinition(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [debouncedName, customDefinitions, isLoaded]);

  return { definition, isLoading };
}
