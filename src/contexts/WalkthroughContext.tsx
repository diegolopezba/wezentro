import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { generalSteps, WalkthroughStep } from "@/components/walkthrough/steps/generalSteps";
import { foodSteps } from "@/components/walkthrough/steps/foodSteps";
import { businessSteps } from "@/components/walkthrough/steps/businessSteps";

export type WalkthroughType = "general" | "food" | "business";

interface WalkthroughContextType {
  currentWalkthrough: WalkthroughType | null;
  currentStep: number;
  isActive: boolean;
  currentStepData: WalkthroughStep | null;
  totalSteps: number;
  nextStep: () => void;
  skipWalkthrough: () => void;
  completeWalkthrough: () => void;
  startWalkthrough: (type: WalkthroughType) => void;
  isStepActive: (stepId: string) => boolean;
}

const WalkthroughContext = createContext<WalkthroughContextType | null>(null);

const STORAGE_KEYS = {
  general: "zentro_walkthrough_complete",
  food: "zentro_food_walkthrough_complete",
  business: "zentro_business_walkthrough_complete",
  lastPlan: "zentro_last_seen_plan",
};

const getSteps = (type: WalkthroughType): WalkthroughStep[] => {
  switch (type) {
    case "general":
      return generalSteps;
    case "food":
      return foodSteps;
    case "business":
      return businessSteps;
    default:
      return [];
  }
};

export const WalkthroughProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [currentWalkthrough, setCurrentWalkthrough] = useState<WalkthroughType | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = currentWalkthrough ? getSteps(currentWalkthrough) : [];
  const isActive = currentWalkthrough !== null && currentStep < steps.length;
  const currentStepData = isActive ? steps[currentStep] : null;
  const totalSteps = steps.length;

  // Check if the current step matches the current page
  const isStepOnCurrentPage = useCallback(() => {
    if (!currentStepData) return false;
    const stepPage = currentStepData.page;
    const currentPath = location.pathname;

    // Handle event detail pages
    if (stepPage === "/event" && currentPath.startsWith("/event/")) {
      return true;
    }

    return currentPath === stepPage || currentPath.startsWith(stepPage + "/");
  }, [currentStepData, location.pathname]);

  const nextStep = useCallback(() => {
    if (!currentWalkthrough) return;

    const nextStepIndex = currentStep + 1;
    if (nextStepIndex >= steps.length) {
      // Complete walkthrough
      localStorage.setItem(STORAGE_KEYS[currentWalkthrough], "true");
      setCurrentWalkthrough(null);
      setCurrentStep(0);
    } else {
      setCurrentStep(nextStepIndex);
    }
  }, [currentWalkthrough, currentStep, steps.length]);

  const skipWalkthrough = useCallback(() => {
    if (currentWalkthrough) {
      localStorage.setItem(STORAGE_KEYS[currentWalkthrough], "true");
    }
    setCurrentWalkthrough(null);
    setCurrentStep(0);
  }, [currentWalkthrough]);

  const completeWalkthrough = useCallback(() => {
    if (currentWalkthrough) {
      localStorage.setItem(STORAGE_KEYS[currentWalkthrough], "true");
    }
    setCurrentWalkthrough(null);
    setCurrentStep(0);
  }, [currentWalkthrough]);

  const startWalkthrough = useCallback((type: WalkthroughType) => {
    const isComplete = localStorage.getItem(STORAGE_KEYS[type]) === "true";
    if (isComplete) return;

    setCurrentWalkthrough(type);
    setCurrentStep(0);
  }, []);

  const isStepActive = useCallback(
    (stepId: string) => {
      if (!isActive || !currentStepData) return false;
      return currentStepData.id === stepId && isStepOnCurrentPage();
    },
    [isActive, currentStepData, isStepOnCurrentPage]
  );

  return (
    <WalkthroughContext.Provider
      value={{
        currentWalkthrough,
        currentStep,
        isActive,
        currentStepData,
        totalSteps,
        nextStep,
        skipWalkthrough,
        completeWalkthrough,
        startWalkthrough,
        isStepActive,
      }}
    >
      {children}
    </WalkthroughContext.Provider>
  );
};

export const useWalkthrough = () => {
  const context = useContext(WalkthroughContext);
  if (!context) {
    throw new Error("useWalkthrough must be used within a WalkthroughProvider");
  }
  return context;
};

// Safe version that returns null if not in provider (for optional usage)
export const useWalkthroughSafe = () => {
  return useContext(WalkthroughContext);
};
