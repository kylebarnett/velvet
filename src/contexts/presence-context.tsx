"use client";

import * as React from "react";

import { usePresence, type PresenceUser } from "@/hooks/use-presence";

type PresenceContextValue = {
  pageUsers: PresenceUser[];
  orgOnlineUserIds: Set<string>;
  isUserOnline: (userId: string) => boolean;
};

const PresenceContext = React.createContext<PresenceContextValue | null>(null);

export function usePresenceContext() {
  const ctx = React.useContext(PresenceContext);
  if (!ctx) throw new Error("usePresenceContext must be used within PresenceProvider");
  return ctx;
}

type PresenceProviderProps = {
  orgId: string;
  userId: string;
  userInfo: { fullName: string | null; email: string; avatarUrl: string | null };
  children: React.ReactNode;
};

export function PresenceProvider({
  orgId,
  userId,
  userInfo,
  children,
}: PresenceProviderProps) {
  const { pageUsers, orgOnlineUserIds } = usePresence({ orgId, userId, userInfo });

  const isUserOnline = React.useCallback(
    (uid: string) => orgOnlineUserIds.has(uid),
    [orgOnlineUserIds]
  );

  const value = React.useMemo(
    () => ({ pageUsers, orgOnlineUserIds, isUserOnline }),
    [pageUsers, orgOnlineUserIds, isUserOnline]
  );

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}
