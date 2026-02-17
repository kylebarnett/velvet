import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
        <Link className="text-base font-bold tracking-tight" href="/">
          Velvet
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 text-sm text-text-secondary">
          <Link className="hidden sm:block hover:text-text-primary" href="/signup">
            Sign up for free
          </Link>
          <ButtonLink href="/login" size="sm">
            Login
          </ButtonLink>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}

