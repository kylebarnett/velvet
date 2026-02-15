import Link from "next/link";
import { Button } from "@/components/ui/button";

type CtaSectionProps = {
  title: string;
  subtitle?: string;
};

export function CtaSection({ title, subtitle }: CtaSectionProps) {
  return (
    <section className="bg-gradient-to-br from-accent/10 via-transparent to-accent/5">
      <div className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-text-primary">{title}</h2>
        {subtitle && (
          <p className="mt-4 text-lg text-text-secondary">{subtitle}</p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg">Get started</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">
              Login
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
