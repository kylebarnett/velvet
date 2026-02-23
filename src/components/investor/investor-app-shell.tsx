"use client";

import * as React from "react";

import { AppShell, type NavItem, type CompanyInfo, type UserInfo } from "@/components/layouts/app-shell";
import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
import { useChatContextSafe } from "@/contexts/chat-context";
import { PresenceBar } from "@/components/presence/presence-bar";

type InvestorAppShellProps = {
  title: string;
  nav: NavItem[];
  profileLinks?: NavItem[];
  company?: CompanyInfo;
  user?: UserInfo;
  initialTheme?: string;
  children: React.ReactNode;
};

export function InvestorAppShell({
  title,
  nav,
  profileLinks,
  company,
  user,
  initialTheme,
  children,
}: InvestorAppShellProps) {
  const { open: openCommandPalette } = useCommandPalette();
  const chat = useChatContextSafe();

  // Inject Messages nav item when chat context is available
  const augmentedNav = React.useMemo(() => {
    if (!chat) return nav;
    const messagesItem: NavItem = {
      href: "#messages",
      label: "Messages",
      icon: "message-square",
      divider: true,
      badge: chat.totalUnread > 0 ? chat.totalUnread : undefined,
      onClick: () => chat.togglePanel(),
    };
    return [...nav, messagesItem];
  }, [nav, chat]);

  // Presence bar for headerRight — only when chat context is available
  const headerRight = chat ? (
    <PresenceBar onSendMessage={(userId) => chat.startDirectMessage(userId)} />
  ) : undefined;

  return (
    <AppShell
      title={title}
      nav={augmentedNav}
      profileLinks={profileLinks}
      company={company}
      user={user}
      role="investor"
      initialTheme={initialTheme}
      onOpenCommandPalette={openCommandPalette}
      headerRight={headerRight}
    >
      {children}
    </AppShell>
  );
}
