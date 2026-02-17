"use client";

import { List, Users } from "lucide-react";
import { SlidingIconTabs } from "@/components/ui/sliding-tabs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import type { ActorSummary, ViewMode } from "./types";

interface ActivityFilterBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  actors: ActorSummary[];
  selectedActorId: string | null;
  onActorChange: (actorId: string | null) => void;
}

const VIEW_TABS: { value: ViewMode; icon: typeof List; label: string }[] = [
  { value: "timeline", icon: List, label: "Timeline" },
  { value: "grouped", icon: Users, label: "By Investor" },
];

export function ActivityFilterBar({
  viewMode,
  onViewModeChange,
  actors,
  selectedActorId,
  onActorChange,
}: ActivityFilterBarProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <SlidingIconTabs
        tabs={VIEW_TABS}
        value={viewMode}
        onChange={onViewModeChange}
      />

      {actors.length > 0 && (
        <Select
          value={selectedActorId ?? "__all__"}
          onValueChange={(v) => onActorChange(v === "__all__" ? null : v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All investors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All investors</SelectItem>
            {actors.map((actor) => (
              <SelectItem key={actor.id} value={actor.id}>
                {actor.name}{actor.org ? ` (${actor.org})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
