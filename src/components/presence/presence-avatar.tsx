"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

import { cn } from "@/lib/utils/cn";

type PresenceAvatarProps = {
  userId: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  isOnline?: boolean;
  size?: "sm" | "md";
  onSendMessage?: (userId: string) => void;
};

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

export function PresenceAvatar({
  userId,
  fullName,
  email,
  avatarUrl,
  isOnline = true,
  size = "md",
  onSendMessage,
}: PresenceAvatarProps) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [showPopover, setShowPopover] = React.useState(false);
  const [tooltipPos, setTooltipPos] = React.useState<{ top: number; left: number } | null>(null);
  const [popoverPos, setPopoverPos] = React.useState<{ top: number; left: number } | null>(null);

  const sizeClasses = size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs";
  const dotClasses = size === "sm"
    ? "h-2 w-2 -bottom-0 -right-0"
    : "h-2.5 w-2.5 -bottom-0.5 -right-0.5";

  function showTooltip() {
    if (showPopover || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setTooltipPos({ top: rect.top - 4, left: rect.left + rect.width / 2 });
  }

  function hideTooltip() {
    setTooltipPos(null);
  }

  function handleClick() {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPopoverPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
    setShowPopover(true);
    setTooltipPos(null);
  }

  // Close popover on outside click
  React.useEffect(() => {
    if (!showPopover) return;
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showPopover]);

  // Close popover on Escape
  React.useEffect(() => {
    if (!showPopover) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setShowPopover(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showPopover]);

  const displayName = fullName || email.split("@")[0];

  return (
    <>
      <button
        ref={ref}
        type="button"
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center rounded-full font-medium ring-2 ring-[var(--bg-primary)] transition-shadow hover:ring-[var(--ring-focus)]",
          sizeClasses,
          avatarUrl ? "" : "bg-bg-hover text-text-secondary",
        )}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onClick={handleClick}
        aria-label={`${displayName}${isOnline ? " (online)" : ""}`}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={32}
            height={32}
            className={cn("rounded-full object-cover", sizeClasses)}
            unoptimized
          />
        ) : (
          getInitials(fullName, email)
        )}
        {isOnline && (
          <span
            className={cn(
              "absolute rounded-full bg-emerald-400 ring-2 ring-[var(--bg-primary)]",
              dotClasses,
            )}
            aria-hidden="true"
          />
        )}
      </button>

      {/* Tooltip */}
      {tooltipPos &&
        createPortal(
          <div
            className="fixed z-[var(--z-popover)] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-bg-tooltip px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
          >
            {displayName}
          </div>,
          document.body,
        )}

      {/* Popover */}
      {showPopover &&
        popoverPos &&
        createPortal(
          <div
            className="fixed z-[var(--z-popover)] -translate-x-1/2 rounded-xl border border-border-default bg-bg-secondary p-3 shadow-xl"
            style={{ top: popoverPos.top, left: popoverPos.left }}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                  avatarUrl ? "" : "bg-bg-hover text-text-secondary",
                )}
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  getInitials(fullName, email)
                )}
                {isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[var(--bg-secondary)]" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">{displayName}</p>
                <p className="truncate text-xs text-text-muted">{email}</p>
              </div>
            </div>
            {onSendMessage && (
              <button
                type="button"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
                onClick={() => {
                  onSendMessage(userId);
                  setShowPopover(false);
                }}
              >
                Send message
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
