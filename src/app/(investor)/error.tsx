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
        <p className="mt-2 text-sm text-white/60">
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
