import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link className="text-sm font-semibold tracking-tight" href="/">
          Velvet
        </Link>
        <div className="flex items-center gap-3 text-sm text-white/70">
          <Link className="hover:text-white" href="/signup">
            Sign up for free
          </Link>
          <Link
            className="rounded-md bg-white px-3 py-1.5 text-black hover:bg-white/90"
            href="/login"
          >
            Login
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl px-6 py-10">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}

