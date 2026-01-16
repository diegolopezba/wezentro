import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const WALKTHROUGH_KEY = "zentro_walkthrough_completed";

export const useWalkthrough = () => {
  const { user, profile } = useAuth();
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for auth to be ready
    if (!user || !profile) {
      setIsReady(true);
      return;
    }

    // Check if walkthrough was already completed
    const completedUsers = JSON.parse(localStorage.getItem(WALKTHROUGH_KEY) || "[]");
    const hasCompleted = completedUsers.includes(user.id);

    // Show walkthrough if user hasn't completed it and has a proper profile
    // (not still in onboarding with a temp username)
    const hasProperProfile = profile.username && !profile.username.startsWith("user_");
    
    if (!hasCompleted && hasProperProfile) {
      // Small delay to let the main UI render first
      const timer = setTimeout(() => {
        setShowWalkthrough(true);
      }, 500);
      return () => clearTimeout(timer);
    }

    setIsReady(true);
  }, [user, profile]);

  const completeWalkthrough = () => {
    if (user) {
      const completedUsers = JSON.parse(localStorage.getItem(WALKTHROUGH_KEY) || "[]");
      if (!completedUsers.includes(user.id)) {
        completedUsers.push(user.id);
        localStorage.setItem(WALKTHROUGH_KEY, JSON.stringify(completedUsers));
      }
    }
    setShowWalkthrough(false);
    setIsReady(true);
  };

  const resetWalkthrough = () => {
    if (user) {
      const completedUsers = JSON.parse(localStorage.getItem(WALKTHROUGH_KEY) || "[]");
      const filtered = completedUsers.filter((id: string) => id !== user.id);
      localStorage.setItem(WALKTHROUGH_KEY, JSON.stringify(filtered));
    }
  };

  return {
    showWalkthrough,
    isReady,
    completeWalkthrough,
    resetWalkthrough,
  };
};
