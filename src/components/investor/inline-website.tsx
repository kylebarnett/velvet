"use client";

import * as React from "react";
import { ExternalLink, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  companyId: string;
  website: string | null;
};

export function InlineWebsite({ companyId, website: initialWebsite }: Props) {
  const [website, setWebsite] = React.useState(initialWebsite);
  const [isEditing, setIsEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(website ?? "");
  const [saving, setSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function handleStartEdit() {
    setInputValue(website ?? "");
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    setInputValue(website ?? "");
  }

  async function handleSave() {
    const trimmed = inputValue.trim();
    const newValue = trimmed || null;

    if (newValue === website) {
      setIsEditing(false);
      return;
    }

    // Optimistic update
    const previousValue = website;
    setWebsite(newValue);
    setIsEditing(false);
    setSaving(true);

    try {
      const res = await fetch(`/api/investors/companies/${companyId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: newValue }),
      });

      if (!res.ok) {
        // Rollback on error
        setWebsite(previousValue);
      }
    } catch {
      // Rollback on error
      setWebsite(previousValue);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  }

  function getDisplayUrl(url: string): string {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  function getFullUrl(url: string): string {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `https://${url}`;
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Small delay to allow button clicks to register
            setTimeout(() => {
              if (isEditing) handleCancel();
            }, 150);
          }}
          placeholder="example.com"
          className="h-7 w-48 rounded-md border border-border-default bg-bg-input px-2 text-sm text-text-primary placeholder:text-text-faint focus:border-border-default focus:outline-none"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleSave}
          className="bg-[var(--success-bg-muted)] text-[var(--success-accent)] hover:bg-[var(--success-bg-muted-hover)]"
          aria-label="Save"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleCancel}
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  if (website) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={getFullUrl(website)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary hover:underline"
        >
          {getDisplayUrl(website)}
          <ExternalLink className="h-3 w-3" />
        </a>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStartEdit}
          disabled={saving}
          className="px-1 text-xs text-text-faint hover:text-text-tertiary"
        >
          edit
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleStartEdit}
      disabled={saving}
      className="gap-1 text-text-muted hover:text-text-tertiary"
    >
      <Plus className="h-3.5 w-3.5" />
      Add website
    </Button>
  );
}
