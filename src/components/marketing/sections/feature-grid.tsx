import { cn } from "@/lib/utils/cn";
import { AnimatedSection } from "./animated-section";
import { FeatureCard } from "../ui/feature-card";

type Feature = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

type FeatureGridProps = {
  features: Feature[];
  className?: string;
};

export function FeatureGrid({ features, className }: FeatureGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {features.map((feature, index) => (
        <AnimatedSection key={feature.title} delay={index * 0.1}>
          <FeatureCard
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
          />
        </AnimatedSection>
      ))}
    </div>
  );
}
