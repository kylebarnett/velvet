"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const schema = z.object({
  company_name: z.string().min(1, "Company name is required."),
  company_website: z.string().optional(),
  first_name: z.string().min(1, "First name is required."),
  last_name: z.string().min(1, "Last name is required."),
  email: z.string().email("Valid email is required."),
  position: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (company: { id: string; name: string }) => void;
};

export function AddContactModal({ open, onClose, onSuccess }: Props) {
  const router = useRouter();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_name: "",
      company_website: "",
      first_name: "",
      last_name: "",
      email: "",
      position: "",
    },
  });

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  // Close on escape
  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Focus trap
  React.useEffect(() => {
    if (!open) return;
    function handleFocusTrap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleFocusTrap);
    return () => document.removeEventListener("keydown", handleFocusTrap);
  }, [open]);

  // Auto-focus first field on open
  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
      }, 0);
    }
  }, [open]);

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch("/api/investors/portfolio/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: [values] }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to add contact.");
      }

      if (json.errors && json.errors.length > 0) {
        throw new Error(json.errors[0].message);
      }

      if (onSuccess && json.companies?.length > 0) {
        onSuccess({ id: json.companies[0].id, name: json.companies[0].name });
        return;
      }

      toast.success("Contact added successfully.");
      onClose();
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const FieldError = ({ name }: { name: keyof FormValues }) => {
    const message = form.formState.errors[name]?.message;
    if (!message) return null;
    return <p className="text-xs text-[var(--status-error-text)]">{String(message)}</p>;
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-backdrop backdrop-blur-sm modal-backdrop-enter"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-4 w-full max-w-lg rounded-xl border border-border-default bg-bg-secondary p-6 shadow-2xl modal-dialog-enter"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-text-primary">Add Contact</h2>
            <p className="text-sm text-text-tertiary">
              Add a portfolio company and founder contact.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <form className="mt-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm text-text-secondary" htmlFor="company_name">
                Company name
              </label>
              <input
                id="company_name"
                className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none placeholder:text-text-faint focus:border-border-default"
                placeholder="Acme Inc."
                {...form.register("company_name")}
              />
              <FieldError name="company_name" />
            </div>

            <div className="grid gap-2">
              <label className="text-sm text-text-secondary" htmlFor="company_website">
                Company website <span className="text-text-muted">(optional)</span>
              </label>
              <input
                id="company_website"
                className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none placeholder:text-text-faint focus:border-border-default"
                placeholder="acme.com"
                {...form.register("company_website")}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm text-text-secondary" htmlFor="first_name">
                  First name
                </label>
                <input
                  id="first_name"
                  className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none placeholder:text-text-faint focus:border-border-default"
                  placeholder="John"
                  {...form.register("first_name")}
                />
                <FieldError name="first_name" />
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-text-secondary" htmlFor="last_name">
                  Last name
                </label>
                <input
                  id="last_name"
                  className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none placeholder:text-text-faint focus:border-border-default"
                  placeholder="Doe"
                  {...form.register("last_name")}
                />
                <FieldError name="last_name" />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm text-text-secondary" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none placeholder:text-text-faint focus:border-border-default"
                placeholder="john@acme.com"
                {...form.register("email")}
              />
              <FieldError name="email" />
            </div>

            <div className="grid gap-2">
              <label className="text-sm text-text-secondary" htmlFor="position">
                Position <span className="text-text-muted">(optional)</span>
              </label>
              <input
                id="position"
                className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none placeholder:text-text-faint focus:border-border-default"
                placeholder="CEO"
                {...form.register("position")}
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={form.formState.isSubmitting} type="submit">
              Add Contact
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
