import { ReactNode, forwardRef } from "react";
import { BottomNav } from "./BottomNav";

export interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export const AppLayout = forwardRef<HTMLDivElement, AppLayoutProps>(
  ({ children, hideNav = false }, ref) => {
    return (
      <div ref={ref} className="min-h-screen bg-background overflow-auto">
        {/* Main content */}
        <main className={hideNav ? "" : "pb-24"}>
          {children}
        </main>
        
        {/* Bottom navigation */}
        {!hideNav && <BottomNav />}
      </div>
    );
  }
);

AppLayout.displayName = "AppLayout";
