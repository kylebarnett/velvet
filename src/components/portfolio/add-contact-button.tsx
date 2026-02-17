"use client";

import * as React from "react";
import { AddContactModal } from "@/components/portfolio/add-contact-form";
import { Button } from "@/components/ui/button";

export function AddContactButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        data-onboarding="add-contact"
      >
        Add Contact
      </Button>
      <AddContactModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
