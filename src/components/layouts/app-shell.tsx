"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Building2,
  Users,
  Send,
  BarChart3,
  FileText,
  UserPlus,
  LayoutDashboard,
  Inbox,
  Shield,
  Sparkles,
  Landmark,
  ChevronDown,
  HelpCircle,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type NavItem = {
  href: string;
  label: string;
  badge?: number;
  icon?: string;
  divider?: boolean;
  children?: NavItem[];
};

export type CompanyInfo = {
  name: string;
  website: string | null;
  logoUrl: string | null;
};

export type UserInfo = {
  fullName: string | null;
  email: string;
};

/* ------------------------------------------------------------------ */
/*  Icon map (string keys → Lucide components)                         */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  building2: Building2,
  users: Users,
  send: Send,
  "bar-chart-3": BarChart3,
  "file-text": FileText,
  "user-plus": UserPlus,
  "layout-dashboard": LayoutDashboard,
  inbox: Inbox,
  shield: Shield,
  landmark: Landmark,
  sparkles: Sparkles,
};

function NavIcon({ name, className }: { name?: string; className?: string }) {
  if (!name) return null;
  const Icon = ICON_MAP[name];
  return Icon ? <Icon className={className} /> : null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

/* ------------------------------------------------------------------ */
/*  Sidebar tooltip (fixed position, escapes overflow)                 */
/* ------------------------------------------------------------------ */

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
      {pos && (
        <div
          className="fixed z-[100] whitespace-nowrap rounded-md border border-border-default bg-bg-elevated px-2.5 py-1.5 text-xs font-medium text-text-primary shadow-lg"
          style={{ top: pos.top, left: pos.left, transform: "translateY(-50%)" }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AppShell                                                           */
/* ------------------------------------------------------------------ */

export function AppShell({
  title,
  nav,
  company,
  user,
  role,
  children,
  showTakeTour,
  onTakeTour,
}: {
  title: string;
  nav: NavItem[];
  company?: CompanyInfo;
  user?: UserInfo;
  role?: "investor" | "founder";
  children: React.ReactNode;
  showTakeTour?: boolean;
  onTakeTour?: () => void;
}) {
  const [logoError, setLogoError] = React.useState(false);
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const pathname = usePathname();

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
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

  /* ---------------------------------------------------------------- */
  /*  Brand header                                                     */
  /* ---------------------------------------------------------------- */

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
            onClick={() => setSidebarCollapsed(true)}
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
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  User profile footer                                              */
  /* ---------------------------------------------------------------- */

  const profileFooter = user ? (
    <div className="border-t border-border-subtle p-3">
      {sidebarCollapsed ? (
        <div className="flex flex-col items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-hover text-xs font-medium" title={user.fullName || user.email}>
            {getInitials(user.fullName, user.email)}
          </span>
          <button
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-secondary"
            onClick={onLogout}
            type="button"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-hover text-xs font-medium">
            {getInitials(user.fullName, user.email)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">
              {user.fullName || user.email.split("@")[0]}
            </p>
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs text-text-muted">{user.email}</p>
            </div>
            {role && (
              <span className="mt-0.5 inline-flex rounded-full bg-bg-hover px-2 py-0.5 text-[10px] font-medium capitalize text-text-tertiary">
                {role}
              </span>
            )}
          </div>
          <button
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-secondary"
            onClick={onLogout}
            type="button"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  ) : null;

  /* ---------------------------------------------------------------- */
  /*  Nav rendering                                                    */
  /* ---------------------------------------------------------------- */

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
                        "text-text-tertiary hover:bg-bg-raised hover:text-text-secondary",
                        (active || isChildActive) &&
                          "bg-bg-elevated text-text-primary before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-accent",
                      )}
                      href={firstChild?.href ?? item.href}
                      onClick={() => setSidebarCollapsed(false)}
                    >
                      <NavIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
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
                    "text-text-tertiary hover:bg-bg-raised hover:text-text-secondary",
                    (active || isChildActive) && "text-text-primary",
                  )}
                  type="button"
                >
                  <NavIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                  <span>{item.label}</span>
                  <ChevronDown
                    className={cn(
                      "ml-auto h-4 w-4 text-text-faint transition-transform",
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
                            "text-text-tertiary hover:bg-bg-raised hover:text-text-secondary",
                            childActive &&
                              "bg-bg-elevated text-text-primary before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-accent",
                          )}
                          href={child.href}
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

          const navLink = (
            <Link
              className={cn(
                "relative flex items-center rounded-md transition-colors",
                collapsed ? "h-9 justify-center" : "h-9 gap-2.5 px-3",
                mobile && "h-12",
                "text-text-tertiary hover:bg-bg-raised hover:text-text-secondary",
                active &&
                  "bg-bg-elevated text-text-primary before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-accent",
              )}
              href={item.href}
              onClick={mobile ? () => setMobileMenuOpen(false) : collapsed ? () => setSidebarCollapsed(false) : undefined}
            >
              <NavIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
              {!collapsed && item.badge != null && item.badge > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-bg-hover px-1.5 text-[10px] font-medium text-text-primary">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );

          return (
            <React.Fragment key={item.href}>
              {item.divider && <div className={cn("my-2 border-t border-border-subtle", collapsed ? "mx-2" : "mx-3")} />}
              {collapsed ? <SidebarTooltip label={item.label}>{navLink}</SidebarTooltip> : navLink}
            </React.Fragment>
          );
        })}
        {showTakeTour && onTakeTour && (() => {
          const tourBtn = (
            <button
              onClick={() => {
                if (mobile) setMobileMenuOpen(false);
                onTakeTour();
              }}
              className={cn(
                "mt-4 flex w-full items-center rounded-md text-sm text-text-muted hover:bg-bg-raised hover:text-text-tertiary",
                collapsed ? "h-9 justify-center" : "h-9 gap-2.5 px-3",
                mobile && "h-12",
              )}
              type="button"
            >
              <HelpCircle className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && "Take tour"}
            </button>
          );
          return collapsed ? <SidebarTooltip label="Take tour">{tourBtn}</SidebarTooltip> : tourBtn;
        })()}
      </>
    );
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Mobile Header */}
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
        {/* Spacer to keep title centered */}
        <div className="h-10 w-10" />
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-bg-backdrop backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col bg-bg-primary border-r border-border-default transition-transform duration-300 ease-in-out md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile brand header */}
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

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {renderNavItems(true)}
        </nav>

        {/* Mobile theme toggle */}
        <div className="border-t border-border-subtle px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-text-muted">Theme</span>
          <ThemeToggle />
        </div>

        {/* Mobile profile footer */}
        {user ? (
          <div className="border-t border-border-subtle p-3">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-hover text-xs font-medium">
                {getInitials(user.fullName, user.email)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {user.fullName || user.email.split("@")[0]}
                </p>
                <p className="truncate text-xs text-text-muted">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-bg-elevated text-sm text-text-secondary hover:bg-bg-hover"
              type="button"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        ) : (
          <div className="border-t border-border-default p-4">
            <button
              onClick={onLogout}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-bg-elevated text-sm text-text-secondary hover:bg-bg-hover"
              type="button"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        )}
      </aside>

      {/* Desktop Layout */}
      <div
        className="hidden md:grid md:min-h-screen transition-[grid-template-columns] duration-200"
        style={{ gridTemplateColumns: sidebarCollapsed ? "64px 1fr" : "280px 1fr" }}
      >
        {/* Desktop Sidebar */}
        <aside className="sticky top-0 flex h-screen flex-col border-r border-border-default bg-bg-sidebar overflow-hidden">
          {brandHeader}
          <nav className={cn("flex-1 overflow-y-auto", sidebarCollapsed ? "px-1.5" : "px-2")}>
            {renderNavItems(false)}
          </nav>
          {!sidebarCollapsed && (
            <div className="border-t border-border-subtle px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-text-muted">Theme</span>
              <ThemeToggle />
            </div>
          )}
          {profileFooter}
          {/* Fallback logout if no user prop */}
          {!user && (
            <div className="border-t border-border-subtle p-3">
              <button
                className={cn(
                  "flex h-9 w-full items-center justify-center gap-2 rounded-md text-sm text-text-muted hover:bg-bg-elevated hover:text-text-secondary",
                )}
                onClick={onLogout}
                type="button"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
                {!sidebarCollapsed && "Log out"}
              </button>
            </div>
          )}
        </aside>

        {/* Desktop Main Content */}
        <div className="min-w-0">
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>

      {/* Mobile Main Content */}
      <main className="p-4 md:hidden">{children}</main>
    </div>
  );
}
