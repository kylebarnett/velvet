"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, ChevronDown } from "lucide-react";

type CompanySummary = { id: string; name: string; periods: string[] };

interface KpiTilesProps {
  portfolioCount: number;
  awaitingCompanies: CompanySummary[];
  submittedCompanies: CompanySummary[];
}

const MAX_VISIBLE = 8;

function AccordionPanel({
  companies,
  isOpen,
  label,
}: {
  companies: CompanySummary[];
  isOpen: boolean;
  label: string;
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
        <div className="rounded-xl border border-border-default bg-bg-secondary p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            {label}
          </div>
          {visible.map((c) => (
            <Link
              key={c.id}
              href={`/companies/${c.id}`}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-bg-elevated text-[10px] font-medium text-text-muted">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <span className="min-w-0 truncate">{c.name}</span>
              {c.periods.length > 0 && (
                <span className="ml-auto shrink-0 text-xs text-text-tertiary">
                  {c.periods.join(", ")}
                </span>
              )}
            </Link>
          ))}
          {hasMore && (
            <Link
              href="/metric-requests"
              className="mt-2 flex items-center justify-center rounded-lg px-2 py-1.5 text-xs font-medium text-text-tertiary transition-colors hover:bg-bg-elevated hover:text-text-secondary"
            >
              View all {companies.length} companies &rarr;
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

  const expandedCompanies =
    expanded === "awaiting"
      ? awaitingCompanies
      : expanded === "submitted"
        ? submittedCompanies
        : [];

  const expandedLabel =
    expanded === "awaiting"
      ? "Awaiting submission"
      : expanded === "submitted"
        ? "Submitted this week"
        : "";

  return (
    <div className="space-y-3">
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
          className={`rounded-xl kpi-gradient-amber p-5 transition-shadow duration-200 ${
            awaitingCompanies.length > 0
              ? "cursor-pointer card-hover-lift"
              : ""
          } ${expanded === "awaiting" ? "ring-2 ring-border-default" : ""}`}
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
        </div>

        {/* Submitted this week — expandable */}
        <div
          className={`rounded-xl kpi-gradient-emerald p-5 transition-shadow duration-200 ${
            submittedCompanies.length > 0
              ? "cursor-pointer card-hover-lift"
              : ""
          } ${expanded === "submitted" ? "ring-2 ring-border-default" : ""}`}
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
        </div>
      </div>

      {/* Accordion panel — renders below the tile grid */}
      <AccordionPanel
        companies={expandedCompanies}
        isOpen={expanded !== null}
        label={expandedLabel}
      />
    </div>
  );
}
