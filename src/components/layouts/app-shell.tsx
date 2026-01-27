"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

export type NavItem = {
  href: string;
  label: string;
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
}: {
  title: string;
  nav: NavItem[];
  company?: CompanyInfo;
  children: React.ReactNode;
}) {
  const [logoError, setLogoError] = React.useState(false);
  const pathname = usePathname();

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
              const active =
                pathname === item.href || pathname?.startsWith(item.href + "/");
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

