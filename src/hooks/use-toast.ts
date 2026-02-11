"use client";

import * as React from "react";

/**
 * Manages transient error/success messages with auto-dismiss.
 * Success messages auto-dismiss after `duration` ms. Errors persist until cleared.
 */
export function useToast(duration = 4000) {
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), duration);
      return () => clearTimeout(timer);
    }
  }, [success, duration]);

  function clearAll() {
    setError(null);
    setSuccess(null);
  }

  return { error, success, setError, setSuccess, clearAll };
}
