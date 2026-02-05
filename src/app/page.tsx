import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-20">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
            Velvet
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight">
            Performance metrics for investors and founders.
          </h1>
          <p className="max-w-2xl text-pretty text-base text-white/70">
            Collect monthly, quarterly, and annual metrics across your portfolio
            companies — with founder portals, dashboards, and document uploads.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-medium text-black hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50"
            href="/login"
          >
            Login
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-md border border-white/15 bg-transparent px-5 text-sm font-medium text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
            href="/signup"
          >
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
