"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { InvestmentFormModal } from "./investment-form-modal";

export type InvestmentRow = {
  id: string;
  fund_id: string;
  company_id: string;
  company_name: string;
  invested_amount: number;
  current_value: number;
  realized_value: number;
  investment_date: string | null;
  notes: string | null;
  updated_at: string;
};

type InvestmentTableProps = {
  fundId: string;
  investments: InvestmentRow[];
  companies: { id: string; name: string }[];
  currency: string;
  onRefresh: () => void;
};

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function InvestmentTable({
  fundId,
  investments,
  companies,
  currency,
  onRefresh,
}: InvestmentTableProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<InvestmentRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(investmentId: string) {
    setDeletingId(investmentId);
    try {
      const res = await fetch(
        `/api/investors/funds/${fundId}/investments/${investmentId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        onRefresh();
      }
    } catch {
      // Silently fail
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <h3 className="text-sm font-medium text-white/80">Investments</h3>
        <button
          onClick={() => setShowAdd(true)}
          className="flex h-8 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-medium text-black hover:bg-white/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Investment
        </button>
      </div>

      {investments.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-white/40">
          No investments yet. Add your first investment to start tracking performance.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wider text-white/40">
                <th className="px-4 py-2.5 font-medium">Company</th>
                <th className="px-4 py-2.5 font-medium text-right">Invested</th>
                <th className="px-4 py-2.5 font-medium text-right">Current Value</th>
                <th className="px-4 py-2.5 font-medium text-right">Realized</th>
                <th className="hidden px-4 py-2.5 font-medium text-right sm:table-cell">MOIC</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Date</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {investments.map((inv) => {
                const moic =
                  inv.invested_amount > 0
                    ? (inv.current_value + inv.realized_value) / inv.invested_amount
                    : null;

                return (
                  <tr
                    key={inv.id}
                    className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 font-medium">{inv.company_name}</td>
                    <td className="px-4 py-3 text-right text-white/70">
                      {formatCurrency(inv.invested_amount, currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-white/70">
                      {formatCurrency(inv.current_value, currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-white/70">
                      {formatCurrency(inv.realized_value, currency)}
                    </td>
                    <td
                      className={cn(
                        "hidden px-4 py-3 text-right font-medium sm:table-cell",
                        moic == null
                          ? "text-white/30"
                          : moic >= 1
                            ? "text-emerald-400"
                            : "text-red-400",
                      )}
                    >
                      {moic != null ? `${moic.toFixed(2)}x` : "-"}
                    </td>
                    <td className="hidden px-4 py-3 text-white/60 md:table-cell">
                      {formatDate(inv.investment_date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingInvestment(inv)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-white/40 hover:bg-white/5 hover:text-white"
                          title="Edit"
                          type="button"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          disabled={deletingId === inv.id}
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-white/40 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                          title="Delete"
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add modal */}
      <InvestmentFormModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => {
          setShowAdd(false);
          onRefresh();
        }}
        fundId={fundId}
        companies={companies}
        mode="create"
      />

      {/* Edit modal */}
      {editingInvestment && (
        <InvestmentFormModal
          open={true}
          onClose={() => setEditingInvestment(null)}
          onSaved={() => {
            setEditingInvestment(null);
            onRefresh();
          }}
          fundId={fundId}
          companies={companies}
          mode="edit"
          initialValues={{
            id: editingInvestment.id,
            company_id: editingInvestment.company_id,
            invested_amount: editingInvestment.invested_amount,
            current_value: editingInvestment.current_value,
            realized_value: editingInvestment.realized_value,
            investment_date: editingInvestment.investment_date,
            notes: editingInvestment.notes,
          }}
        />
      )}
    </div>
  );
}
