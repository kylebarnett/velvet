import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <p className="text-5xl font-bold text-text-faint">404</p>
        <h1 className="mt-3 text-lg font-semibold text-text-primary">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-text-tertiary">
          This page doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/portal"
          className="mt-5 inline-flex h-10 items-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
