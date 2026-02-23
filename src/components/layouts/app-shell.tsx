"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ChevronDown,
  HelpCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export type NavItem = {
  href: string;
  label: string;
  badge?: number;
  icon?: string;
  divider?: boolean;
  children?: NavItem[];
  onClick?: () => void;
};

export type CompanyInfo = {
  name: string;
  website: string | null;
  logoUrl: string | null;
};

export type UserInfo = {
  fullName: string | null;
  email: string;
  avatarUrl?: string | null;
};

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
  settings: Settings,
  "message-square": MessageSquare,
};

function NavIcon({ name, className }: { name?: string; className?: string }) {
  if (!name) return null;
  const Icon = ICON_MAP[name];
  return Icon ? <Icon className={className} /> : null;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

function SidebarTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  function show() {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ top: rect.top + rect.height / 2, left: rect.right + 8 });
  }

  function hide() {
    setPos(null);
  }

  return (
    <div ref={ref} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {pos &&
        createPortal(
          <div
            className="fixed z-[var(--z-popover)] whitespace-nowrap rounded-md bg-bg-tooltip px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
            style={{ top: pos.top, left: pos.left, transform: "translateY(-50%)" }}
          >
            {label}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function AppShell({
  title,
  nav,
  company,
  user,
  role,
  initialTheme,
  children,
  onOpenCommandPalette,
  profileLinks,
  headerRight,
}: {
  title: string;
  nav: NavItem[];
  company?: CompanyInfo;
  user?: UserInfo;
  role?: "investor" | "founder";
  initialTheme?: string;
  children: React.ReactNode;
  onOpenCommandPalette?: () => void;
  profileLinks?: NavItem[];
  headerRight?: React.ReactNode;
}) {
  const [logoError, setLogoError] = React.useState(false);
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = React.useState(false);
  const pathname = usePathname();
  const { setTheme } = useTheme();

  // Sync theme from DB on mount — ensures per-user theme overrides stale localStorage
  React.useEffect(() => {
    if (initialTheme) {
      setTheme(initialTheme);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close mobile menu and settings panel on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
    setSettingsPanelOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Auto-expand sections when a child route is active
  React.useEffect(() => {
    nav.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some(
          (child) => pathname === child.href || pathname?.startsWith(child.href + "/")
        );
        if (isChildActive) {
          setExpandedSections((prev) => new Set([...prev, item.href]));
        }
      }
    });
  }, [pathname, nav]);

  function toggleSection(href: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  }

  async function onLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // Get current page title for mobile header
  const currentPageTitle = React.useMemo(() => {
    for (const item of nav) {
      if (pathname === item.href || pathname?.startsWith(item.href + "/")) {
        if (item.children) {
          const child = item.children.find(
            (c) => pathname === c.href || pathname?.startsWith(c.href + "/")
          );
          if (child) return child.label;
        }
        return item.label;
      }
    }
    return title;
  }, [pathname, nav, title]);

  const brandHeader = (
    <div className={cn("pb-4 pt-5", sidebarCollapsed ? "px-2" : "px-4")}>
      {sidebarCollapsed ? (
        <div className="flex flex-col items-center gap-3">
          <Link href="/app">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-hover text-sm font-bold">
              V
            </span>
          </Link>
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-secondary transition-colors"
            type="button"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <Link className="flex items-center gap-2.5" href="/app">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-hover text-sm font-bold">
              V
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Velvet</span>
          </Link>
          <button
            onClick={() => { setSidebarCollapsed(true); setSettingsPanelOpen(false); }}
            className="hidden md:inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-secondary transition-colors"
            type="button"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {company && !sidebarCollapsed && (
        <div className="ml-[42px] mt-0.5 flex items-center gap-1.5">
          {company.logoUrl && !logoError ? (
            <Image
              src={company.logoUrl}
              alt={`${company.name} logo`}
              width={14}
              height={14}
              className="rounded-sm"
              onError={() => setLogoError(true)}
              unoptimized
            />
          ) : null}
          <span className="truncate text-xs text-text-muted">{company.name}</span>
        </div>
      )}
      <div className="mx-0 mt-4 border-t border-border-subtle" />

      {onOpenCommandPalette && (
        <div className={cn("pt-3", sidebarCollapsed ? "px-1.5" : "px-2")}>
          {sidebarCollapsed ? (
            <SidebarTooltip label="Search (⌘K)">
              <button
                onClick={onOpenCommandPalette}
                className="flex h-9 w-full items-center justify-center rounded-md text-text-tertiary hover:bg-bg-raised hover:text-text-primary transition-colors"
                type="button"
                aria-label="Search"
              >
                <Search className="h-[18px] w-[18px]" />
              </button>
            </SidebarTooltip>
          ) : (
            <button
              onClick={onOpenCommandPalette}
              className="flex w-full items-center gap-2.5 rounded-md border border-border-default bg-bg-input px-3 h-9 text-sm text-text-muted hover:text-text-secondary hover:border-border-hover transition-colors"
              type="button"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="rounded border border-border-default bg-bg-primary px-1.5 py-0.5 text-[10px] font-medium text-text-muted">⌘K</kbd>
            </button>
          )}
        </div>
      )}
    </div>
  );

  const settingsPanel = (mobile = false) => {
    if (sidebarCollapsed && !mobile) {
      // Collapsed desktop: avatar only — click to expand + open panel
      return (
        <div className="border-t border-border-subtle p-3">
          <div className="flex flex-col items-center">
            <SidebarTooltip label={user?.fullName || user?.email || "Settings"}>
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-hover text-xs font-medium hover:ring-2 hover:ring-border-default transition-shadow"
                onClick={() => { setSidebarCollapsed(false); setSettingsPanelOpen(true); }}
                aria-label="Open settings"
              >
                {user?.avatarUrl ? (
                  <Image src={user.avatarUrl} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
                ) : user ? (
                  getInitials(user.fullName, user.email)
                ) : (
                  <LogOut className="h-4 w-4 text-text-muted" />
                )}
              </button>
            </SidebarTooltip>
          </div>
        </div>
      );
    }

    return (
      <div className="border-t border-border-subtle">
        <div
          className="grid transition-[grid-template-rows] duration-200 ease-in-out"
          style={{ gridTemplateRows: settingsPanelOpen ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="px-3 pt-2 pb-1 space-y-0.5">
              <div className={cn(
                "flex items-center justify-between rounded-md px-2.5",
                mobile ? "h-11" : "h-9",
              )}>
                <span className="text-sm text-text-tertiary">Theme</span>
                <ThemeToggle />
              </div>

              {profileLinks?.map((link) => {
                const Icon = link.icon ? ICON_MAP[link.icon] : null;
                const active = pathname === link.href || pathname?.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
                      mobile ? "h-11" : "h-9",
                      "text-text-tertiary hover:bg-bg-raised hover:text-text-primary",
                      active && "bg-bg-elevated text-text-primary",
                    )}
                    onClick={mobile ? () => setMobileMenuOpen(false) : undefined}
                  >
                    {Icon && <Icon className="h-[18px] w-[18px] shrink-0" />}
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              <button
                onClick={onLogout}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-text-tertiary transition-colors hover:bg-bg-raised hover:text-text-primary",
                  mobile ? "h-11" : "h-9",
                )}
                type="button"
              >
                <LogOut className="h-[18px] w-[18px] shrink-0" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="flex w-full items-center gap-2.5 p-3 text-left transition-colors hover:bg-bg-elevated"
          onClick={() => setSettingsPanelOpen((prev) => !prev)}
          aria-expanded={settingsPanelOpen}
          aria-label="Toggle settings"
        >
          {user?.avatarUrl ? (
            <Image src={user.avatarUrl} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-hover text-xs font-medium">
              {user ? getInitials(user.fullName, user.email) : "?"}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">
              {user?.fullName || user?.email?.split("@")[0] || "User"}
            </p>
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs text-text-muted">{user?.email}</p>
            </div>
            {role && (
              <span className="mt-0.5 inline-flex rounded-full bg-bg-hover px-2 py-0.5 text-[10px] font-medium capitalize text-text-tertiary">
                {role}
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-text-faint transition-transform duration-200",
              settingsPanelOpen && "rotate-180",
            )}
          />
        </button>
      </div>
    );
  };

  const renderNavItems = (mobile = false) => {
    const collapsed = !mobile && sidebarCollapsed;

    return (
      <>
        {nav.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedSections.has(item.href);
          const active =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const isChildActive = hasChildren && item.children?.some(
            (child) => pathname === child.href || pathname?.startsWith(child.href + "/")
          );

          if (hasChildren) {
            // When collapsed, show parent as a simple link to first child
            if (collapsed) {
              const firstChild = item.children?.[0];
              return (
                <React.Fragment key={item.href}>
                  {item.divider && <div className="mx-2 my-2 border-t border-border-subtle" />}
                  <SidebarTooltip label={item.label}>
                    <Link
                      className={cn(
                        "relative flex h-9 items-center justify-center rounded-md transition-colors",
                        "text-text-tertiary hover:bg-bg-raised hover:text-text-primary",
                        (active || isChildActive) &&
                          "bg-bg-elevated text-text-primary before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-accent",
                      )}
                      href={firstChild?.href ?? item.href}
                      onClick={() => setSidebarCollapsed(false)}
                    >
                      <NavIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                      {item.badge != null && item.badge > 0 && (
                        <span className="absolute -right-0.5 top-0.5 h-2 w-2 rounded-full bg-accent" />
                      )}
                    </Link>
                  </SidebarTooltip>
                </React.Fragment>
              );
            }

            return (
              <div key={item.href}>
                {item.divider && <div className="mx-3 my-2 border-t border-border-subtle" />}
                <button
                  onClick={() => toggleSection(item.href)}
                  className={cn(
                    "relative flex w-full items-center gap-2.5 rounded-md px-3 text-sm transition-colors",
                    mobile ? "h-12" : "h-9",
                    "text-text-tertiary hover:bg-bg-raised hover:text-text-primary",
                    (active || isChildActive) && "text-text-primary",
                  )}
                  type="button"
                >
                  <NavIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                  <span>{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-bg-hover px-1.5 text-[10px] font-medium text-text-primary">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-text-faint transition-transform",
                      !(item.badge != null && item.badge > 0) && "ml-auto",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>
                {isExpanded && (
                  <div className="ml-[15px] border-l border-border-subtle">
                    {item.children?.map((child) => {
                      const childActive =
                        pathname === child.href || pathname?.startsWith(child.href + "/");
                      return (
                        <Link
                          key={child.href}
                          className={cn(
                            "relative flex items-center gap-2.5 rounded-r-md pl-4 pr-3 text-sm transition-colors",
                            mobile ? "h-11" : "h-8",
                            "text-text-tertiary hover:bg-bg-raised hover:text-text-primary",
                            childActive &&
                              "bg-bg-elevated text-text-primary before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-accent",
                          )}
                          href={child.href}
                          aria-current={childActive ? "page" : undefined}
                          onClick={mobile ? () => setMobileMenuOpen(false) : undefined}
                        >
                          <NavIcon name={child.icon} className="h-4 w-4 shrink-0" />
                          <span>{child.label}</span>
                          {child.badge != null && child.badge > 0 && (
                            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-bg-hover px-1.5 text-[10px] font-medium text-text-primary">
                              {child.badge > 99 ? "99+" : child.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const navClasses = cn(
            "relative flex items-center rounded-md transition-colors",
            collapsed ? "h-9 justify-center" : "h-9 gap-2.5 px-3",
            mobile && "h-12",
            "text-text-tertiary hover:bg-bg-raised hover:text-text-primary",
            active &&
              "bg-bg-elevated text-text-primary before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-accent",
          );

          const navContent = (
            <>
              <NavIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
              {!collapsed && item.badge != null && item.badge > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-bg-hover px-1.5 text-[10px] font-medium text-text-primary">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
              {collapsed && item.badge != null && item.badge > 0 && (
                <span className="absolute -right-0.5 top-0.5 h-2 w-2 rounded-full bg-accent" />
              )}
            </>
          );

          const navLink = item.onClick ? (
            <button
              type="button"
              className={cn(navClasses, !collapsed && "w-full")}
              onClick={() => {
                item.onClick!();
                if (mobile) setMobileMenuOpen(false);
              }}
            >
              {navContent}
            </button>
          ) : (
            <Link
              className={navClasses}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={mobile ? () => setMobileMenuOpen(false) : collapsed ? () => setSidebarCollapsed(false) : undefined}
            >
              {navContent}
            </Link>
          );

          return (
            <React.Fragment key={item.href}>
              {item.divider && <div className={cn("my-2 border-t border-border-subtle", collapsed ? "mx-2" : "mx-3")} />}
              {collapsed ? <SidebarTooltip label={item.label}>{navLink}</SidebarTooltip> : navLink}
            </React.Fragment>
          );
        })}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Skip to main content link — visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-bg-elevated focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-text-primary focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border-default bg-bg-primary/95 px-4 backdrop-blur-sm md:hidden">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-bg-elevated focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
          type="button"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium">{currentPageTitle}</span>
        {onOpenCommandPalette ? (
          <button
            onClick={onOpenCommandPalette}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-bg-elevated"
            type="button"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>
        ) : (
          <div className="h-10 w-10" />
        )}
      </header>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-bg-backdrop backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col bg-bg-primary border-r border-border-default transition-transform duration-300 ease-in-out md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 pt-5 pb-2">
          <Link
            className="flex items-center gap-2.5"
            href="/app"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-hover text-sm font-bold">
              V
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Velvet</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-bg-elevated focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
            type="button"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {company && (
          <div className="ml-[42px] px-4 flex items-center gap-1.5">
            {company.logoUrl && !logoError ? (
              <Image
                src={company.logoUrl}
                alt={`${company.name} logo`}
                width={14}
                height={14}
                className="rounded-sm"
                onError={() => setLogoError(true)}
                unoptimized
              />
            ) : null}
            <span className="truncate text-xs text-text-muted">{company.name}</span>
          </div>
        )}
        <div className="mx-4 mt-4 border-t border-border-subtle" />

        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-2 py-3">
          {renderNavItems(true)}
        </nav>

        {settingsPanel(true)}
      </aside>

      <div id="main-content">
        <div
          className="hidden md:grid md:min-h-screen transition-[grid-template-columns] duration-200"
          style={{ gridTemplateColumns: sidebarCollapsed ? "64px 1fr" : "280px 1fr" }}
        >
          <aside className="sticky top-0 flex h-screen flex-col border-r border-border-default bg-bg-sidebar overflow-hidden">
            {brandHeader}
            <nav aria-label="Main navigation" className={cn("flex-1 overflow-y-auto", sidebarCollapsed ? "px-1.5" : "px-2")}>
              {renderNavItems(false)}
            </nav>
            {settingsPanel(false)}
          </aside>

          <div className="min-w-0">
            {headerRight && (
              <div className="sticky top-0 z-30 flex h-10 items-center justify-end border-b border-border-default bg-bg-primary/95 px-4 backdrop-blur-sm">
                {headerRight}
              </div>
            )}
            <main className="p-4 md:p-6">{children}</main>
          </div>
        </div>

        <main className="p-4 md:hidden">{children}</main>
      </div>
    </div>
  );
}
