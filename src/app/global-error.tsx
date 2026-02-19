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
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>
              Something went wrong
            </h2>
            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#999" }}>
              An unexpected error occurred.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: "1rem",
                height: "2.5rem",
                borderRadius: "0.375rem",
                backgroundColor: "#fff",
                padding: "0 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#000",
                border: "none",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
