import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface GuestAllowedRouteProps {
  children: ReactNode;
}

/**
 * GuestAllowedRoute allows both authenticated and unauthenticated users.
 * It does NOT redirect to /auth - guests can browse freely.
 * 
 * For pages like Home, Discover, and UserProfile that should be viewable
 * without requiring login first.
 */
export const GuestAllowedRoute = ({ children }: GuestAllowedRouteProps) => {
  const { isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Always render children - both guests and authenticated users can access
  return <>{children}</>;
};
