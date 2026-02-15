"use client";

import { cn } from "@/lib/utils/cn";
import { AnimatedSection } from "./animated-section";

type Step = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

type HowItWorksProps = {
  steps: Step[];
};

export function HowItWorks({ steps }: HowItWorksProps) {
  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-0">
      {steps.map((step, index) => (
        <AnimatedSection key={step.title} delay={index * 0.15}>
          <div className="relative flex flex-col items-center text-center">
            {/* Connecting line between steps */}
            {index < steps.length - 1 && (
              <div
                className="pointer-events-none absolute left-[calc(50%+28px)] top-6 hidden w-[calc(100%-56px)] border-t border-dashed border-border-default md:block"
                aria-hidden="true"
              />
            )}

            {/* Step number circle */}
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-accent text-lg font-bold text-accent">
              {index + 1}
            </div>

            {/* Icon */}
            <div className="mt-4 text-text-secondary">{step.icon}</div>

            {/* Title */}
            <h3 className="mt-3 text-base font-semibold text-text-primary">
              {step.title}
            </h3>

            {/* Description */}
            <p className="mt-2 max-w-[200px] text-sm leading-relaxed text-text-secondary">
              {step.description}
            </p>
          </div>
        </AnimatedSection>
      ))}
    </div>
  );
}
