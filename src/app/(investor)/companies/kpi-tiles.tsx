"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, ChevronDown } from "lucide-react";

type CompanySummary = { id: string; name: string };

interface KpiTilesProps {
  portfolioCount: number;
  awaitingCompanies: CompanySummary[];
  submittedCompanies: CompanySummary[];
}

const MAX_VISIBLE = 8;

function AccordionPanel({
  companies,
  isOpen,
}: {
  companies: CompanySummary[];
  isOpen: boolean;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen, companies.length]);

  const visible = companies.slice(0, MAX_VISIBLE);
  const hasMore = companies.length > MAX_VISIBLE;

  return (
    <div
      className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
      style={{ maxHeight: height }}
    >
      <div ref={contentRef}>
        <div className="mt-3 border-t border-border-default pt-2" onClick={(e) => e.stopPropagation()}>
          {visible.map((c) => (
            <Link
              key={c.id}
              href={`/companies/${c.id}`}
              className="block truncate rounded px-1 py-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              {c.name}
            </Link>
          ))}
          {hasMore && (
            <Link
              href="/metric-requests"
              className="mt-1 block px-1 py-1.5 text-xs font-medium text-text-tertiary transition-colors hover:text-text-secondary"
            >
              View all {companies.length} companies →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function KpiTiles({
  portfolioCount,
  awaitingCompanies,
  submittedCompanies,
}: KpiTilesProps) {
  const [expanded, setExpanded] = useState<"awaiting" | "submitted" | null>(
    null
  );

  function toggle(tile: "awaiting" | "submitted") {
    setExpanded((prev) => (prev === tile ? null : tile));
  }

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {/* Portfolio companies — static link */}
      <Link
        href="/contacts"
        className="card-hover-lift group rounded-xl kpi-gradient-blue p-5"
      >
        <div className="flex items-start justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Portfolio companies
          </div>
          <Building2 className="h-4 w-4 text-text-faint" />
        </div>
        <div className="mt-3 text-3xl font-bold tracking-tight">
          {portfolioCount}
        </div>
        <div className="mt-1 text-xs text-text-tertiary">
          Total companies in your portfolio
        </div>
      </Link>

      {/* Awaiting submission — expandable */}
      <div
        className={`rounded-xl kpi-gradient-amber p-5 ${
          awaitingCompanies.length > 0
            ? "cursor-pointer card-hover-lift"
            : ""
        }`}
        role={awaitingCompanies.length > 0 ? "button" : undefined}
        tabIndex={awaitingCompanies.length > 0 ? 0 : undefined}
        aria-expanded={awaitingCompanies.length > 0 ? expanded === "awaiting" : undefined}
        onKeyDown={(e) => {
          if (awaitingCompanies.length > 0 && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            toggle("awaiting");
          }
        }}
        onClick={() => awaitingCompanies.length > 0 && toggle("awaiting")}
      >
        <div className="flex items-start justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Awaiting submission
          </div>
          {awaitingCompanies.length > 0 ? (
            <ChevronDown
              className={`h-4 w-4 text-text-faint transition-transform duration-200 ${
                expanded === "awaiting" ? "rotate-180" : ""
              }`}
            />
          ) : (
            <Building2 className="h-4 w-4 text-text-faint" />
          )}
        </div>
        <div className="mt-3 text-3xl font-bold tracking-tight">
          {awaitingCompanies.length}
        </div>
        <div className="mt-1 text-xs text-text-tertiary">
          Companies with pending metric requests
        </div>
        <AccordionPanel
          companies={awaitingCompanies}
          isOpen={expanded === "awaiting"}
        />
      </div>

      {/* Submitted this week — expandable */}
      <div
        className={`rounded-xl kpi-gradient-emerald p-5 ${
          submittedCompanies.length > 0
            ? "cursor-pointer card-hover-lift"
            : ""
        }`}
        role={submittedCompanies.length > 0 ? "button" : undefined}
        tabIndex={submittedCompanies.length > 0 ? 0 : undefined}
        aria-expanded={submittedCompanies.length > 0 ? expanded === "submitted" : undefined}
        onKeyDown={(e) => {
          if (submittedCompanies.length > 0 && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            toggle("submitted");
          }
        }}
        onClick={() => submittedCompanies.length > 0 && toggle("submitted")}
      >
        <div className="flex items-start justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Submitted this week
          </div>
          {submittedCompanies.length > 0 ? (
            <ChevronDown
              className={`h-4 w-4 text-text-faint transition-transform duration-200 ${
                expanded === "submitted" ? "rotate-180" : ""
              }`}
            />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-text-faint" />
          )}
        </div>
        <div className="mt-3 text-3xl font-bold tracking-tight">
          {submittedCompanies.length}
        </div>
        <div className="mt-1 text-xs text-text-tertiary">
          Companies that sent data in the last 7 days
        </div>
        <AccordionPanel
          companies={submittedCompanies}
          isOpen={expanded === "submitted"}
        />
      </div>
    </div>
  );
}
