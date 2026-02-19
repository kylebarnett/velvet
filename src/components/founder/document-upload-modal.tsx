"use client";

import * as React from "react";
import { X, Upload } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useDropzone } from "react-dropzone";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DocumentUploadModalProps = {
  companyId: string;
  onClose: () => void;
  onSuccess: () => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUploadModal({
  companyId,
  onClose,
  onSuccess,
}: DocumentUploadModalProps) {
  const titleId = React.useId();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);
  const [error, setError] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [documentType, setDocumentType] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [description, setDescription] = React.useState("");

  // Period selector state
  const currentYear = new Date().getFullYear();
  const currentQ = Math.ceil((new Date().getMonth() + 1) / 3);
  const [periodQuarter, setPeriodQuarter] = React.useState(`Q${currentQ}`);
  const [periodYear, setPeriodYear] = React.useState(String(currentYear));
  const periodLabel = `${periodQuarter} ${periodYear}`;
  const yearOptions = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
        setError(null);
      }
    },
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
      "text/plain": [".txt"],
    },
    multiple: false,
  });

  // Close on Escape
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFile || !documentType) return;

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("companyId", companyId);
    formData.append("documentType", documentType);
    formData.append("periodLabel", periodLabel);
    if (description.trim()) formData.append("description", description.trim());

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/documents/upload");

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            let msg = "Upload failed.";
            try {
              const json = JSON.parse(xhr.responseText);
              if (json?.error) msg = json.error;
            } catch {
              // ignore parse error
            }
            reject(new Error(msg));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Upload failed.")));
        xhr.send(formData);
      });

      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-backdrop backdrop-blur-sm modal-backdrop-enter">
      <div ref={dialogRef} className="w-full max-w-lg rounded-xl border border-border-default bg-bg-secondary p-6 modal-dialog-enter" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="flex items-center justify-between">
          <h3 id={titleId} className="text-lg font-medium">Upload document</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-tertiary"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Document type <span className="text-[var(--error-accent)]">*</span>
            </label>
            <input type="hidden" name="documentType" value={documentType} />
            <Select
              value={documentType || "__none__"}
              onValueChange={(v) =>
                setDocumentType(v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent portal={false} className="[&_[role=option]]:py-2.5 [&_[role=option]]:pr-4">
                <SelectItem value="income_statement">Income Statement</SelectItem>
                <SelectItem value="balance_sheet">Balance Sheet</SelectItem>
                <SelectItem value="cash_flow_statement">Cash Flow Statement</SelectItem>
                <SelectItem value="consolidated_financial_statements">Consolidated Financial Statements</SelectItem>
                <SelectItem value="409a_valuation">409A Valuation</SelectItem>
                <SelectItem value="investor_update">Investor Update</SelectItem>
                <SelectItem value="board_deck">Board Deck</SelectItem>
                <SelectItem value="cap_table">Cap Table</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Time period <span className="text-[var(--error-accent)]">*</span>
            </label>
            <div className="flex gap-2">
              <Select value={periodQuarter} onValueChange={setPeriodQuarter}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portal={false}>
                  <SelectItem value="Q1">Q1</SelectItem>
                  <SelectItem value="Q2">Q2</SelectItem>
                  <SelectItem value="Q3">Q3</SelectItem>
                  <SelectItem value="Q4">Q4</SelectItem>
                </SelectContent>
              </Select>
              <Select value={periodYear} onValueChange={setPeriodYear}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portal={false}>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="modal-description">
              Description{" "}
              <span className="font-normal text-text-tertiary">(optional)</span>
            </label>
            <textarea
              id="modal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Add context about this document..."
              className="rounded-md border border-border-default bg-bg-input px-3 py-2 text-sm outline-none placeholder:text-text-faint focus:border-border-default"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">File</label>
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                isDragActive
                  ? "border-border-default bg-bg-elevated"
                  : "border-border-default bg-bg-input hover:border-border-default"
              }`}
            >
              <input {...getInputProps()} />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <Upload className="h-5 w-5 text-text-muted" />
                  <div className="text-left">
                    <div className="text-sm font-medium">{selectedFile.name}</div>
                    <div className="text-xs text-text-tertiary">
                      {formatFileSize(selectedFile.size)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="rounded p-1 text-text-muted hover:text-text-tertiary"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto h-8 w-8 text-text-faint" />
                  <p className="mt-2 text-sm text-text-tertiary">
                    Drag & drop a file here, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, CSV, TXT
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upload progress bar */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-text-tertiary">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-hover">
                <div
                  className="h-full rounded-full bg-btn-primary-bg transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border-default bg-bg-elevated px-4 py-2 text-sm hover:bg-bg-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !documentType || !selectedFile}
              className="rounded-lg bg-btn-primary-bg px-4 py-2 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
