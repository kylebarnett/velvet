import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
        <Link className="text-base font-bold tracking-tight" href="/">
          PostSig
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 text-sm text-text-secondary">
          <Link className="hidden sm:block hover:text-text-primary" href="/signup">
            Sign up for free
          </Link>
          <Link
            className="rounded-lg bg-btn-primary-bg px-3 py-1.5 text-btn-primary-text hover:bg-btn-primary-hover"
            href="/login"
          >
            Login
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}

