"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  ONBOARDING_STEPS,
  TOTAL_STEPS,
  getStepByIndex,
  type OnboardingStep,
} from "@/lib/onboarding/steps";

type OnboardingState = {
  currentStepIndex: number | null;
  isActive: boolean;
  isCompleted: boolean;
  showCompletionModal: boolean;
};

type OnboardingContextValue = OnboardingState & {
  currentStep: OnboardingStep | null;
  totalSteps: number;
  advance: () => void;
  skip: () => void;
  restart: () => void;
  startTour: () => void;
  closeCompletionModal: () => void;
};

const OnboardingContext = React.createContext<OnboardingContextValue | null>(
  null,
);

export function useOnboarding() {
  const context = React.useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}

export function OnboardingProvider({
  children,
  initialStep,
  isOnboardingComplete,
}: {
  children: React.ReactNode;
  initialStep: number | null;
  isOnboardingComplete: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [state, setState] = React.useState<OnboardingState>({
    currentStepIndex: initialStep,
    isActive: initialStep !== null && !isOnboardingComplete,
    isCompleted: isOnboardingComplete,
    showCompletionModal: false,
  });

  const currentStep =
    state.currentStepIndex !== null
      ? (getStepByIndex(state.currentStepIndex) ?? null)
      : null;

  // Persist step to backend
  const persistStep = React.useCallback(
    async (stepIndex: number | null, completed: boolean) => {
      try {
        await fetch("/api/user/onboarding", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: stepIndex,
            completed,
          }),
        });
      } catch (err) {
        console.error("Failed to persist onboarding step:", err);
      }
    },
    [],
  );

  const advance = React.useCallback(() => {
    const currentIndex = state.currentStepIndex;
    if (currentIndex === null) return;

    const nextIndex = currentIndex + 1;

    // Tour completed
    if (nextIndex >= TOTAL_STEPS) {
      persistStep(null, true);
      setState({
        currentStepIndex: null,
        isActive: false,
        isCompleted: true,
        showCompletionModal: true,
      });
      return;
    }

    const nextStep = ONBOARDING_STEPS[nextIndex];
    persistStep(nextIndex, false);

    setState((prev) => ({
      ...prev,
      currentStepIndex: nextIndex,
    }));

    // Navigate after state update
    if (nextStep && nextStep.page !== pathname) {
      // Use setTimeout to ensure navigation happens after render
      setTimeout(() => {
        router.push(nextStep.page);
      }, 0);
    }
  }, [state.currentStepIndex, pathname, router, persistStep]);

  const skip = React.useCallback(() => {
    persistStep(null, true);
    setState({
      currentStepIndex: null,
      isActive: false,
      isCompleted: true,
      showCompletionModal: false,
    });
  }, [persistStep]);

  const restart = React.useCallback(() => {
    const firstStep = ONBOARDING_STEPS[0];
    persistStep(0, false);
    setState({
      currentStepIndex: 0,
      isActive: true,
      isCompleted: false,
      showCompletionModal: false,
    });
    if (firstStep && pathname !== firstStep.page) {
      setTimeout(() => {
        router.push(firstStep.page);
      }, 0);
    }
  }, [pathname, router, persistStep]);

  const startTour = React.useCallback(() => {
    const firstStep = ONBOARDING_STEPS[0];
    persistStep(0, false);
    setState({
      currentStepIndex: 0,
      isActive: true,
      isCompleted: false,
      showCompletionModal: false,
    });
    if (firstStep && pathname !== firstStep.page) {
      setTimeout(() => {
        router.push(firstStep.page);
      }, 0);
    }
  }, [pathname, router, persistStep]);

  const closeCompletionModal = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      showCompletionModal: false,
    }));
  }, []);

  // Sync with current page - if user manually navigated ahead
  React.useEffect(() => {
    if (!state.isActive || state.currentStepIndex === null) return;

    const step = ONBOARDING_STEPS[state.currentStepIndex];
    if (!step) return;

    // If we're on the correct page, nothing to do
    if (step.page === pathname) return;

    // Find if there's a step for the current page that comes after current step
    const stepsForCurrentPage = ONBOARDING_STEPS.map((s, idx) => ({
      ...s,
      index: idx,
    })).filter((s) => s.page === pathname && s.index > state.currentStepIndex!);

    // If user navigated ahead, skip to the appropriate step
    if (stepsForCurrentPage.length > 0) {
      const nextStep = stepsForCurrentPage[0];
      setState((prev) => ({
        ...prev,
        currentStepIndex: nextStep.index,
      }));
      persistStep(nextStep.index, false);
    }
  }, [pathname, state.isActive, state.currentStepIndex, persistStep]);

  const value: OnboardingContextValue = {
    ...state,
    currentStep,
    totalSteps: TOTAL_STEPS,
    advance,
    skip,
    restart,
    startTour,
    closeCompletionModal,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
