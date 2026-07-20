import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Guarded back navigation. Falls back to a safe route when there is no
 * prior history entry (e.g. deep link, push notification, hard refresh).
 */
export const useGoBack = (fallback: string = "/") => {
  const navigate = useNavigate();
  return useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  }, [navigate, fallback]);
};
