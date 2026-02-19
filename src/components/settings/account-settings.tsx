"use client";

import * as React from "react";
import Image from "next/image";
import {
  Camera,
  Eye,
  EyeOff,
  Lock,
  User,
  Users,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { SlidingTabs, type TabItem } from "@/components/ui/sliding-tabs";
import { Button } from "@/components/ui/button";
import { TeamSettings } from "@/components/team/team-settings";

type AccountSettingsProps = {
  user: { fullName: string | null; email: string; avatarUrl: string | null };
  role: "investor" | "founder";
  currentUserId: string;
};

type SettingsTab = "profile" | "security" | "team";

const SETTINGS_TABS: TabItem<SettingsTab>[] = [
  { value: "profile", label: "Profile", icon: User },
  { value: "team", label: "Team", icon: Users },
  { value: "security", label: "Security", icon: Lock },
];

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

export function AccountSettings({ user, role, currentUserId }: AccountSettingsProps) {
  // --- Tab state ---
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("profile");

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
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [passwordSaving, setPasswordSaving] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(
    null,
  );

  // --- Dirty state tracking for beforeunload warning ---
  const isDirty =
    displayName !== (user.fullName ?? "") ||
    email !== user.email ||
    newPassword !== "" ||
    confirmPassword !== "";

  React.useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

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

      {/* Profile Hero */}
      <div className="card-surface rounded-xl border border-border-default p-6">
        <div className="flex items-center gap-5">
          {/* Avatar with hover overlay */}
          <div className="relative shrink-0">
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
              className="group relative h-20 w-20 overflow-hidden rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading || avatarRemoving}
              aria-label="Change profile picture"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile picture"
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bg-elevated">
                  <span className="text-xl font-medium text-text-secondary">
                    {getInitials(user.fullName, user.email)}
                  </span>
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {avatarUploading ? (
                  <Loader2
                    className="h-5 w-5 animate-spin text-white"
                    aria-hidden="true"
                  />
                ) : (
                  <Camera
                    className="h-5 w-5 text-white"
                    aria-hidden="true"
                  />
                )}
              </div>
            </button>
          </div>

          {/* Name + email + role */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h2 className="truncate text-lg font-semibold text-text-primary">
                {user.fullName || "Unnamed"}
              </h2>
              <span className="shrink-0 rounded-full bg-bg-elevated px-2.5 py-0.5 text-xs font-medium capitalize text-text-secondary">
                {role}
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm text-text-muted">
              {user.email}
            </p>

            {/* Photo action buttons (mobile-friendly) */}
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading || avatarRemoving}
                loading={avatarUploading}
              >
                {avatarUploading ? "Uploading..." : "Change photo"}
              </Button>
              {avatarUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAvatarRemove}
                  disabled={avatarUploading || avatarRemoving}
                  loading={avatarRemoving}
                >
                  {avatarRemoving ? "Removing..." : "Remove"}
                </Button>
              )}
            </div>
            <StatusMessage success={avatarSuccess} error={avatarError} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <SlidingTabs
        tabs={SETTINGS_TABS}
        value={activeTab}
        onChange={setActiveTab}
        variant="underline"
      />

      {/* Tab content */}
      <div key={activeTab} className="animate-fade-in">
        {activeTab === "profile" && (
          <div className="card-surface rounded-xl border border-border-default divide-y divide-border-subtle">
            {/* Display Name */}
            <div className="p-6">
              <h3 className="text-sm font-medium text-text-primary">
                Display Name
              </h3>
              <div className="mt-3 flex items-end gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    className={inputClasses}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    aria-label="Display name"
                  />
                </div>
                <Button
                  size="lg"
                  onClick={handleNameSave}
                  loading={nameSaving}
                >
                  {nameSaving ? "Saving..." : "Save"}
                </Button>
              </div>
              <div className="mt-2">
                <StatusMessage success={nameSuccess} error={nameError} />
              </div>
            </div>

            {/* Email Address */}
            <div className="p-6">
              <h3 className="text-sm font-medium text-text-primary">
                Email Address
              </h3>
              <div className="mt-3 flex items-end gap-3">
                <div className="flex-1">
                  <input
                    type="email"
                    className={inputClasses}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    aria-label="Email address"
                  />
                </div>
                <Button
                  size="lg"
                  onClick={handleEmailSave}
                  loading={emailSaving}
                >
                  {emailSaving ? "Updating..." : "Update"}
                </Button>
              </div>
              <p className="mt-2 text-xs text-text-muted">
                A confirmation link will be sent to your new email address.
              </p>
              <StatusMessage success={emailSuccess} error={emailError} />
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="card-surface rounded-xl border border-border-default p-6">
            <h3 className="text-sm font-medium text-text-primary">
              Change Password
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1.5 block text-sm text-text-secondary"
                >
                  New password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    className={`${inputClasses} pr-10`}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 flex h-11 w-10 items-center justify-center text-text-muted transition-colors hover:text-text-secondary"
                    onClick={() => setShowNewPassword((v) => !v)}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block text-sm text-text-secondary"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    className={`${inputClasses} pr-10`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 flex h-11 w-10 items-center justify-center text-text-muted transition-colors hover:text-text-secondary"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end">
              <Button
                size="lg"
                onClick={handlePasswordSave}
                loading={passwordSaving}
              >
                {passwordSaving ? "Updating..." : "Update password"}
              </Button>
            </div>
            <div className="mt-2">
              <StatusMessage
                success={passwordSuccess}
                error={passwordError}
              />
            </div>
          </div>
        )}

        {activeTab === "team" && (
          <TeamSettings currentUserId={currentUserId} />
        )}
      </div>

      {/* Danger Zone — always visible */}
      <div className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg-subtle)] p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--error-border)]">
            <AlertTriangle
              className="h-4 w-4 text-[var(--error-accent)]"
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-[var(--error-accent)]">
              Delete Account
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Permanently delete your account and all associated data. This
              action cannot be undone.
            </p>

            <div className="mt-4">
              {!showDeleteConfirm ? (
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete account
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-text-secondary">
                    Type{" "}
                    <span className="font-mono font-medium text-[var(--error-accent)]">
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
                    <Button
                      variant="danger"
                      size="md"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== "DELETE MY ACCOUNT"}
                      loading={deleteLoading}
                    >
                      {deleteLoading ? "Deleting..." : "Confirm deletion"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText("");
                        setDeleteError(null);
                      }}
                      disabled={deleteLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                  <StatusMessage success={null} error={deleteError} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
