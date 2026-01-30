"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, HelpCircle, LogOut } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

export type NavItem = {
  href: string;
  label: string;
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
  const pathname = usePathname();

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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="grid min-h-screen grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-white/10 bg-black/40 md:block">
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
              <span>{company?.name ?? title}</span>
            </Link>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/5"
              onClick={onLogout}
              type="button"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4 text-white/70" />
            </button>
          </div>
          <nav className="px-2 py-3">
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
                        "flex h-10 w-full items-center justify-between rounded-md px-3 text-sm text-white/70 hover:bg-white/5 hover:text-white",
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
                        <Link
                          href={item.href}
                          className={cn(
                            "flex h-9 items-center rounded-md px-3 text-sm text-white/60 hover:bg-white/5 hover:text-white",
                            active && !isChildActive && "bg-white/10 text-white",
                          )}
                        >
                          Overview
                        </Link>
                        {item.children?.map((child) => {
                          const childActive =
                            pathname === child.href || pathname?.startsWith(child.href + "/");
                          return (
                            <Link
                              key={child.href}
                              className={cn(
                                "flex h-9 items-center rounded-md px-3 text-sm text-white/60 hover:bg-white/5 hover:text-white",
                                childActive && "bg-white/10 text-white",
                              )}
                              href={child.href}
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
                    "flex h-10 items-center rounded-md px-3 text-sm text-white/70 hover:bg-white/5 hover:text-white",
                    active && "bg-white/10 text-white",
                  )}
                  href={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
            {showTakeTour && onTakeTour && (
              <button
                onClick={onTakeTour}
                className="mt-4 flex h-10 w-full items-center gap-2 rounded-md px-3 text-sm text-white/50 hover:bg-white/5 hover:text-white/70"
                type="button"
              >
                <HelpCircle className="h-4 w-4" />
                Take tour
              </button>
            )}
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="flex h-14 items-center justify-between border-b border-white/10 bg-black/20 px-4 md:px-6">
            <div className="text-sm text-white/70">Velvet</div>
            <div className="flex items-center gap-2 text-sm">
              <button
                className="rounded-md bg-white px-3 py-1.5 text-black hover:bg-white/90"
                onClick={onLogout}
                type="button"
              >
                Log out
              </button>
            </div>
          </header>
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

