"use client";

import { cn } from "@/lib/utils/cn";

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
};

export function FeatureCard({
  icon,
  title,
  description,
  className,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        "card-surface card-hover-lift rounded-xl border border-border-default p-6",
        className,
      )}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-subtle text-accent">
        {icon}
      </div>
      <h3 className="mb-2 text-base font-semibold text-text-primary">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}
