"use client";

import * as React from "react";

import { usePresenceContext } from "@/contexts/presence-context";
import { PresenceAvatar } from "./presence-avatar";

type PresenceBarProps = {
  onSendMessage?: (userId: string) => void;
};

const MAX_VISIBLE = 5;

export function PresenceBar({ onSendMessage }: PresenceBarProps) {
  const { pageUsers } = usePresenceContext();

  if (pageUsers.length === 0) return null;

  const visible = pageUsers.slice(0, MAX_VISIBLE);
  const overflow = pageUsers.length - MAX_VISIBLE;

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Team members on this page">
      <div className="flex items-center -space-x-2">
        {visible.map((u) => (
          <PresenceAvatar
            key={u.userId}
            userId={u.userId}
            fullName={u.fullName}
            email={u.email}
            avatarUrl={u.avatarUrl}
            isOnline
            size="sm"
            onSendMessage={onSendMessage}
          />
        ))}
      </div>
      {overflow > 0 && (
        <span className="ml-1 flex h-7 items-center rounded-full bg-bg-hover px-2 text-xs font-medium text-text-secondary">
          +{overflow}
        </span>
      )}
    </div>
  );
}
