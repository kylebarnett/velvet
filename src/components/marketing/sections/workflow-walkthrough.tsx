"use client";

import { cn } from "@/lib/utils/cn";
import { AnimatedSection } from "./animated-section";
import { GradientText } from "../ui/gradient-text";

type WorkflowStep = {
  number: number;
  title: string;
  description: string;
  mock: React.ReactNode;
};

type WorkflowWalkthroughProps = {
  steps: WorkflowStep[];
};

export function WorkflowWalkthrough({ steps }: WorkflowWalkthroughProps) {
  return (
    <div className="relative space-y-20">
      {/* Vertical connecting line */}
      <div
        className="absolute bottom-0 left-6 top-0 hidden w-px border-l border-dashed border-border-default md:block"
        aria-hidden="true"
      />

      {steps.map((step, index) => {
        const isEven = index % 2 === 1;

        return (
          <AnimatedSection key={step.number} delay={index * 0.15}>
            <div
              className={cn(
                "grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16",
                isEven && "lg:[direction:rtl]",
              )}
            >
              {/* Text side */}
              <div className={cn(isEven && "lg:[direction:ltr]")}>
                <GradientText
                  as="span"
                  className="text-5xl font-extrabold md:text-7xl"
                >
                  {String(step.number).padStart(2, "0")}
                </GradientText>
                <h3 className="mt-4 text-2xl font-bold text-text-primary">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-md text-text-secondary">
                  {step.description}
                </p>
              </div>

              {/* Mock side */}
              <div className={cn(isEven && "lg:[direction:ltr]")}>
                {step.mock}
              </div>
            </div>
          </AnimatedSection>
        );
      })}
    </div>
  );
}
