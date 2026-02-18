"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { MAX_FILE_SIZE } from "@/lib/excel/types";
import { CompanyMappingStep } from "./company-mapping-step";
import { ReviewTable } from "./review-table";

type WizardStep = "upload" | "map-companies" | "review" | "complete";

type DetectedCompany = {
  name: string;
  source: string;
  sheetName?: string;
};

type UploadResult = {
  uploadId: string;
  totalValues: number;
  companiesDetected: DetectedCompany[];
  conflicts: number;
  aiProvider: string;
  parsingTimeMs: number;
};

type CompletionStats = {
  approved: number;
  rejected: number;
  skipped: number;
};

type ResumableUpload = {
  id: string;
  file_name: string;
  total_values_detected: number;
  companies_detected: DetectedCompany[] | null;
};

type UploadWizardProps = {
  role: "investor" | "founder";
  preSelectedCompany?: { id: string; name: string };
  resumeUploadOverride?: ResumableUpload;
  onResumeHandled?: () => void;
};

export function UploadWizard({ role, preSelectedCompany, resumeUploadOverride, onResumeHandled }: UploadWizardProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<WizardStep>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [completionStats, setCompletionStats] = useState<CompletionStats | null>(null);
  const [resumableUpload, setResumableUpload] = useState<ResumableUpload | null>(null);

  // Prevent accidental navigation during upload
  useEffect(() => {
    if (!uploading) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [uploading]);

  // Check for resumable in-progress uploads
  useEffect(() => {
    async function checkResumable() {
      try {
        const res = await fetch("/api/historical-upload/list?status=reviewing&limit=1");
        if (res.ok) {
          const data = await res.json();
          if (data.uploads?.length > 0) {
            setResumableUpload(data.uploads[0]);
          }
        }
      } catch {
        // Non-critical, ignore
      }
    }
    checkResumable();
  }, []);

  // Resume from parent component (e.g. clicking a row in upload history)
  useEffect(() => {
    if (resumeUploadOverride) {
      handleResume(resumeUploadOverride);
      onResumeHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeUploadOverride]);

  function handleResume(upload: ResumableUpload) {
    setUploadResult({
      uploadId: upload.id,
      totalValues: upload.total_values_detected,
      companiesDetected: upload.companies_detected ?? [],
      conflicts: 0,
      aiProvider: "",
      parsingTimeMs: 0,
    });
    setStep("review");
    setResumableUpload(null);
  }

  const handleFiles = useCallback((files: FileList | null) => {
    setError(null);
    if (!files || files.length === 0) return;
    const f = files[0];

    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (!allowed.includes(f.type) && !f.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError("Invalid file type. Only .xlsx, .xls, and .csv files are accepted.");
      return;
    }

    if (f.size > MAX_FILE_SIZE) {
      setError("File too large. Maximum size is 100MB.");
      return;
    }

    if (f.size === 0) {
      setError("File is empty.");
      return;
    }

    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Use XMLHttpRequest for upload progress
      const result = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/historical-upload");

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 50));
          }
        };

        xhr.onload = () => {
          setUploadProgress(100);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.error) {
                reject(new Error(data.error));
              } else {
                resolve(data);
              }
            } catch {
              reject(new Error("Invalid server response."));
            }
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.error || "Upload failed."));
            } catch {
              reject(new Error("Upload failed."));
            }
          }
        };

        xhr.onerror = () => reject(new Error("Network error. Please try again."));
        xhr.send(formData);

        // Simulate parsing progress after upload completes
        xhr.upload.onloadend = () => {
          setUploadProgress(60);
          const interval = setInterval(() => {
            setUploadProgress((prev) => {
              if (prev >= 95) {
                clearInterval(interval);
                return prev;
              }
              return prev + 5;
            });
          }, 500);
        };
      });

      setUploadResult(result);

      // Decide next step
      if (result.totalValues === 0) {
        setError("No metrics were detected in this file. Please check the file format and try again.");
        setUploading(false);
        return;
      }

      if (preSelectedCompany) {
        // Auto-map all detected companies to the pre-selected one, then skip to review
        try {
          const mappings = result.companiesDetected.map((c) => ({
            detectedName: c.name,
            companyId: preSelectedCompany.id,
          }));
          if (mappings.length > 0) {
            await fetch(`/api/historical-upload/${result.uploadId}/company-mapping`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mappings }),
            });
          }
        } catch {
          // Non-critical — mapping can be done in review
        }
        setStep("review");
      } else if (role === "investor" && result.companiesDetected.length > 0) {
        setStep("map-companies");
      } else {
        setStep("review");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleMappingComplete = () => {
    setStep("review");
  };

  const handleReviewComplete = (stats: CompletionStats) => {
    setCompletionStats(stats);
    setStep("complete");
  };

  const handleReset = () => {
    setFile(null);
    setUploadResult(null);
    setCompletionStats(null);
    setError(null);
    setStep("upload");
  };

  const steps = role === "investor"
    ? ["Upload File", "Map Companies", "Review & Approve", "Complete"]
    : ["Upload File", "Review & Approve", "Complete"];

  const currentStepIndex = step === "upload" ? 0
    : step === "map-companies" ? 1
    : step === "review" ? (role === "investor" ? 2 : 1)
    : role === "investor" ? 3 : 2;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <nav aria-label="Upload progress" className="flex items-center gap-2">
        {steps.map((label, i) => (
          <React.Fragment key={label}>
            {i > 0 && (
              <div
                className={cn(
                  "h-px flex-1",
                  i <= currentStepIndex ? "bg-border-emphasis" : "bg-border-default",
                )}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                  i < currentStepIndex
                    ? "bg-[var(--success-bg-muted)] text-[var(--success-accent)]"
                    : i === currentStepIndex
                      ? "bg-bg-elevated text-text-primary"
                      : "bg-bg-tertiary text-text-tertiary",
                )}
              >
                {i < currentStepIndex ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "hidden text-sm sm:inline",
                  i === currentStepIndex
                    ? "text-text-primary font-medium"
                    : "text-text-tertiary",
                )}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        ))}
      </nav>

      {/* Pre-selected company banner */}
      {preSelectedCompany && step !== "complete" && (
        <div className="rounded-lg border border-[var(--status-info-bg)] bg-[var(--status-info-bg)] px-4 py-3">
          <p className="text-sm text-[var(--status-info-text)]">
            Uploading metrics for <span className="font-medium">{preSelectedCompany.name}</span>
          </p>
        </div>
      )}

      {/* Step content */}
      {step === "upload" && (
        <div className="space-y-4">
          {/* Resume banner */}
          {resumableUpload && (
            <div className="flex items-center justify-between rounded-lg border border-[var(--status-info-bg)] bg-[var(--status-info-bg)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--status-info-text)]">Resume previous upload</p>
                <p className="text-xs text-[var(--status-info-text)]/70">
                  {resumableUpload.file_name} — {resumableUpload.total_values_detected} values detected
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setResumableUpload(null)}
                  className="rounded-md px-2 py-1 text-xs text-[var(--status-info-text)]/70 hover:bg-bg-hover"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => handleResume(resumableUpload)}
                  className="rounded-md bg-btn-primary-bg px-3 py-1.5 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
                >
                  Resume
                </button>
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors",
              dragOver
                ? "border-border-emphasis bg-bg-raised"
                : "border-border-default hover:border-border-emphasis hover:bg-bg-secondary",
              uploading && "pointer-events-none opacity-60",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            {file ? (
              <>
                <FileSpreadsheet className="mb-3 h-10 w-10 text-[var(--success-accent)]" />
                <p className="text-sm font-medium text-text-primary">{file.name}</p>
                <p className="mt-1 text-xs text-text-secondary">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </>
            ) : (
              <>
                <Upload className="mb-3 h-10 w-10 text-text-tertiary" />
                <p className="text-sm font-medium text-text-primary">
                  Drop your file here, or click to browse
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  Supports .xlsx, .xls, and .csv files (up to 100MB)
                </p>
              </>
            )}
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploadProgress < 50
                  ? "Uploading..."
                  : uploadProgress < 90
                    ? "Analyzing spreadsheet with AI..."
                    : "Finalizing..."}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-bg-tertiary">
                <div
                  className="h-full rounded-full bg-btn-primary-bg/30 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--error-border)] bg-[var(--error-bg-subtle)] p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--error-accent)]" />
              <p className="text-sm text-[var(--status-error-text)]">{error}</p>
            </div>
          )}

          {/* Upload button */}
          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="rounded-md bg-btn-primary-bg px-4 py-2 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60"
            >
              {uploading ? "Processing..." : "Upload & Analyze"}
            </button>
            {file && !uploading && (
              <button
                onClick={() => { setFile(null); setError(null); }}
                className="rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary"
              >
                Clear
              </button>
            )}
          </div>

          {/* Info text */}
          <p className="text-xs text-text-tertiary">
            Your file will be analyzed by AI to detect metrics, time periods, and company names.
            You&apos;ll review all detected values before anything is saved.
          </p>
        </div>
      )}

      {step === "map-companies" && uploadResult && (
        <CompanyMappingStep
          uploadId={uploadResult.uploadId}
          companiesDetected={uploadResult.companiesDetected}
          onComplete={handleMappingComplete}
          onBack={() => setStep("upload")}
        />
      )}

      {step === "review" && uploadResult && (
        <ReviewTable
          uploadId={uploadResult.uploadId}
          role={role}
          totalValues={uploadResult.totalValues}
          onComplete={handleReviewComplete}
          onBack={() => setStep(role === "investor" ? "map-companies" : "upload")}
        />
      )}

      {step === "complete" && completionStats && (
        <div className="flex flex-col items-center py-12 text-center">
          <CheckCircle2 className="mb-4 h-12 w-12 text-[var(--success-accent)]" />
          <h2 className="text-lg font-semibold text-text-primary">Upload Complete</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Your historical metrics have been processed.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
              <p className="text-2xl font-bold text-[var(--success-accent)]">{completionStats.approved}</p>
              <p className="text-xs text-text-secondary">Approved</p>
            </div>
            <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
              <p className="text-2xl font-bold text-[var(--error-accent)]">{completionStats.rejected}</p>
              <p className="text-xs text-text-secondary">Rejected</p>
            </div>
            <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
              <p className="text-2xl font-bold text-text-tertiary">{completionStats.skipped}</p>
              <p className="text-xs text-text-secondary">Skipped</p>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            {preSelectedCompany ? (
              <button
                onClick={() => router.push(`/companies/${preSelectedCompany.id}`)}
                className="rounded-md bg-btn-primary-bg px-4 py-2 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
              >
                View {preSelectedCompany.name}
              </button>
            ) : role === "investor" ? (
              <button
                onClick={() => router.push("/reports")}
                className="rounded-md bg-btn-primary-bg px-4 py-2 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
              >
                View Reports
              </button>
            ) : (
              <button
                onClick={() => router.push("/portal")}
                className="rounded-md bg-btn-primary-bg px-4 py-2 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
              >
                Go to Dashboard
              </button>
            )}
            <button
              onClick={handleReset}
              className="rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary"
            >
              Upload Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
