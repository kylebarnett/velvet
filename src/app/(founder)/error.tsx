"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-text-tertiary">
          An unexpected error occurred.
        </p>
        <button
          onClick={reset}
          className="mt-4 h-10 rounded-md bg-btn-primary-bg px-4 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
