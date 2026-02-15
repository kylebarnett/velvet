"use client";

import { cn } from "@/lib/utils/cn";

type GlowColor = "accent" | "success" | "info";

type GlowEffectProps = {
  children: React.ReactNode;
  className?: string;
  color?: GlowColor;
};

const colorMap: Record<GlowColor, string> = {
  accent: "var(--accent)",
  success: "var(--success-accent)",
  info: "var(--info-accent)",
};

export function GlowEffect({
  children,
  className,
  color = "accent",
}: GlowEffectProps) {
  const glowColor = colorMap[color];

  return (
    <div className={cn("relative", className)}>
      <div
        className="absolute inset-0 -z-10 blur-3xl opacity-20"
        style={{
          background: `radial-gradient(ellipse at center, ${glowColor}, transparent 70%)`,
        }}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
