import { cn } from "@/lib/utils/cn";

type HeroSectionProps = {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
  compact?: boolean;
  mock?: React.ReactNode;
};

export function HeroSection({
  title,
  subtitle,
  children,
  compact,
  mock,
}: HeroSectionProps) {
  return (
    <section
      className={cn(
        "bg-[radial-gradient(var(--border-default)_1px,transparent_1px)] bg-[size:24px_24px]",
        compact ? "py-16" : "py-24 md:py-32",
      )}
    >
      <div className="mx-auto max-w-6xl px-6">
        <h1
          className={cn(
            "font-bold tracking-tight text-text-primary",
            compact
              ? "text-3xl md:text-4xl"
              : "text-4xl md:text-5xl lg:text-6xl",
          )}
        >
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-text-secondary">
          {subtitle}
        </p>
        {children && (
          <div className="mt-8 flex flex-wrap gap-4">{children}</div>
        )}
        {mock && <div className="mt-12">{mock}</div>}
      </div>
    </section>
  );
}
