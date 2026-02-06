"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Landmark } from "lucide-react";

import { FundCard } from "./fund-card";
import { FundFormModal } from "./fund-form-modal";

type Fund = {
  id: string;
  name: string;
  vintage_year: number;
  fund_size: number | null;
  currency: string;
};

type LPReportsClientProps = {
  funds: Fund[];
  companies: { id: string; name: string }[];
};

export function LPReportsClient({ funds: initialFunds }: LPReportsClientProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Funds</h1>
          <p className="mt-0.5 text-sm text-white/60">
            Manage funds, track performance, and generate LP reports.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90"
        >
          <Plus className="h-4 w-4" />
          Create Fund
        </button>
      </div>

      {/* Fund list */}
      {initialFunds.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-16 text-center">
          <Landmark className="h-10 w-10 text-white/20" />
          <h3 className="mt-4 text-sm font-medium text-white/70">No funds yet</h3>
          <p className="mt-1 max-w-sm text-sm text-white/40">
            Create your first fund to start tracking portfolio performance and generating LP reports.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 flex h-9 items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90"
          >
            <Plus className="h-4 w-4" />
            Create Fund
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initialFunds.map((fund) => (
            <FundCard
              key={fund.id}
              fund={{
                id: fund.id,
                name: fund.name,
                vintage_year: fund.vintage_year,
                fund_size: fund.fund_size ? Number(fund.fund_size) : null,
                currency: (fund.currency as string) ?? "USD",
              }}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <FundFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={() => {
          setShowCreate(false);
          router.refresh();
        }}
        mode="create"
      />
    </div>
  );
}
