import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-bg-primary text-text-primary">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-20">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-elevated px-3 py-1 text-xs text-text-secondary">
            Velvet
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight">
            Performance metrics for investors and founders.
          </h1>
          <p className="max-w-2xl text-pretty text-base text-text-secondary">
            Collect monthly, quarterly, and annual metrics across your portfolio
            companies — with founder portals, dashboards, and document uploads.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-md bg-btn-primary-bg px-5 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
            href="/login"
          >
            Login
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-md border border-border-default bg-transparent px-5 text-sm font-medium text-text-primary hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
            href="/signup"
          >
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
