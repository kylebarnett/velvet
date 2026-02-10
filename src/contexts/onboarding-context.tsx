"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  getStepsForRole,
  type OnboardingStep,
  type UserRole,
} from "@/lib/onboarding/steps";
import { logger } from "@/lib/logger";

type OnboardingState = {
  currentStepIndex: number | null;
  isActive: boolean;
  isCompleted: boolean;
  showCompletionModal: boolean;
  role: UserRole;
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

/** Metadata keys differ by role so they don't collide. */
function metaKeys(role: UserRole) {
  if (role === "founder") {
    return { step: "founder_onboarding_step", complete: "founder_onboarding_complete" };
  }
  return { step: "onboarding_step", complete: "onboarding_complete" };
}

export function OnboardingProvider({
  children,
  initialStep,
  isOnboardingComplete,
  role = "investor",
}: {
  children: React.ReactNode;
  initialStep: number | null;
  isOnboardingComplete: boolean;
  role?: UserRole;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const steps = React.useMemo(() => getStepsForRole(role), [role]);
  const totalSteps = steps.length;

  const [state, setState] = React.useState<OnboardingState>({
    currentStepIndex: initialStep,
    isActive: initialStep !== null && !isOnboardingComplete,
    isCompleted: isOnboardingComplete,
    showCompletionModal: false,
    role,
  });

  const currentStep =
    state.currentStepIndex !== null
      ? (steps[state.currentStepIndex] ?? null)
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
            role,
          }),
        });
      } catch (err: unknown) {
        logger.error("Failed to persist onboarding step:", err);
      }
    },
    [role],
  );

  const advance = React.useCallback(() => {
    const currentIndex = state.currentStepIndex;
    if (currentIndex === null) return;

    const nextIndex = currentIndex + 1;

    // Tour completed
    if (nextIndex >= totalSteps) {
      persistStep(null, true);
      setState({
        currentStepIndex: null,
        isActive: false,
        isCompleted: true,
        showCompletionModal: true,
        role,
      });
      return;
    }

    const nextStep = steps[nextIndex];
    persistStep(nextIndex, false);

    setState((prev) => ({
      ...prev,
      currentStepIndex: nextIndex,
    }));

    // Navigate after state update
    if (nextStep && nextStep.page !== pathname) {
      setTimeout(() => {
        router.push(nextStep.page);
      }, 0);
    }
  }, [state.currentStepIndex, pathname, router, persistStep, totalSteps, steps, role]);

  const skip = React.useCallback(() => {
    persistStep(null, true);
    setState({
      currentStepIndex: null,
      isActive: false,
      isCompleted: true,
      showCompletionModal: false,
      role,
    });
  }, [persistStep, role]);

  const restart = React.useCallback(() => {
    const firstStep = steps[0];
    persistStep(0, false);
    setState({
      currentStepIndex: 0,
      isActive: true,
      isCompleted: false,
      showCompletionModal: false,
      role,
    });
    if (firstStep && pathname !== firstStep.page) {
      setTimeout(() => {
        router.push(firstStep.page);
      }, 0);
    }
  }, [pathname, router, persistStep, steps, role]);

  const startTour = React.useCallback(() => {
    const firstStep = steps[0];
    persistStep(0, false);
    setState({
      currentStepIndex: 0,
      isActive: true,
      isCompleted: false,
      showCompletionModal: false,
      role,
    });
    if (firstStep && pathname !== firstStep.page) {
      setTimeout(() => {
        router.push(firstStep.page);
      }, 0);
    }
  }, [pathname, router, persistStep, steps, role]);

  const closeCompletionModal = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      showCompletionModal: false,
    }));
  }, []);

  // Sync with current page - if user manually navigated ahead
  React.useEffect(() => {
    if (!state.isActive || state.currentStepIndex === null) return;

    const step = steps[state.currentStepIndex];
    if (!step) return;

    // If we're on the correct page, nothing to do
    if (step.page === pathname) return;

    // Find if there's a step for the current page that comes after current step
    const stepsForCurrentPage = steps
      .map((s, idx) => ({ ...s, index: idx }))
      .filter((s) => s.page === pathname && s.index > state.currentStepIndex!);

    // If user navigated ahead, skip to the appropriate step
    if (stepsForCurrentPage.length > 0) {
      const nextStep = stepsForCurrentPage[0];
      setState((prev) => ({
        ...prev,
        currentStepIndex: nextStep.index,
      }));
      persistStep(nextStep.index, false);
    }
  }, [pathname, state.isActive, state.currentStepIndex, persistStep, steps]);

  const value: OnboardingContextValue = {
    ...state,
    currentStep,
    totalSteps,
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
