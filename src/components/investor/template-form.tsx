"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TemplateItem = {
  metric_name: string;
  period_type: "monthly" | "quarterly" | "annual";
  data_type: string;
  sort_order: number;
};

type Props = {
  mode: "create" | "edit";
  templateId?: string;
  initialName?: string;
  initialDescription?: string;
  initialItems?: TemplateItem[];
};

export function TemplateForm({
  mode,
  templateId,
  initialName = "",
  initialDescription = "",
  initialItems = [{ metric_name: "", period_type: "monthly", data_type: "number", sort_order: 0 }],
}: Props) {
  const router = useRouter();
  const [name, setName] = React.useState(initialName);
  const [description, setDescription] = React.useState(initialDescription);
  const [items, setItems] = React.useState<TemplateItem[]>(initialItems);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  function addItem() {
    setItems([
      ...items,
      { metric_name: "", period_type: "monthly", data_type: "number", sort_order: items.length },
    ]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof TemplateItem, value: string) {
    setItems(
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (items.some((i) => !i.metric_name.trim())) return;

    setSaving(true);
    setError(null);

    try {
      const url =
        mode === "edit"
          ? `/api/investors/metric-templates/${templateId}`
          : "/api/investors/metric-templates";

      const res = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          items: items.map((item, i) => ({
            metric_name: item.metric_name.trim(),
            period_type: item.period_type,
            data_type: item.data_type,
            sort_order: i,
          })),
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to save.");

      // Always go back to templates list after save
      router.push("/templates");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="max-w-2xl space-y-6"
      onSubmit={handleSubmit}
    >
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="grid gap-2">
          <label className="text-sm text-white/70" htmlFor="templateName">
            Template name
          </label>
          <input
            id="templateName"
            className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
            placeholder="e.g. SaaS Metrics"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-white/70" htmlFor="templateDesc">
            Description (optional)
          </label>
          <textarea
            id="templateDesc"
            className="min-h-16 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
            placeholder="What metrics this template tracks..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Metrics</span>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-xs font-medium text-white hover:bg-white/10"
          >
            <Plus className="h-3.5 w-3.5" />
            Add metric
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1 grid gap-2 md:grid-cols-2">
                <input
                  className="h-10 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
                  placeholder="Metric name (e.g. MRR)"
                  value={item.metric_name}
                  onChange={(e) => updateItem(index, "metric_name", e.target.value)}
                  required
                />
                <Select
                  value={item.period_type}
                  onValueChange={(v) => updateItem(index, "period_type", v)}
                >
                  <SelectTrigger size="sm" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={items.length <= 1}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-30"
                title="Remove metric"
              >
                <Trash2 className="h-4 w-4 text-red-400/60" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
        >
          {saving
            ? "Saving..."
            : mode === "edit"
              ? "Update template"
              : "Create template"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/templates")}
          className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 text-sm text-white hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
