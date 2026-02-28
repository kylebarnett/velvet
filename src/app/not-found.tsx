import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found | PostSig",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-text-faint">404</p>
        <h1 className="mt-4 text-xl font-semibold text-text-primary">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-text-tertiary">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
