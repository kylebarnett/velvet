import { cn } from "@/lib/utils/cn";

type GradientTextProps = {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "span";
};

export function GradientText({
  children,
  className,
  as: Tag = "span",
}: GradientTextProps) {
  return (
    <Tag
      className={cn(
        "bg-gradient-to-r from-[var(--text-primary)] via-[var(--accent)] to-[var(--accent-text)] bg-clip-text text-transparent",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
