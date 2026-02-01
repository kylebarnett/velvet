"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/reports",
    label: "Summary",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: "/reports/compare",
    label: "Compare",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: "/reports/trends",
    label: "Trends",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    badge: "Soon",
  },
];

export function ReportTabs() {
  const pathname = usePathname();

  // Determine active tab
  const getIsActive = (href: string) => {
    if (href === "/reports") {
      return pathname === "/reports" || pathname === "/reports/summary";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="inline-flex rounded-xl border border-white/[0.08] bg-gradient-to-r from-white/[0.03] to-transparent p-1">
      {TABS.map((tab) => {
        const isActive = getIsActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-white/60 hover:bg-white/[0.05] hover:text-white"
            }`}
          >
            <span className={isActive ? "text-zinc-700" : "text-white/40"}>
              {tab.icon}
            </span>
            {tab.label}
            {tab.badge && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                isActive
                  ? "bg-zinc-200 text-zinc-600"
                  : "bg-white/10 text-white/50"
              }`}>
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
