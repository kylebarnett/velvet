"use client";

import * as React from "react";
import { Command } from "cmdk";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Activity,
  Briefcase,
  Building2,
  Users,
  Send,
  BarChart3,
  FileText,
  FileSpreadsheet,
  UserPlus,
  LayoutDashboard,
  Inbox,
  Shield,
  ShieldCheck,
  Sparkles,
  Landmark,
  Upload,
  TrendingUp,
  Eye,
  HelpCircle,
  Search,
  ArrowRight,
  Zap,
  Clock,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { useCommandPalette } from "./command-palette-provider";
import { getCommandsForRole, type Command as CommandDef } from "./commands";
import { useRecentItems, useAddRecent, type RecentItem } from "./use-recent-items";
import { intentFilter } from "./intent-filter";
import { useAICommandResolve } from "./use-ai-resolve";

/* ------------------------------------------------------------------ */
/*  Icon map                                                           */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, LucideIcon> = {
  activity: Activity,
  briefcase: Briefcase,
  building2: Building2,
  users: Users,
  send: Send,
  "bar-chart-3": BarChart3,
  "file-text": FileText,
  "file-spreadsheet": FileSpreadsheet,
  "user-plus": UserPlus,
  "layout-dashboard": LayoutDashboard,
  inbox: Inbox,
  shield: Shield,
  "shield-check": ShieldCheck,
  landmark: Landmark,
  sparkles: Sparkles,
  upload: Upload,
  "trending-up": TrendingUp,
  eye: Eye,
  "help-circle": HelpCircle,
  search: Search,
};

function getIcon(name: string): LucideIcon | null {
  return ICON_MAP[name] ?? null;
}

/* ------------------------------------------------------------------ */
/*  Search result type                                                 */
/* ------------------------------------------------------------------ */

type SearchResult = {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: string;
};

/* ------------------------------------------------------------------ */
/*  AI query detection                                                 */
/* ------------------------------------------------------------------ */

const AI_PREFIXES = ["show", "what", "which", "how", "compare", "find", "list"];

