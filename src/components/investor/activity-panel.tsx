"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { SlidingTabs, type TabItem } from "@/components/ui/sliding-tabs";
import {
  ActivityEventItem,
  type PortfolioEvent,
} from "./activity-event-item";

type TimeFilter = "today" | "yesterday" | "this_week";

const TIME_TABS: TabItem<TimeFilter>[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
];

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-bg-elevated" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-bg-elevated" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-bg-elevated" />
      </div>
    </div>
  );
}

type ActivityPanelProps = {
  /** When provided, scopes events to a single company */
  companyId?: string;
};

export function ActivityPanel({ companyId }: ActivityPanelProps) {
  const [filter, setFilter] = React.useState<TimeFilter>("this_week");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [events, setEvents] = React.useState<PortfolioEvent[]>([]);
  const [todayCount, setTodayCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch events
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ filter, limit: "100" });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (companyId) params.set("companyId", companyId);

    fetch(`/api/investors/portfolio/events?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setEvents(data.events ?? []);
        setTodayCount(data.today_count ?? 0);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filter, debouncedSearch, companyId]);

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SlidingTabs
          tabs={TIME_TABS}
          value={filter}
          onChange={setFilter}
          size="sm"
        />
        <div className="flex items-center gap-3">
          {todayCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--tag-blue-bg)] px-1.5 text-[11px] font-semibold text-[var(--tag-blue-text)]">
              {todayCount > 99 ? "99+" : todayCount} today
            </span>
          )}
          <div className="relative sm:w-64">
            <Search
              className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search updates..."
              className="h-9 w-full rounded-md border border-border-default bg-bg-input pl-8 pr-3 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)]"
            />
          </div>
        </div>
      </div>

      {/* Event list */}
      <div>
        {loading ? (
          <div className="space-y-1">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-text-muted">No updates found</p>
            <p className="mt-1 text-xs text-text-faint">
              {debouncedSearch
                ? "Try a different search term"
                : filter === "today"
                  ? "No activity recorded today yet"
                  : filter === "yesterday"
                    ? "No activity was recorded yesterday"
                    : "No activity in the past week"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {events.map((event) => (
              <ActivityEventItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
