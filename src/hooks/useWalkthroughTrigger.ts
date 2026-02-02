import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useWalkthroughSafe, WalkthroughType } from "@/contexts/WalkthroughContext";
import { useUserSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEYS = {
  general: "zentro_walkthrough_complete",
  food: "zentro_food_walkthrough_complete",
  business: "zentro_business_walkthrough_complete",
  lastPlan: "zentro_last_seen_plan",
  newUser: "zentro_is_new_user",
};

/**
 * Hook to trigger walkthroughs based on user state and subscription changes
 */
export const useWalkthroughTrigger = () => {
  const walkthrough = useWalkthroughSafe();
  const { user, profile } = useAuth();
  const { data: subscription } = useUserSubscription();
  const location = useLocation();
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!walkthrough || !user || !profile) return;
    if (hasTriggeredRef.current) return;

    const currentPlan = subscription?.plan_type || "free";
    const lastSeenPlan = localStorage.getItem(STORAGE_KEYS.lastPlan);
    const isNewUser = localStorage.getItem(STORAGE_KEYS.newUser) === "true";
    const generalComplete = localStorage.getItem(STORAGE_KEYS.general) === "true";

    // Trigger general walkthrough for new users on homepage
    if (isNewUser && !generalComplete && location.pathname === "/") {
      // Small delay for smooth experience
      const timer = setTimeout(() => {
        walkthrough.startWalkthrough("general");
        localStorage.removeItem(STORAGE_KEYS.newUser);
        hasTriggeredRef.current = true;
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Detect subscription upgrades
    if (lastSeenPlan && lastSeenPlan !== currentPlan) {
      const foodComplete = localStorage.getItem(STORAGE_KEYS.food) === "true";
      const businessComplete = localStorage.getItem(STORAGE_KEYS.business) === "true";

      // Upgraded to food_premium
      if (currentPlan === "food_premium" && !foodComplete && location.pathname === "/profile") {
        const timer = setTimeout(() => {
          walkthrough.startWalkthrough("food");
          hasTriggeredRef.current = true;
        }, 500);
        localStorage.setItem(STORAGE_KEYS.lastPlan, currentPlan);
        return () => clearTimeout(timer);
      }

      // Upgraded to business_premium
      if (currentPlan === "business_premium" && !businessComplete && location.pathname === "/dashboard") {
        const timer = setTimeout(() => {
          walkthrough.startWalkthrough("business");
          hasTriggeredRef.current = true;
        }, 500);
        localStorage.setItem(STORAGE_KEYS.lastPlan, currentPlan);
        return () => clearTimeout(timer);
      }
    }

    // Update last seen plan
    localStorage.setItem(STORAGE_KEYS.lastPlan, currentPlan);
  }, [walkthrough, user, profile, subscription, location.pathname]);
};

/**
 * Mark user as new (call this after onboarding completion)
 */
export const markUserAsNew = () => {
  localStorage.setItem(STORAGE_KEYS.newUser, "true");
};

/**
 * Check if a specific walkthrough is complete
 */
export const isWalkthroughComplete = (type: WalkthroughType): boolean => {
  return localStorage.getItem(STORAGE_KEYS[type]) === "true";
};