function shouldShowAI(query: string, role: "investor" | "founder"): boolean {
  if (role !== "investor") return false;
  const words = query.trim().split(/\s+/);
  if (words.length >= 3) return true;
  const first = words[0]?.toLowerCase() ?? "";
  return AI_PREFIXES.includes(first);
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function CommandPalette({ role }: { role: "investor" | "founder" }) {
  const { isOpen, close } = useCommandPalette();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const recentItems = useRecentItems();
  const addRecent = useAddRecent();

  const [search, setSearch] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [aiAnswer, setAiAnswer] = React.useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = React.useState(false);

  const commands = React.useMemo(() => getCommandsForRole(role), [role]);
  const navigationCommands = React.useMemo(() => commands.filter((c) => c.group === "navigation"), [commands]);
  const actionCommands = React.useMemo(() => commands.filter((c) => c.group === "action"), [commands]);

  // AI command resolution
  const { aiMatches, isAIResolving } = useAICommandResolve(search, role, isOpen);
  const aiSuggestions = React.useMemo(() => {
    const commandMap = new Map(commands.map((c) => [c.id, c]));
    return aiMatches
      .filter((m) => m.confidence >= 0.5)
      .map((m) => commandMap.get(m.id))
      .filter((c): c is CommandDef => c !== undefined);
  }, [aiMatches, commands]);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setSearchResults([]);
      setAiAnswer(null);
      setIsAiLoading(false);
    }
  }, [isOpen]);

  // Debounced server search
  React.useEffect(() => {
    if (search.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(search.trim())}&limit=5`,
          { signal: controller.signal },
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results ?? []);
        }
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  function handleSelect(cmd: CommandDef) {
    if (cmd.id === "act-toggle-theme") {
      setTheme(theme === "dark" ? "light" : "dark");
      close();
      return;
    }
    if (cmd.href) {
      addRecent({
        id: cmd.id,
        type: cmd.group,
        label: cmd.label,
        href: cmd.href,
        icon: cmd.icon,
      });
      router.push(cmd.href);
      close();
    }
  }

  function handleSearchResultSelect(result: SearchResult) {
    addRecent({
      id: result.id,
      type: result.type,
      label: result.title,
      href: result.href,
      icon: result.icon,
    });
    router.push(result.href);
    close();
  }

  function handleRecentSelect(item: RecentItem) {
    addRecent({
      id: item.id,
      type: item.type,
      label: item.label,
      href: item.href,
      icon: item.icon,
    });
    router.push(item.href);
    close();
  }

  async function handleAskAI() {
    if (!search.trim() || isAiLoading) return;
    setIsAiLoading(true);
    setAiAnswer(null);
    try {
      const res = await fetch("/api/investors/portfolio/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: search.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnswer(data.answer ?? "No answer returned.");
      } else {
        setAiAnswer("Unable to process your question. Please try again.");
      }
    } catch {
      setAiAnswer("An error occurred. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const showAI = shouldShowAI(search, role);
  const hasSearch = search.trim().length >= 2;

  return (
    <Command.Dialog
      open={isOpen}
      onOpenChange={(open) => { if (!open) close(); }}
      label="Command palette"
      loop
      filter={intentFilter}
      overlayClassName="fixed inset-0 z-[var(--z-modal)] bg-black/60 backdrop-blur-sm"
      contentClassName="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center pt-[20vh]"
    >
      <VisuallyHidden.Root asChild>
        <DialogPrimitive.Title>Command palette</DialogPrimitive.Title>
      </VisuallyHidden.Root>
      <div className="mx-4 w-full max-w-xl overflow-hidden rounded-xl border border-border-default bg-bg-secondary shadow-xl">
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border-default px-4">
          <Search className="h-4 w-4 shrink-0 text-text-muted" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search or type a command..."
            className="h-12 w-full bg-transparent text-sm text-text-primary placeholder:text-text-faint outline-none"
          />
          <kbd className="hidden shrink-0 rounded-md border border-border-default bg-bg-primary px-1.5 py-0.5 text-[10px] font-medium text-text-muted sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <Command.List className="max-h-[min(400px,50vh)] overflow-y-auto p-1">
          {/* Loading indicator */}
          {isSearching && (
            <Command.Loading className="px-3 py-2 text-xs text-text-muted">
              Searching...
            </Command.Loading>
          )}

          {/* Empty state */}
          <Command.Empty className="px-3 py-6 text-center text-sm text-text-muted">
            No results found.
          </Command.Empty>

          {/* AI suggested commands */}
          {aiSuggestions.length > 0 && (
            <Command.Group
              heading={
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Suggested
                </span>
              }
            >
              {aiSuggestions.map((cmd) => {
                const Icon = getIcon(cmd.icon);
                return (
                  <Command.Item
                    key={`ai-${cmd.id}`}
                    value={`ai-${cmd.label}`}
                    onSelect={() => handleSelect(cmd)}
                    className="mx-1 flex cursor-default items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary aria-selected:bg-bg-elevated aria-selected:text-text-primary"
                    forceMount
                  >
                    {Icon ? (
                      <Icon className="h-4 w-4 shrink-0 text-text-muted" />
                    ) : (
                      <Sparkles className="h-4 w-4 shrink-0 text-text-muted" />
                    )}
                    <span className="flex-1 truncate">{cmd.label}</span>
                    <span className="shrink-0 rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                      AI
                    </span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          )}

          {/* AI analyzing micro-indicator */}
          {isAIResolving && aiSuggestions.length === 0 && hasSearch && (
            <div className="flex items-center gap-1.5 px-4 py-1.5 text-[11px] text-text-muted">
              <Sparkles className="h-3 w-3 animate-pulse" />
              Analyzing...
            </div>
          )}

          {/* AI answer inline */}
          {aiAnswer && (
            <div className="mx-2 mb-2 rounded-lg border border-border-default bg-bg-primary p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                <Sparkles className="h-3 w-3" />
                AI Answer
              </div>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{aiAnswer}</p>
            </div>
          )}

          {/* Search results from server */}
          {hasSearch && searchResults.length > 0 && (
            <Command.Group heading="Results">
              {searchResults.map((result) => {
                const Icon = getIcon(result.icon);
                return (
                  <Command.Item
                    key={`result-${result.id}`}
                    value={`result-${result.type}-${result.title}`}
                    onSelect={() => handleSearchResultSelect(result)}
                    className="mx-1 flex cursor-default items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary aria-selected:bg-bg-elevated aria-selected:text-text-primary"
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0 text-text-muted" />}
                    <div className="min-w-0 flex-1">
                      <span className="truncate">{result.title}</span>
                      {result.subtitle && (
                        <span className="ml-2 text-xs text-text-muted">{result.subtitle}</span>
                      )}
                    </div>
                  </Command.Item>
                );
              })}
            </Command.Group>
          )}

          {/* Recent items */}
          {!hasSearch && recentItems.length > 0 && (
            <Command.Group heading="Recent">
              {recentItems.map((item) => {
                const Icon = getIcon(item.icon);
                return (
                  <Command.Item
                    key={`recent-${item.id}`}
                    value={`recent-${item.label}`}
                    onSelect={() => handleRecentSelect(item)}
                    className="mx-1 flex cursor-default items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary aria-selected:bg-bg-elevated aria-selected:text-text-primary"
                  >
                    <Clock className="h-4 w-4 shrink-0 text-text-muted" />
                    <span className="truncate">{item.label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          )}

          {/* Navigation commands */}
          <Command.Group heading="Navigation">
            {navigationCommands.map((cmd) => {
              const Icon = getIcon(cmd.icon);
              return (
                <Command.Item
                  key={cmd.id}
                  value={cmd.label}
                  keywords={cmd.keywords}
                  onSelect={() => handleSelect(cmd)}
                  className="mx-1 flex cursor-default items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary aria-selected:bg-bg-elevated aria-selected:text-text-primary"
                >
                  {Icon ? (
                    <Icon className="h-4 w-4 shrink-0 text-text-muted" />
                  ) : (
                    <ArrowRight className="h-4 w-4 shrink-0 text-text-muted" />
                  )}
                  <span className="truncate">{cmd.label}</span>
                </Command.Item>
              );
            })}
          </Command.Group>

          {/* Action commands */}
          <Command.Group heading="Actions">
            {actionCommands.map((cmd) => {
              const Icon = getIcon(cmd.icon);
              return (
                <Command.Item
                  key={cmd.id}
                  value={cmd.label}
                  keywords={cmd.keywords}
                  onSelect={() => handleSelect(cmd)}
                  className="mx-1 flex cursor-default items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary aria-selected:bg-bg-elevated aria-selected:text-text-primary"
                >
                  {Icon ? (
                    <Icon className="h-4 w-4 shrink-0 text-text-muted" />
                  ) : (
                    <Zap className="h-4 w-4 shrink-0 text-text-muted" />
                  )}
                  <span className="truncate">{cmd.label}</span>
                </Command.Item>
              );
            })}
          </Command.Group>

          {/* AI query option */}
          {showAI && hasSearch && (
            <Command.Group heading="AI">
              <Command.Item
                value={`ask-ai-${search}`}
                onSelect={handleAskAI}
                className="mx-1 flex cursor-default items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary aria-selected:bg-bg-elevated aria-selected:text-text-primary"
                forceMount
              >
                <Sparkles className={cn("h-4 w-4 shrink-0", isAiLoading ? "animate-pulse text-accent" : "text-text-muted")} />
                <span className="truncate">
                  {isAiLoading ? "Thinking..." : `Ask: "${search}"`}
                </span>
              </Command.Item>
            </Command.Group>
          )}
        </Command.List>

        {/* Footer with keyboard hints */}
        <div className="flex items-center gap-3 border-t border-border-default px-4 py-2">
          <div className="flex items-center gap-1 text-[10px] text-text-muted">
            <kbd className="rounded border border-border-default bg-bg-primary px-1 py-0.5 font-medium">↑↓</kbd>
            <span>navigate</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-text-muted">
            <kbd className="rounded border border-border-default bg-bg-primary px-1 py-0.5 font-medium">↵</kbd>
            <span>select</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-text-muted">
            <kbd className="rounded border border-border-default bg-bg-primary px-1 py-0.5 font-medium">esc</kbd>
            <span>close</span>
          </div>
        </div>
      </div>
    </Command.Dialog>
  );
}
