"use client";

import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AnimatedSection } from "./animated-section";

type Spotlight = {
  title: string;
  description: string;
  bullets?: string[];
  mock: React.ReactNode;
};

type AlternatingSpotlightProps = {
  spotlights: Spotlight[];
};

export function AlternatingSpotlight({
  spotlights,
}: AlternatingSpotlightProps) {
  return (
    <div className="space-y-24">
      {spotlights.map((spotlight, index) => {
        const isOdd = index % 2 === 1;

        return (
          <AnimatedSection key={spotlight.title} delay={0.1}>
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
              {/* Text side */}
              <div className={cn(isOdd && "lg:order-2")}>
                <h2 className="text-2xl font-bold text-text-primary">
                  {spotlight.title}
                </h2>
                <p className="mt-3 text-text-secondary">
                  {spotlight.description}
                </p>
                {spotlight.bullets && spotlight.bullets.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {spotlight.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-2 text-sm text-text-secondary"
                      >
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                          aria-hidden="true"
                        />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Mock side */}
              <div className={cn(isOdd && "lg:order-1")}>{spotlight.mock}</div>
            </div>
          </AnimatedSection>
        );
      })}
    </div>
  );
}
