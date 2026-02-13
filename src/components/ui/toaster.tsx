"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        className: "!border-border-default !bg-bg-secondary !text-text-primary !shadow-xl",
        descriptionClassName: "!text-text-secondary",
      }}
      style={
        {
          "--success-bg": "var(--status-success-bg)",
          "--success-text": "var(--status-success-text)",
          "--success-border": "var(--success-border)",
          "--error-bg": "var(--status-error-bg)",
          "--error-text": "var(--status-error-text)",
          "--error-border": "var(--error-border)",
        } as React.CSSProperties
      }
    />
  );
}
