import { ReactNode, forwardRef } from "react";
import { BottomNav } from "./BottomNav";
import { DesktopNavRail } from "./DesktopNavRail";
import { OfflineBanner } from "@/components/OfflineBanner";
import { cn } from "@/lib/utils";

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
      <div ref={ref} className={cn("min-h-[100dvh] bg-background", !hideNav && "lg:pl-20")}>
        <OfflineBanner />

        {/* Main content */}
        <main className={hideNav ? "" : "pb-24 lg:pb-8"}>
          {children}
        </main>

        {/* Navigation: bottom bar on mobile, left rail on desktop */}
        {!hideNav && (
          <>
            <div className="lg:hidden">
              <BottomNav />
            </div>
            <DesktopNavRail />
          </>
        )}
      </div>
    );
  }
);

AppLayout.displayName = "AppLayout";
