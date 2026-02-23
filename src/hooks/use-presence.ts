"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type PresenceUser = {
  userId: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  path: string;
  onlineSince: string;
};

type UsePresenceOptions = {
  orgId: string;
  userId: string;
  userInfo: { fullName: string | null; email: string; avatarUrl: string | null };
};

type UsePresenceReturn = {
  pageUsers: PresenceUser[];
  orgOnlineUserIds: Set<string>;
};

export function usePresence({
  orgId,
  userId,
  userInfo,
}: UsePresenceOptions): UsePresenceReturn {
  const pathname = usePathname();
  const [pageUsers, setPageUsers] = React.useState<PresenceUser[]>([]);
  const [orgOnlineUserIds, setOrgOnlineUserIds] = React.useState<Set<string>>(
    new Set()
  );
  const pageChannelRef = React.useRef<RealtimeChannel | null>(null);
  const orgChannelRef = React.useRef<RealtimeChannel | null>(null);
  const supabaseRef = React.useRef(createSupabaseBrowserClient());
  const pathnameRef = React.useRef(pathname);

  // Keep pathname ref in sync
  React.useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Deduplicate presence state by userId (handles multiple tabs)
  function deduplicatePresences(
    presences: Record<string, PresenceUser[]>
  ): PresenceUser[] {
    const seen = new Map<string, PresenceUser>();
    for (const key of Object.keys(presences)) {
      const entries = presences[key];
      for (const entry of entries) {
        if (entry.userId !== userId && !seen.has(entry.userId)) {
          seen.set(entry.userId, entry);
        }
      }
    }
    return Array.from(seen.values());
  }

  function deduplicateOrgPresences(
    presences: Record<string, Array<{ userId: string }>>
  ): Set<string> {
    const ids = new Set<string>();
    for (const key of Object.keys(presences)) {
      for (const entry of presences[key]) {
        ids.add(entry.userId);
      }
    }
    return ids;
  }

  // Org-wide presence channel (tracks who's online globally)
  React.useEffect(() => {
    const supabase = supabaseRef.current;
    const channelName = `presence:org-${orgId}`;

    const channel = supabase.channel(channelName, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ userId: string }>();
        setOrgOnlineUserIds(deduplicateOrgPresences(state));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId, fullName: userInfo.fullName, email: userInfo.email });
        }
      });

    orgChannelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      orgChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, userId]);

  // Page-specific presence channel (tracks who's on the same page)
  React.useEffect(() => {
    const supabase = supabaseRef.current;
    const encodedPath = encodeURIComponent(pathname);
    const channelName = `presence:org-${orgId}:page-${encodedPath}`;

    const channel = supabase.channel(channelName, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        setPageUsers(deduplicatePresences(state));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId,
            fullName: userInfo.fullName,
            email: userInfo.email,
            avatarUrl: userInfo.avatarUrl,
            path: pathname,
            onlineSince: new Date().toISOString(),
          });
        }
      });

    pageChannelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      pageChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, userId, pathname]);

  return { pageUsers, orgOnlineUserIds };
}
