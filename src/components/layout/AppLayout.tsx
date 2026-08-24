import { ReactNode, forwardRef } from "react";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "@/components/OfflineBanner";

export interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export const AppLayout = forwardRef<HTMLDivElement, AppLayoutProps>(
  ({ children, hideNav = false }, ref) => {
    // The document is the single scroll owner — no nested scroll container
    // here, otherwise scroll listeners and virtualization bind to an element
    // that never scrolls.
    return (
      <div ref={ref} className="min-h-[100dvh] bg-background">
        <OfflineBanner />

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
