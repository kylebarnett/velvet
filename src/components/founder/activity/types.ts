export type ActivityEntry = {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_org: string | null;
  actor_role: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ActorSummary = {
  id: string;
  name: string;
  org: string | null;
  activity_count: number;
  last_active: string;
};

export type ViewMode = "timeline" | "grouped";
