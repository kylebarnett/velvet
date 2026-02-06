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
  type LucideIcon,
} from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

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
/*  AppShell                                                           */
/* ------------------------------------------------------------------ */

export function AppShell({
  title,
  nav,
  company,
  user,
  children,
  showTakeTour,
  onTakeTour,
}: {
  title: string;
  nav: NavItem[];
  company?: CompanyInfo;
  user?: UserInfo;
  children: React.ReactNode;
  showTakeTour?: boolean;
  onTakeTour?: () => void;
}) {
  const [logoError, setLogoError] = React.useState(false);
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
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
    <div className="px-4 pb-4 pt-5">
      <Link className="flex items-center gap-2.5" href="/app">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
          V
        </span>
        <span className="text-[15px] font-semibold tracking-tight">Velvet</span>
      </Link>
      {company && (
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
          <span className="truncate text-xs text-white/50">{company.name}</span>
        </div>
      )}
      <div className="mx-0 mt-4 border-t border-white/[0.06]" />
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  User profile footer                                              */
  /* ---------------------------------------------------------------- */

  const profileFooter = user ? (
    <div className="border-t border-white/[0.06] p-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium">
          {getInitials(user.fullName, user.email)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white/90">
            {user.fullName || user.email.split("@")[0]}
          </p>
          <p className="truncate text-xs text-white/40">{user.email}</p>
        </div>
        <button
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/40 hover:bg-white/[0.06] hover:text-white/70"
          onClick={onLogout}
          type="button"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  ) : null;

  /* ---------------------------------------------------------------- */
  /*  Nav rendering                                                    */
  /* ---------------------------------------------------------------- */

  const renderNavItems = (mobile = false) => (
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
          return (
            <div key={item.href}>
              {item.divider && <div className="mx-3 my-2 border-t border-white/[0.06]" />}
              <button
                onClick={() => toggleSection(item.href)}
                className={cn(
                  "relative flex w-full items-center gap-2.5 rounded-md px-3 text-sm transition-colors",
                  mobile ? "h-12" : "h-9",
                  "text-white/60 hover:bg-white/[0.04] hover:text-white/80",
                  (active || isChildActive) && "text-white",
                )}
                type="button"
              >
                <NavIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                <span>{item.label}</span>
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 text-white/30 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>
              {isExpanded && (
                <div className="ml-[15px] border-l border-white/[0.06]">
                  {item.children?.map((child) => {
                    const childActive =
                      pathname === child.href || pathname?.startsWith(child.href + "/");
                    return (
                      <Link
                        key={child.href}
                        className={cn(
                          "relative flex items-center gap-2.5 rounded-r-md pl-4 pr-3 text-sm transition-colors",
                          mobile ? "h-11" : "h-8",
                          "text-white/60 hover:bg-white/[0.04] hover:text-white/80",
                          childActive &&
                            "bg-white/[0.06] text-white before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-white/70",
                        )}
                        href={child.href}
                        onClick={mobile ? () => setMobileMenuOpen(false) : undefined}
                      >
                        <NavIcon name={child.icon} className="h-4 w-4 shrink-0" />
                        <span>{child.label}</span>
                        {child.badge != null && child.badge > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-white/15 px-1.5 text-[10px] font-medium text-white">
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

        return (
          <React.Fragment key={item.href}>
            {item.divider && <div className="mx-3 my-2 border-t border-white/[0.06]" />}
            <Link
              className={cn(
                "relative flex items-center gap-2.5 rounded-md px-3 text-sm transition-colors",
                mobile ? "h-12" : "h-9",
                "text-white/60 hover:bg-white/[0.04] hover:text-white/80",
                active &&
                  "bg-white/[0.06] text-white before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-white",
              )}
              href={item.href}
              onClick={mobile ? () => setMobileMenuOpen(false) : undefined}
            >
              <NavIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
              <span>{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-white/15 px-1.5 text-[10px] font-medium text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          </React.Fragment>
        );
      })}
      {showTakeTour && onTakeTour && (
        <button
          onClick={() => {
            if (mobile) setMobileMenuOpen(false);
            onTakeTour();
          }}
          className={cn(
            "mt-4 flex w-full items-center gap-2.5 rounded-md px-3 text-sm text-white/40 hover:bg-white/[0.04] hover:text-white/60",
            mobile ? "h-12" : "h-9",
          )}
          type="button"
        >
          <HelpCircle className="h-[18px] w-[18px] shrink-0" />
          Take tour
        </button>
      )}
    </>
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-zinc-950/95 px-4 backdrop-blur-sm md:hidden">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
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
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col bg-zinc-950 border-r border-white/10 transition-transform duration-300 ease-in-out md:hidden",
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
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
              V
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Velvet</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
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
            <span className="truncate text-xs text-white/50">{company.name}</span>
          </div>
        )}
        <div className="mx-4 mt-4 border-t border-white/[0.06]" />

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {renderNavItems(true)}
        </nav>

        {/* Mobile profile footer */}
        {user ? (
          <div className="border-t border-white/[0.06] p-3">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-medium">
                {getInitials(user.fullName, user.email)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white/90">
                  {user.fullName || user.email.split("@")[0]}
                </p>
                <p className="truncate text-xs text-white/40">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white/5 text-sm text-white/70 hover:bg-white/10"
              type="button"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        ) : (
          <div className="border-t border-white/10 p-4">
            <button
              onClick={onLogout}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white/5 text-sm text-white/70 hover:bg-white/10"
              type="button"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        )}
      </aside>

      {/* Desktop Layout */}
      <div className="hidden md:grid md:min-h-screen md:grid-cols-[260px_1fr] lg:grid-cols-[280px_1fr]">
        {/* Desktop Sidebar */}
        <aside className="sticky top-0 flex h-screen flex-col border-r border-white/10 bg-black/40">
          {brandHeader}
          <nav className="flex-1 overflow-y-auto px-2">
            {renderNavItems(false)}
          </nav>
          {profileFooter}
          {/* Fallback logout if no user prop */}
          {!user && (
            <div className="border-t border-white/[0.06] p-3">
              <button
                className="flex h-9 w-full items-center justify-center gap-2 rounded-md text-sm text-white/50 hover:bg-white/[0.06] hover:text-white/70"
                onClick={onLogout}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                Log out
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
