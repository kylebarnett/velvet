"use client";

import * as React from "react";
import { X, Upload } from "lucide-react";
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
  const [error, setError] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [documentType, setDocumentType] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [description, setDescription] = React.useState("");

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Upload document</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/40 hover:bg-white/5 hover:text-white/60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Document type <span className="text-red-400">*</span>
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
              <SelectContent>
                <SelectItem value="income_statement">
                  Income Statement
                </SelectItem>
                <SelectItem value="balance_sheet">Balance Sheet</SelectItem>
                <SelectItem value="cash_flow_statement">
                  Cash Flow Statement
                </SelectItem>
                <SelectItem value="consolidated_financial_statements">
                  Consolidated Financial Statements
                </SelectItem>
                <SelectItem value="409a_valuation">409A Valuation</SelectItem>
                <SelectItem value="investor_update">
                  Investor Update
                </SelectItem>
                <SelectItem value="board_deck">Board Deck</SelectItem>
                <SelectItem value="cap_table">Cap Table</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="modal-description">
              Description{" "}
              <span className="font-normal text-white/50">(optional)</span>
            </label>
            <textarea
              id="modal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Add context about this document..."
              className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-white/20"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">File</label>
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                isDragActive
                  ? "border-white/30 bg-white/5"
                  : "border-white/15 bg-black/20 hover:border-white/25"
              }`}
            >
              <input {...getInputProps()} />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <Upload className="h-5 w-5 text-white/50" />
                  <div className="text-left">
                    <div className="text-sm font-medium">{selectedFile.name}</div>
                    <div className="text-xs text-white/50">
                      {formatFileSize(selectedFile.size)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="rounded p-1 text-white/40 hover:text-white/60"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto h-8 w-8 text-white/30" />
                  <p className="mt-2 text-sm text-white/60">
                    Drag & drop a file here, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, CSV, TXT
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upload progress bar */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !documentType || !selectedFile}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
