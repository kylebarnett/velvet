"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, HelpCircle, LogOut, Menu, X } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

export type NavItem = {
  href: string;
  label: string;
  badge?: number;
  children?: NavItem[];
};

export type CompanyInfo = {
  name: string;
  website: string | null;
  logoUrl: string | null;
};

export function AppShell({
  title,
  nav,
  company,
  children,
  showTakeTour,
  onTakeTour,
}: {
  title: string;
  nav: NavItem[];
  company?: CompanyInfo;
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
              <button
                onClick={() => toggleSection(item.href)}
                className={cn(
                  "flex h-12 md:h-10 w-full items-center justify-between rounded-md px-3 text-sm text-white/70 hover:bg-white/5 hover:text-white",
                  (active || isChildActive) && "text-white",
                )}
                type="button"
              >
                <span>{item.label}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>
              {isExpanded && (
                <div className="ml-3 border-l border-white/10 pl-2">
                  {item.children?.map((child) => {
                    const childActive =
                      pathname === child.href || pathname?.startsWith(child.href + "/");
                    return (
                      <Link
                        key={child.href}
                        className={cn(
                          "flex h-11 md:h-9 items-center rounded-md px-3 text-sm text-white/60 hover:bg-white/5 hover:text-white",
                          childActive && "bg-white/10 text-white",
                        )}
                        href={child.href}
                        onClick={mobile ? () => setMobileMenuOpen(false) : undefined}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            className={cn(
              "flex h-12 md:h-10 items-center justify-between rounded-md px-3 text-sm text-white/70 hover:bg-white/5 hover:text-white",
              active && "bg-white/10 text-white",
            )}
            href={item.href}
            onClick={mobile ? () => setMobileMenuOpen(false) : undefined}
          >
            <span>{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white/15 px-1.5 text-[10px] font-medium text-white">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </Link>
        );
      })}
      {showTakeTour && onTakeTour && (
        <button
          onClick={() => {
            if (mobile) setMobileMenuOpen(false);
            onTakeTour();
          }}
          className="mt-4 flex h-12 md:h-10 w-full items-center gap-2 rounded-md px-3 text-sm text-white/50 hover:bg-white/5 hover:text-white/70"
          type="button"
        >
          <HelpCircle className="h-4 w-4" />
          Take tour
        </button>
      )}
    </>
  );

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
        <button
          onClick={onLogout}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
          type="button"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4 text-white/70" />
        </button>
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
          "fixed inset-y-0 left-0 z-50 w-72 transform bg-zinc-950 border-r border-white/10 transition-transform duration-300 ease-in-out md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <Link
            className="flex items-center gap-2 text-sm font-semibold tracking-tight"
            href="/app"
            onClick={() => setMobileMenuOpen(false)}
          >
            {company && company.logoUrl && !logoError ? (
              <Image
                src={company.logoUrl}
                alt={`${company.name} logo`}
                width={24}
                height={24}
                className="rounded"
                onError={() => setLogoError(true)}
                unoptimized
              />
            ) : company ? (
              <span className="flex h-6 w-6 items-center justify-center rounded bg-white/10 text-xs font-medium uppercase">
                {company.name.charAt(0)}
              </span>
            ) : null}
            <span>{company?.name ?? title}</span>
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
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {renderNavItems(true)}
        </nav>
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
      </aside>

      {/* Desktop Layout */}
      <div className="hidden md:grid md:min-h-screen md:grid-cols-[260px_1fr] lg:grid-cols-[280px_1fr]">
        {/* Desktop Sidebar */}
        <aside className="sticky top-0 h-screen border-r border-white/10 bg-black/40">
          <div className="flex h-14 items-center justify-between px-4">
            <Link
              className="flex items-center gap-2 text-sm font-semibold tracking-tight"
              href="/app"
            >
              {company && company.logoUrl && !logoError ? (
                <Image
                  src={company.logoUrl}
                  alt={`${company.name} logo`}
                  width={24}
                  height={24}
                  className="rounded"
                  onError={() => setLogoError(true)}
                  unoptimized
                />
              ) : company ? (
                <span className="flex h-6 w-6 items-center justify-center rounded bg-white/10 text-xs font-medium uppercase">
                  {company.name.charAt(0)}
                </span>
              ) : null}
              <span className="truncate">{company?.name ?? title}</span>
            </Link>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
              onClick={onLogout}
              type="button"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4 text-white/70" />
            </button>
          </div>
          <nav className="px-2 py-3">
            {renderNavItems(false)}
          </nav>
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
