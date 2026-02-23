"use client";

import * as React from "react";
import { ArrowUp, Paperclip, X } from "lucide-react";

import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MessageInputProps = {
  onSend: (content: string, file?: { url: string; name: string; size: number }) => void;
  onTyping: () => void;
  disabled?: boolean;
  conversationId: string;
};

type FilePreview = {
  file: File;
  url: string | null; // null while uploading
  name: string;
  size: number;
  uploading: boolean;
  error: string | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_CHARS = 4000;
const CHAR_WARNING_THRESHOLD = 3800;
const MAX_HEIGHT = 150;
const ACCEPTED_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.txt";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MessageInput({
  onSend,
  onTyping,
  disabled = false,
  conversationId,
}: MessageInputProps) {
  const [content, setContent] = React.useState("");
  const [filePreview, setFilePreview] = React.useState<FilePreview | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  React.useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea
  React.useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, MAX_HEIGHT) + "px";
  }, [content]);

  // Reset on conversation change
  React.useEffect(() => {
    setContent("");
    setFilePreview(null);
    textareaRef.current?.focus();
  }, [conversationId]);

  const charCount = content.length;
  const canSend =
    !disabled &&
    (content.trim().length > 0 || (filePreview && filePreview.url !== null)) &&
    charCount <= MAX_CHARS &&
    !(filePreview?.uploading);

  // ---- File upload ----

  async function uploadFile(file: File) {
    setFilePreview({
      file,
      url: null,
      name: file.name,
      size: file.size,
      uploading: true,
      error: null,
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", conversationId);

      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }

      const data = await res.json();
      setFilePreview((prev) =>
        prev
          ? { ...prev, url: data.url, uploading: false, error: null }
          : null,
      );
    } catch (err) {
      logger.error("File upload error:", err);
      setFilePreview((prev) =>
        prev
          ? {
              ...prev,
              uploading: false,
              error: err instanceof Error ? err.message : "Upload failed",
            }
          : null,
      );
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  function removeFile() {
    setFilePreview(null);
  }

  // ---- Send ----

  function handleSend() {
    if (!canSend) return;

    const fileData =
      filePreview && filePreview.url
        ? { url: filePreview.url, name: filePreview.name, size: filePreview.size }
        : undefined;

    onSend(content.trim(), fileData);
    setContent("");
    setFilePreview(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Re-focus
    textareaRef.current?.focus();
  }

  // ---- Key handling ----

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    if (val.length <= MAX_CHARS) {
      setContent(val);
    }
    onTyping();
  }

  // ---- Format file size ----

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  return (
    <div className="border-t border-border-default bg-bg-primary px-3 py-2">
      {/* File preview */}
      {filePreview && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-border-default bg-bg-elevated px-3 py-2">
          <Paperclip className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
          <span className="min-w-0 truncate text-sm text-text-primary">
            {filePreview.name}
          </span>
          <span className="shrink-0 text-xs text-text-muted">
            {formatFileSize(filePreview.size)}
          </span>

          {filePreview.uploading && (
            <span className="shrink-0 text-xs italic text-text-muted">
              Uploading...
            </span>
          )}

          {filePreview.error && (
            <span className="shrink-0 text-xs text-red-300">
              {filePreview.error}
            </span>
          )}

          <button
            type="button"
            onClick={removeFile}
            className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-bg-primary"
            aria-label="Remove file"
          >
            <X className="h-3.5 w-3.5 text-text-muted" />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || !!filePreview}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary disabled:opacity-60"
          aria-label="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelect}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        />

        {/* Textarea */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Type a message..."
            rows={1}
            className="w-full resize-none rounded-md border border-border-default bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)] disabled:opacity-60"
            style={{ maxHeight: MAX_HEIGHT }}
          />

          {/* Character counter */}
          {charCount > CHAR_WARNING_THRESHOLD && (
            <span
              className={`absolute bottom-1 right-2 text-[10px] ${
                charCount > MAX_CHARS ? "text-red-300" : "text-text-muted"
              }`}
            >
              {charCount}/{MAX_CHARS}
            </span>
          )}
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white text-black transition-colors hover:bg-white/90 disabled:opacity-60"
          aria-label="Send message"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
