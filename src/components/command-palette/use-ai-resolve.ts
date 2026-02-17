import { useEffect, useRef, useState, useCallback } from "react";

export type AIMatch = {
  id: string;
  confidence: number;
};

const INTENT_VERBS = new Set([
  "add", "create", "go", "show", "find", "where", "set", "change",
  "switch", "upload", "import", "send", "toggle", "make", "open",
  "view", "see", "start", "new", "request", "ask", "check",
]);

/** Only fire AI when input looks like natural language, not a simple prefix search */
function shouldTriggerAI(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length < 2) return false;
  // Multi-word → likely natural language
  if (trimmed.includes(" ")) return true;
  // Single word starting with an intent verb
  const first = trimmed.toLowerCase();
  return INTENT_VERBS.has(first);
}

export function useAICommandResolve(
  search: string,
  role: "investor" | "founder",
  isOpen: boolean,
) {
  const [aiMatches, setAiMatches] = useState<AIMatch[]>([]);
  const [isAIResolving, setIsAIResolving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    setAiMatches([]);
    setIsAIResolving(false);
  }, []);

  // Reset on close
  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  // Debounced AI call
  useEffect(() => {
    // Abort previous request on every keystroke
    abortRef.current?.abort();
    abortRef.current = null;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = search.trim();
    if (!isOpen || !shouldTriggerAI(trimmed)) {
      setAiMatches([]);
      setIsAIResolving(false);
      return;
    }

    setIsAIResolving(true);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/command-palette/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, role }),
          signal: controller.signal,
        });

        if (res.ok) {
          const data = await res.json();
          if (!controller.signal.aborted) {
            setAiMatches(data.matches ?? []);
          }
        }
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      } finally {
        if (!controller.signal.aborted) {
          setIsAIResolving(false);
        }
      }
    }, 400);

    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, role, isOpen]);

  return { aiMatches, isAIResolving };
}
