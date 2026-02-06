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
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-white/[0.08] bg-black/20 pl-10 pr-10 text-sm placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
