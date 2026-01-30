"use client";

import * as React from "react";
import { Camera, X } from "lucide-react";
import { getCompanyLogoUrl } from "@/lib/utils/logo";

type Props = {
  companyId: string;
  companyName: string;
  logoUrl: string | null;
  editable?: boolean;
  size?: "sm" | "md" | "lg";
  onLogoChange?: (newLogoUrl: string | null) => void;
};

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function CompanyLogo({
  companyId,
  companyName,
  logoUrl,
  editable = false,
  size = "md",
  onLogoChange,
}: Props) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [imgError, setImgError] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const displayUrl = getCompanyLogoUrl(logoUrl);
  const initial = companyName.charAt(0).toUpperCase();

  // Close menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  // Auto-dismiss error after 3 seconds
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function handleUpload(file: File) {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/investors/companies/${companyId}/logo`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to upload logo.");
      }

      setImgError(false);
      onLogoChange?.(json.logoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemove() {
    setIsUploading(true);
    setError(null);
    setShowMenu(false);

    try {
      const res = await fetch(`/api/investors/companies/${companyId}/logo`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to remove logo.");
      }

      setImgError(false);
      onLogoChange?.(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  }

  function handleClick() {
    if (!editable || isUploading) return;

    // If there's a custom logo, show menu with remove option
    if (logoUrl) {
      setShowMenu(true);
    } else {
      fileInputRef.current?.click();
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    if (!editable || !logoUrl) return;
    e.preventDefault();
    setShowMenu(true);
  }

  return (
    <div className="relative">
      <div
        role={editable ? "button" : undefined}
        tabIndex={editable ? 0 : undefined}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={(e) => {
          if (editable && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleClick();
          }
        }}
        className={`
          relative flex items-center justify-center overflow-hidden rounded-lg
          border border-white/10 bg-white/5
          ${sizeClasses[size]}
          ${editable ? "cursor-pointer group" : ""}
          ${isUploading ? "opacity-60" : ""}
        `}
        title={editable ? (logoUrl ? "Click to change logo" : "Click to upload logo") : companyName}
      >
        {displayUrl && !imgError ? (
          <img
            src={displayUrl}
            alt={companyName}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="font-medium text-white/60">{initial}</span>
        )}

        {/* Hover overlay for editable logos */}
        {editable && !isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-4 w-4 text-white/80" />
          </div>
        )}

        {/* Loading spinner */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Context menu for logo options */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute left-0 top-full z-50 mt-2 min-w-[140px] overflow-hidden rounded-lg border border-white/10 bg-zinc-900/95 shadow-xl backdrop-blur-sm"
        >
          <button
            onClick={() => {
              setShowMenu(false);
              fileInputRef.current?.click();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Camera className="h-4 w-4" />
            Change
          </button>
          <div className="mx-2 border-t border-white/10" />
          <button
            onClick={handleRemove}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <X className="h-4 w-4" />
            Remove
          </button>
        </div>
      )}

      {/* Error tooltip */}
      {error && (
        <div className="absolute left-0 top-full z-50 mt-1 whitespace-nowrap rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
