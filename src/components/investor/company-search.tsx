"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

type CompanySearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function CompanySearch({
  value,
  onChange,
  placeholder = "Search companies...",
}: CompanySearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border-subtle bg-bg-input pl-10 pr-10 text-sm placeholder:text-text-faint focus:border-border-default focus:outline-none focus:ring-1 focus:ring-[var(--ring-focus)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
