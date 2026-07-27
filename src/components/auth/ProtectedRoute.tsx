import { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
}

// Routes a user with an incomplete profile is still allowed to visit
// without being redirected to /edit-profile (avoids loops + lets them sign out).
const ALLOWED_INCOMPLETE_PATHS = ["/edit-profile", "/settings", "/auth", "/onboarding"];

export const ProtectedRoute = ({ children, requireProfile = false }: ProtectedRouteProps) => {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();
  const toastShownRef = useRef(false);

  const isProfileIncomplete = !!profile && (!profile.birth_date || !profile.gender);
  const onAllowedPath = ALLOWED_INCOMPLETE_PATHS.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (isProfileIncomplete && !onAllowedPath && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.info("Completa tu fecha de nacimiento y género para continuar.");
    }
  }, [isProfileIncomplete, onAllowedPath]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If profile is required and user doesn't have a proper username, redirect to onboarding
  if (requireProfile && profile && (profile.username ?? "").startsWith("user_")) {
    return <Navigate to="/onboarding" replace />;
  }


  // Force completion of required personal info (DOB + gender) for legacy accounts
  if (isProfileIncomplete && !onAllowedPath) {
    return <Navigate to="/edit-profile" replace />;
  }

  return <>{children}</>;
};
