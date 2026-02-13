"use client";

import * as React from "react";
import { AddContactModal } from "@/components/portfolio/add-contact-form";

export function AddContactButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-elevated px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
        data-onboarding="add-contact"
      >
        Add Contact
      </button>
      <AddContactModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
