"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type AccountSettingsProps = {
  user: { fullName: string | null; email: string; avatarUrl: string | null };
  role: "investor" | "founder";
};

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const inputClasses =
  "h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)]";

const primaryButtonClasses =
  "bg-white text-black hover:bg-white/90 rounded-md px-4 h-11 text-sm font-medium disabled:opacity-60 transition-colors";

const secondaryButtonClasses =
  "border border-border-default text-text-secondary hover:bg-bg-elevated rounded-md px-4 h-11 text-sm font-medium disabled:opacity-60 transition-colors";

const cardClasses = "rounded-xl border border-border-default bg-bg-secondary p-6";

function StatusMessage({
  success,
  error,
}: {
  success: string | null;
  error: string | null;
}) {
  if (success) {
    return <p className="text-xs text-emerald-400">{success}</p>;
  }
  if (error) {
    return <p className="text-xs text-red-300">{error}</p>;
  }
  return null;
}

export function AccountSettings({ user, role }: AccountSettingsProps) {
  // --- Profile Picture state ---
  const [avatarUrl, setAvatarUrl] = React.useState(user.avatarUrl);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const [avatarRemoving, setAvatarRemoving] = React.useState(false);
  const [avatarError, setAvatarError] = React.useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // --- Display Name state ---
  const [displayName, setDisplayName] = React.useState(user.fullName ?? "");
  const [nameSaving, setNameSaving] = React.useState(false);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = React.useState<string | null>(null);

  // --- Email state ---
  const [email, setEmail] = React.useState(user.email);
  const [emailSaving, setEmailSaving] = React.useState(false);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = React.useState<string | null>(null);

  // --- Password state ---
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordSaving, setPasswordSaving] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(
    null,
  );

  // --- Delete Account state ---
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // --- Profile Picture handlers ---
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";

    setAvatarError(null);
    setAvatarSuccess(null);

    // Client-side validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setAvatarError("Invalid file type. Allowed: PNG, JPG, WebP.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setAvatarError("File too large. Maximum size: 2MB.");
      return;
    }

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setAvatarError(data.error ?? "Failed to upload avatar.");
        return;
      }

      setAvatarUrl(data.avatarUrl);
      setAvatarSuccess("Profile picture updated.");
    } catch {
      setAvatarError("Failed to upload avatar. Please try again.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleAvatarRemove() {
    setAvatarError(null);
    setAvatarSuccess(null);
    setAvatarRemoving(true);

    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setAvatarError(data.error ?? "Failed to remove avatar.");
        return;
      }

      setAvatarUrl(null);
      setAvatarSuccess("Profile picture removed.");
    } catch {
      setAvatarError("Failed to remove avatar. Please try again.");
    } finally {
      setAvatarRemoving(false);
    }
  }

  // --- Display Name handler ---
  async function handleNameSave() {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setNameError("Name is required.");
      return;
    }

    setNameError(null);
    setNameSuccess(null);
    setNameSaving(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        setNameError(data.error ?? "Failed to update name.");
        return;
      }

      setNameSuccess("Display name updated.");
    } catch {
      setNameError("Failed to update name. Please try again.");
    } finally {
      setNameSaving(false);
    }
  }

  // --- Email handler ---
  async function handleEmailSave() {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("Email is required.");
      return;
    }

    setEmailError(null);
    setEmailSuccess(null);
    setEmailSaving(true);

    try {
      const res = await fetch("/api/user/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error ?? "Failed to update email.");
        return;
      }

      setEmailSuccess(
        data.message ?? "Confirmation email sent to your new address.",
      );
    } catch {
      setEmailError("Failed to update email. Please try again.");
    } finally {
      setEmailSaving(false);
    }
  }

  // --- Password handler ---
  async function handlePasswordSave() {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordSaving(true);

    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error ?? "Failed to update password.");
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password updated successfully.");
    } catch {
      setPasswordError("Failed to update password. Please try again.");
    } finally {
      setPasswordSaving(false);
    }
  }

  // --- Delete Account handler ---
  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE MY ACCOUNT") {
      setDeleteError('Please type "DELETE MY ACCOUNT" to confirm.');
      return;
    }

    setDeleteError(null);
    setDeleteLoading(true);

    try {
      const res = await fetch("/api/user/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE MY ACCOUNT" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? "Failed to delete account.");
        setDeleteLoading(false);
        return;
      }

      window.location.href = "/login";
    } catch {
      setDeleteError("Failed to delete account. Please try again.");
      setDeleteLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your profile, security, and preferences.
        </p>
      </div>

      {/* Section 1: Profile Picture */}
      <div className={cardClasses}>
        <h2 className="text-base font-medium text-text-primary">
          Profile Picture
        </h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Profile picture"
                width={96}
                height={96}
                className="h-24 w-24 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-bg-hover">
                <span className="text-2xl font-medium text-text-secondary">
                  {getInitials(user.fullName, user.email)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
              aria-label="Upload profile picture"
            />
            <button
              type="button"
              className={primaryButtonClasses}
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading || avatarRemoving}
            >
              {avatarUploading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Uploading...
                </span>
              ) : (
                "Upload photo"
              )}
            </button>
            {avatarUrl && (
              <button
                type="button"
                className={secondaryButtonClasses}
                onClick={handleAvatarRemove}
                disabled={avatarUploading || avatarRemoving}
              >
                {avatarRemoving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Removing...
                  </span>
                ) : (
                  "Remove"
                )}
              </button>
            )}
          </div>

          <StatusMessage success={avatarSuccess} error={avatarError} />
        </div>
      </div>

      {/* Section 2: Display Name */}
      <div className={cardClasses}>
        <h2 className="text-base font-medium text-text-primary">
          Display Name
        </h2>
        <div className="mt-4 space-y-4">
          <input
            type="text"
            className={inputClasses}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            aria-label="Display name"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={primaryButtonClasses}
              onClick={handleNameSave}
              disabled={nameSaving}
            >
              {nameSaving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving...
                </span>
              ) : (
                "Save"
              )}
            </button>
          </div>
          <StatusMessage success={nameSuccess} error={nameError} />
        </div>
      </div>

      {/* Section 3: Email Address */}
      <div className={cardClasses}>
        <h2 className="text-base font-medium text-text-primary">
          Email Address
        </h2>
        <div className="mt-4 space-y-4">
          <input
            type="email"
            className={inputClasses}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={primaryButtonClasses}
              onClick={handleEmailSave}
              disabled={emailSaving}
            >
              {emailSaving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Updating...
                </span>
              ) : (
                "Update email"
              )}
            </button>
          </div>
          <p className="text-xs text-text-muted">
            A confirmation link will be sent to your new email address.
          </p>
          <StatusMessage success={emailSuccess} error={emailError} />
        </div>
      </div>

      {/* Section 4: Password */}
      <div className={cardClasses}>
        <h2 className="text-base font-medium text-text-primary">
          Change Password
        </h2>
        <div className="mt-4 space-y-4">
          <div className="space-y-3">
            <div>
              <label
                htmlFor="new-password"
                className="mb-1.5 block text-sm text-text-secondary"
              >
                New password
              </label>
              <input
                id="new-password"
                type="password"
                className={inputClasses}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block text-sm text-text-secondary"
              >
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                className={inputClasses}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={primaryButtonClasses}
              onClick={handlePasswordSave}
              disabled={passwordSaving}
            >
              {passwordSaving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Updating...
                </span>
              ) : (
                "Update password"
              )}
            </button>
          </div>
          <StatusMessage success={passwordSuccess} error={passwordError} />
        </div>
      </div>

      {/* Section 5: Appearance */}
      <div className={cardClasses}>
        <h2 className="text-base font-medium text-text-primary">Appearance</h2>
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">
              Choose your preferred theme
            </p>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Section 6: Danger Zone */}
      <div className="rounded-xl border border-red-500/20 bg-bg-secondary p-6">
        <h2 className="text-base font-medium text-red-400">Delete Account</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>
        <div className="mt-4 space-y-4">
          {!showDeleteConfirm ? (
            <button
              type="button"
              className="rounded-md bg-red-500/20 px-4 h-11 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/30 disabled:opacity-60"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">
                Type{" "}
                <span className="font-mono font-medium text-red-300">
                  DELETE MY ACCOUNT
                </span>{" "}
                to confirm:
              </p>
              <input
                type="text"
                className={inputClasses}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                aria-label="Type DELETE MY ACCOUNT to confirm"
                autoComplete="off"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-md bg-red-500/20 px-4 h-11 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/30 disabled:opacity-60"
                  onClick={handleDeleteAccount}
                  disabled={
                    deleteLoading ||
                    deleteConfirmText !== "DELETE MY ACCOUNT"
                  }
                >
                  {deleteLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Deleting...
                    </span>
                  ) : (
                    "Confirm deletion"
                  )}
                </button>
                <button
                  type="button"
                  className={secondaryButtonClasses}
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                    setDeleteError(null);
                  }}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
              </div>
              <StatusMessage success={null} error={deleteError} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
