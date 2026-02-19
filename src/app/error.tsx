"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-text-primary">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-text-tertiary">
          An unexpected error occurred.
        </p>
        <button
          onClick={reset}
          className="mt-4 h-10 rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
