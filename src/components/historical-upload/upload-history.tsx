"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, Clock, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { HistoricalUpload } from "@/lib/excel/types";

export function UploadHistory({ role }: { role: "investor" | "founder" }) {
  const [uploads, setUploads] = useState<HistoricalUpload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/historical-upload/list?limit=20");
        if (res.ok) {
          const data = await res.json();
          setUploads(data.uploads ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (uploads.length === 0) return null;

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />;
      default:
        return <Clock className="h-4 w-4 text-amber-300" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const basePath = role === "investor" ? "/historical-upload" : "/portal/historical-upload";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-text-primary">Recent Uploads</h3>
      <div className="divide-y divide-border-default rounded-xl border border-border-default">
        {uploads.map((upload) => (
          <div
            key={upload.id}
            className="flex items-center gap-3 px-4 py-3"
          >
            <FileSpreadsheet className="h-5 w-5 shrink-0 text-text-tertiary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-text-primary">{upload.file_name}</p>
              <p className="text-xs text-text-tertiary">
                {formatDate(upload.created_at)}
                {upload.total_values_detected > 0 && (
                  <> · {upload.total_values_approved}/{upload.total_values_detected} approved</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {statusIcon(upload.status)}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  upload.status === "completed" && "bg-emerald-500/20 text-emerald-200",
                  upload.status === "failed" && "bg-red-500/20 text-red-200",
                  upload.status === "processing" && "bg-blue-500/20 text-blue-200",
                  (upload.status === "parsed" || upload.status === "reviewing") &&
                    "bg-amber-500/20 text-amber-200",
                )}
              >
                {upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
